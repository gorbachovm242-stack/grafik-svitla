// Налаштування, кеш графіка й тривог і завантаження з мережі. Сховище спільне для застосунку, віджета й кнопок у віджеті.
import type { Channel, Config, Data, Fact, Now, Sched, Region } from "./logic"
import {
  SETTINGS, SVITLOBOT, addressesOf, channelId, fetchSchedule, findChannel, groupsFor, mergeFact, parseChannels, parseStatusPosts,
  postsFact, queueFact, queueId,
} from "./logic"
import type { AlertFeed, AlertSettings, AlertStatus, ChannelPost, Location, PageChoice } from "./alerts"
import {
  ALERTS, alertStatus, busy, channelUrl, cleanPlace, defaultOblasts, parseAlertFeed, parseChannelPosts, parseChannelTitle,
  parseLocations, withPosts,
} from "./alerts"

const CONFIG_KEY = "config"
const CACHE_KEY = "cache"
const FACT_KEY = "fact"
const NONE_KEY = "factNone"
const OFFLINE_KEY = "offline"
const ALERTS_KEY = "alerts" // налаштування модуля тривоги
const ALERT_FEED_KEY = "alertFeed"
const ALERT_CHANNEL_KEY = "alertChannel"
const LOCATIONS_KEY = "alertLocations"
const PAGE_KEY = "page"

// Яку сторінку показує віджет (світло чи тривога): окремо для кожного розміру й поля Parameter.
export function readPage(key: string): PageChoice | null {
  const all = Storage.get<Record<string, PageChoice>>(PAGE_KEY)
  return all && all[key] ? all[key] : null
}

export function writePage(key: string, page: string, nowMs: number = Date.now()): void {
  const all = Storage.get<Record<string, PageChoice>>(PAGE_KEY) || {}
  all[key] = { page, at: nowMs }
  Storage.set(PAGE_KEY, all)
}

export function readConfig(): Config | null {
  const cfg = Storage.get<Config>(CONFIG_KEY)
  return cfg && cfg.region && cfg.group ? cfg : null
}

export function writeConfig(cfg: Config): void {
  Storage.set(CONFIG_KEY, cfg)
}

// Друга адреса зберігає графік і датчик поруч із першою: «cache2», «fact2». Ключі першої ті самі, що й до неї.
function slotKey(base: string, slot: number | undefined): string {
  return slot ? `${base}${slot + 1}` : base
}

export function readCache(slot = 0): Sched | null {
  return Storage.get<Sched>(slotKey(CACHE_KEY, slot))
}

export function clearCache(slot = 0): void {
  Storage.remove(slotKey(CACHE_KEY, slot))
}

// ---------- Збережене: що малювати без мережі ----------

function cachedSched(cfg: Config): Sched | null {
  const cached = readCache(cfg.slot)
  return cached && cached.key === `${cfg.region}|${cfg.group}` ? cached : null
}

function factIdOf(cfg: Config): string {
  const own = cfg.svitlobot ? channelId(cfg.svitlobot) : ""
  return own || queueId(cfg.region, cfg.group)
}

// Збережений графік своєї черги: сторінка налаштувань показує його одразу, ще до мережі.
export function cachedData(cfg: Config | null): Data {
  return { sched: cfg ? cachedSched(cfg) : null, status: "ok" }
}

// Збережений стан датчика; інший канал чи інша черга: null.
export function cachedFact(cfg: Config | null): Fact | null {
  if (!cfg) return null
  const saved = Storage.get<Fact>(slotKey(FACT_KEY, cfg.slot))
  return saved && saved.channel.toLowerCase() === factIdOf(cfg).toLowerCase() ? saved : null
}

// ---------- Мережа ----------

// Один запуск (віджет, кнопка «↻», сторінка) має спільний крайній строк для всіх своїх запитів.
// Без інтернету iOS буває не відповідає на запит довше за його тайм-аут, а віджет тим часом зупиняють,
// і він лишається старим. Тому чекаємо власними таймерами й самі скасовуємо запит.
// memo: дві адреси в одній області тягнуть ту саму сторінку обленерго й той самий список СвітлоБота лише раз.
export type Net = { expired: boolean; requestMs: number; waiters: Set<() => void>; stop: () => void; memo: Map<string, Promise<string>> }

export function startNet(budgetMs: number, requestMs: number = SETTINGS.timeoutSeconds * 1000): Net {
  const net: Net = { expired: false, requestMs, waiters: new Set(), stop: () => {}, memo: new Map() }
  const timer = setTimeout(() => {
    net.expired = true
    net.waiters.forEach((wake) => wake())
  }, budgetMs)
  net.stop = () => clearTimeout(timer)
  return net
}

// Один запит із тайм-аутом. Помилка HTTP теж помилка, а не порожня сторінка.
// В одному запуску та сама адреса вантажиться один раз, навіть для двох адрес користувача.
export function loadText(url: string, net?: Net): Promise<string> {
  if (!net) return loadOnce(url)
  const same = net.memo.get(url)
  if (same) return same
  const loading = loadOnce(url, net)
  net.memo.set(url, loading)
  return loading
}

async function loadOnce(url: string, net?: Net): Promise<string> {
  if (net && net.expired) throw new Error("Час на мережу вичерпано")
  const ms = net ? net.requestMs : SETTINGS.timeoutSeconds * 1000
  const controller = typeof AbortController === "function" ? new AbortController() : null
  let reject: (reason: Error) => void = () => {}
  const stopped = new Promise<never>((_, no) => {
    reject = no
  })
  stopped.catch(() => {}) // відмову забирає Promise.race нижче
  const cancel = (why: string) => {
    reject(new Error(why))
    try {
      if (controller) controller.abort()
    } catch (e) {
      // скасування не вдалося: відмови вистачить
    }
  }
  const timer = setTimeout(() => cancel("Тайм-аут"), ms)
  const expire = () => cancel("Час на мережу вичерпано")
  if (net) net.waiters.add(expire)
  try {
    const response = await Promise.race([
      fetch(url, {
        timeout: Math.ceil(ms / 1000),
        signal: controller ? controller.signal : undefined,
        headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148" },
      }),
      stopped,
    ])
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await Promise.race([response.text(), stopped])
  } finally {
    clearTimeout(timer)
    if (net) net.waiters.delete(expire)
  }
}

// Остання спроба не дістала жодного джерела графіка, тобто інтернету, найпевніше, немає. Кілька хвилин віджет
// не йде в мережу, а одразу малює збережене: так кнопка «↻» і віджет після неї не чекають двічі.
function recentlyOffline(): boolean {
  const saved = Storage.get<{ at: number }>(OFFLINE_KEY)
  const age = saved ? Date.now() - saved.at : -1
  return age >= 0 && age < SETTINGS.offlineRetryMinutes * 60000
}

function markOffline(): void {
  Storage.set(OFFLINE_KEY, { at: Date.now() })
}

// Перші 10 хвилин після завантаження мережу не чіпаємо. Не вдалося оновити: працюємо зі збереженим.
// Кнопка «↻» і сторінка (force) пробують мережу завжди.
export async function getSchedule(cfg: Config, now: Now, force: boolean, net?: Net): Promise<Data> {
  const valid = cachedSched(cfg)
  const ageMinutes = valid && valid.fetchedAt ? (Date.now() - valid.fetchedAt) / 60000 : Infinity
  if (!force && ageMinutes < SETTINGS.cacheMinutes) return { sched: valid, status: "ok" }
  if (!force && recentlyOffline()) return { sched: valid, status: "fail" }
  const result = await fetchSchedule(cfg, now.ymd, (url) => loadText(url, net), Infinity, (message) => console.log(message))
  if (result.status === "fail") {
    markOffline()
    return { sched: valid, status: "fail" }
  }
  Storage.remove(OFFLINE_KEY)
  if (result.status === "ok") {
    const sched: Sched = Object.assign(result.sched, { key: `${cfg.region}|${cfg.group}`, fetchedAt: Date.now() })
    Storage.set(slotKey(CACHE_KEY, cfg.slot), sched)
    return { sched, status: "ok" }
  }
  return { sched: valid, status: result.status }
}

export type Fresh = { data: Data; fact: Fact | null }

const EMPTY: Fresh = { data: { sched: null, status: "ok" }, fact: null }

// Графік і датчик кожної адреси паралельно, зі спільним крайнім строком: не довше за budgetMs. Навіть якщо щось
// не відпустить після скасування, за budgetMs із запасом буде збережене, і віджет намалюється.
async function freshList(list: Config[], now: Now, force: boolean, budgetMs: number, requestMs: number): Promise<Fresh[]> {
  if (!list.length) return [EMPTY]
  const net = startNet(budgetMs, requestMs)
  let timer: number | undefined
  const late = new Promise<Fresh[]>((resolve) => {
    timer = setTimeout(() => {
      markOffline()
      resolve(list.map((cfg) => ({ data: { sched: cachedSched(cfg), status: "fail" as const }, fact: cachedFact(cfg) })))
    }, budgetMs + 1500)
  })
  try {
    const all = Promise.all(
      list.map((cfg) => Promise.all([getSchedule(cfg, now, force, net), getFact(cfg, force, net)]).then(([data, fact]) => ({ data, fact }))),
    )
    return await Promise.race([all, late])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
    net.stop()
  }
}

// Одна адреса (cfg уже з тією чергою, яку треба).
export async function freshData(cfg: Config | null, now: Now, force: boolean, budgetMs: number, requestMs: number): Promise<Fresh> {
  return cfg ? (await freshList([cfg], now, force, budgetMs, requestMs))[0] : EMPTY
}

// Усі адреси з налаштувань: [перша, друга]. Віджет і кнопка «↻» оновлюють обидві, бо сповіщення про обидві.
export function freshAll(base: Config | null, now: Now, force: boolean, budgetMs: number, requestMs: number): Promise<Fresh[]> {
  return freshList(addressesOf(base), now, force, budgetMs, requestMs)
}

// Дані для віджета по всіх адресах. Щойно торкнулися значка в стовпчику (quick): лише збережене,
// без мережі, щоб сторінка перемикалася одразу. Свіже підтягне планове оновлення.
export function widgetDataAll(base: Config | null, now: Now, quick: boolean): Promise<Fresh[]> {
  const list = addressesOf(base)
  if (quick) return Promise.resolve(list.length ? list.map((cfg) => ({ data: cachedData(cfg), fact: cachedFact(cfg) })) : [EMPTY])
  return freshAll(base, now, false, SETTINGS.widgetBudgetMs, SETTINGS.widgetRequestMs)
}

export async function widgetData(cfg: Config | null, now: Now, quick: boolean): Promise<Fresh> {
  return (await widgetDataAll(cfg, now, quick))[0]
}

export function loadGroups(region: Region): Promise<string[]> {
  return groupsFor(region, (url) => loadText(url))
}

// Усі канали СвітлоБота: для пошуку датчика в налаштуваннях.
export async function loadChannels(): Promise<Channel[]> {
  return parseChannels(await loadText(SVITLOBOT.list))
}

// Фактичний стан: обраний датчик, а без нього всі датчики СвітлоБота з черги користувача.
// Перші 4 хвилини після перевірки мережу не чіпаємо; без мережі віддаємо збережене
// (рядок у віджеті тоді покаже, коли перевіряли востаннє). У черзі немає датчиків: null.
export async function getFact(cfg: Config | null, force: boolean, net?: Net): Promise<Fact | null> {
  if (!cfg) return null
  const own = cfg.svitlobot ? channelId(cfg.svitlobot) : ""
  const id = factIdOf(cfg)
  const same = cachedFact(cfg)
  const nowMs = Date.now()
  if (!force && same && nowMs - same.checkedAt < SETTINGS.factCacheMinutes * 60000) return same
  if (!force && recentlyOffline()) return same
  if (own) return ownFact(cfg, own, same, nowMs, net)
  // У черзі датчиків не було: перепитуємо раз на годину, а не за кожним оновленням віджета.
  const none = Storage.get<{ id: string; checkedAt: number }>(slotKey(NONE_KEY, cfg.slot))
  if (!force && !same && none && none.id === id && nowMs - none.checkedAt < 60 * 60000) return null
  try {
    const queue = queueFact(same, parseChannels(await loadText(SVITLOBOT.list, net)), cfg.region, cfg.group, nowMs)
    if (queue) {
      Storage.set(slotKey(FACT_KEY, cfg.slot), queue)
      Storage.remove(slotKey(NONE_KEY, cfg.slot))
    } else {
      Storage.remove(slotKey(FACT_KEY, cfg.slot))
      Storage.set(slotKey(NONE_KEY, cfg.slot), { id, checkedAt: nowMs })
    }
    return queue
  } catch (e) {
    return same
  }
}

// ---------- Повітряна тривога ----------

export function readAlerts(): AlertSettings {
  return Storage.get<AlertSettings>(ALERTS_KEY) || {}
}

export function writeAlerts(settings: AlertSettings): void {
  Storage.set(ALERTS_KEY, settings)
}

type SavedFeed = { at: number; feed: AlertFeed }
type SavedChannel = { id: string; at: number; posts: ChannelPost[]; title: string | null }

function savedFeed(): SavedFeed | null {
  const saved = Storage.get<SavedFeed>(ALERT_FEED_KEY)
  return saved && saved.feed && Array.isArray(saved.feed.alerts) ? saved : null
}

function savedChannel(id: string): SavedChannel | null {
  const saved = Storage.get<SavedChannel>(ALERT_CHANNEL_KEY)
  return saved && saved.id === id && Array.isArray(saved.posts) ? saved : null
}

// Усі активні тривоги України (близько 1–2 КБ). Повторний запит протягом ALERTS.cacheSeconds не йде в мережу.
export async function getAlertFeed(force: boolean, net?: Net): Promise<AlertFeed | null> {
  const saved = savedFeed()
  const nowMs = Date.now()
  if (!force && saved && nowMs - saved.at >= 0 && nowMs - saved.at < ALERTS.cacheSeconds * 1000) return saved.feed
  if (!force && recentlyOffline()) return saved ? saved.feed : null
  try {
    const feed = parseAlertFeed(await loadText(ALERTS.feed, net))
    if (feed.ok) {
      Storage.set(ALERT_FEED_KEY, { at: nowMs, feed })
      return feed
    }
  } catch (e) {
    // нижче збережене
  }
  return saved ? saved.feed : null
}

// Публічний канал моніторингу: дописи й назва. maxAgeSeconds: коли щось відбувається, частіше.
export async function getChannelPosts(id: string, maxAgeSeconds: number, force: boolean, net?: Net): Promise<SavedChannel | null> {
  const saved = savedChannel(id)
  const nowMs = Date.now()
  if (!force && saved && nowMs - saved.at >= 0 && nowMs - saved.at < maxAgeSeconds * 1000) return saved
  if (!force && recentlyOffline()) return saved
  try {
    const html = await loadText(channelUrl(id), net)
    const fresh: SavedChannel = { id, at: nowMs, posts: parseChannelPosts(html), title: parseChannelTitle(html) || (saved ? saved.title : null) }
    Storage.set(ALERT_CHANNEL_KEY, fresh)
    return fresh
  } catch (e) {
    return saved
  }
}

// Канал для налаштувань: чи він є й публічний. Закритий канал чи помилка в назві: null.
export async function checkChannel(id: string): Promise<SavedChannel | null> {
  const html = await loadText(channelUrl(id))
  const title = parseChannelTitle(html)
  if (!title || !/tgme_channel_info|tgme_widget_message/.test(html)) return null
  const fresh: SavedChannel = { id, at: Date.now(), posts: parseChannelPosts(html), title }
  Storage.set(ALERT_CHANNEL_KEY, fresh)
  return fresh
}

export type AlertBundle = { status: AlertStatus; posts: ChannelPost[] }

// Стан тривоги зі збереженого, без мережі.
export function cachedAlerts(settings: AlertSettings, nowMs: number = Date.now()): AlertBundle | null {
  if (!settings.enabled) return null
  const feed = savedFeed()
  const status = alertStatus(settings.place, feed ? feed.feed : null, nowMs)
  const channel = settings.channel ? savedChannel(settings.channel) : null
  const posts = channel ? channel.posts : []
  return { status: withPosts(status, posts, channel ? channel.title : null, nowMs), posts }
}

async function loadAlerts(settings: AlertSettings, force: boolean, net: Net): Promise<AlertBundle> {
  const before = cachedAlerts(settings) as AlertBundle
  const feed = await getAlertFeed(force, net)
  const nowMs = Date.now()
  const status = alertStatus(settings.place, feed, nowMs)
  if (!settings.channel || status.kind === "setup") return { status, posts: [] }
  // Канал частіше, коли щось відбувається (за щойно отриманим станом і збереженими дописами).
  const maxAge = busy(status, before.posts, nowMs) ? ALERTS.channelBusySeconds : ALERTS.channelQuietSeconds
  const channel = await getChannelPosts(settings.channel, maxAge, force, net)
  const posts = channel ? channel.posts : []
  return { status: withPosts(status, posts, channel ? channel.title : null, Date.now()), posts }
}

// Тривоги з мережі не довше за budgetMs (як і графік): без інтернету — збережене. Модуль вимкнено: null.
export async function freshAlerts(settings: AlertSettings, force: boolean, budgetMs: number, requestMs: number): Promise<AlertBundle | null> {
  if (!settings.enabled) return null
  if (!cleanPlace(settings.place)) return cachedAlerts(settings)
  const net = startNet(budgetMs, requestMs)
  let timer: number | undefined
  const late = new Promise<AlertBundle | null>((resolve) => {
    timer = setTimeout(() => resolve(cachedAlerts(settings)), budgetMs + 1500)
  })
  try {
    return await Promise.race([loadAlerts(settings, force, net), late])
  } catch (e) {
    return cachedAlerts(settings)
  } finally {
    if (timer !== undefined) clearTimeout(timer)
    net.stop()
  }
}

// Області → райони → громади для вибору місця. Список оновлюємо раз на тиждень; без мережі — збережений,
// а якщо його ще немає, то лише області.
export async function loadLocations(force = false): Promise<Location[]> {
  const saved = Storage.get<{ at: number; list: Location[] }>(LOCATIONS_KEY)
  const valid = saved && Array.isArray(saved.list) && saved.list.length ? saved : null
  if (!force && valid && Date.now() - valid.at < ALERTS.locationsDays * 86400000) return valid.list
  try {
    const list = parseLocations(await loadText(ALERTS.locations))
    if (list.length) {
      Storage.set(LOCATIONS_KEY, { at: Date.now(), list })
      return list
    }
  } catch (e) {
    // нижче збережене
  }
  return valid ? valid.list : defaultOblasts()
}

// Власний канал: спершу його дописи в Telegram (працює одразу, без модерації СвітлоБота й з точною тривалістю),
// а якщо дописів про світло немає чи сторінка недоступна, то список СвітлоБота.
async function ownFact(cfg: Config, id: string, same: Fact | null, nowMs: number, net?: Net): Promise<Fact | null> {
  try {
    const fromPosts = postsFact(parseStatusPosts(await loadText(SVITLOBOT.posts(id), net)), id, cfg.svitlobotName || id, nowMs)
    if (fromPosts) {
      Storage.set(slotKey(FACT_KEY, cfg.slot), fromPosts)
      return fromPosts
    }
  } catch (e) {
    // далі список СвітлоБота
  }
  try {
    const fact = mergeFact(same, findChannel(parseChannels(await loadText(SVITLOBOT.list, net)), id), id, nowMs)
    Storage.set(slotKey(FACT_KEY, cfg.slot), fact)
    return fact
  } catch (e) {
    return same
  }
}
