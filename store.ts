// Налаштування, кеш графіка й завантаження з мережі. Сховище спільне для застосунку, віджета й кнопки «↻».
import type { Channel, Config, Data, DayChoice, Fact, Now, Sched, Region } from "./logic"
import {
  SETTINGS, SVITLOBOT, addressesOf, channelId, fetchSchedule, findChannel, groupsFor, mergeFact, parseChannels, parseStatusPosts,
  postsFact, queueFact, queueId,
} from "./logic"

const CONFIG_KEY = "config"
const CACHE_KEY = "cache"
const FACT_KEY = "fact"
const NONE_KEY = "factNone"
const OFFLINE_KEY = "offline"
const DAY_KEY = "day"

// Що показують малий і середній віджет: сьогодні чи завтра (кнопки «Завтра ›» і «‹ Сьогодні»).
export function readDay(): DayChoice | null {
  return Storage.get<DayChoice>(DAY_KEY)
}

export function writeDay(tomorrow: boolean, now: Now, nowMs: number = Date.now()): void {
  Storage.set(DAY_KEY, { tomorrow, at: nowMs, ymd: now.ymd })
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

// Дані для віджета по всіх адресах. Щойно натиснули «Завтра ›» чи «‹ Сьогодні» (quick): лише збережене,
// без мережі, щоб день перемикався одразу. Свіже підтягне планове оновлення.
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
