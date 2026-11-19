// Повітряна тривога: другий модуль віджета (як у «Маяку» для Android). Дані alerts.in.ua приходять через наш
// посередник на Cloudflare Workers (worker/maiak-alerts.mjs), бо alerts.in.ua не дозволяє вшивати свій токен у скрипт.
// Телефон бере всі активні тривоги й сам обирає свої: обране місце нікуди не надсилається.
// Уся логіка тут, без звертань до Scripting, щоб перевіряти на ПК (tools/scripting-alerts.test.mjs).
import { hm, kyivParts } from "./logic"

export const ALERTS = {
  feed: "https://maiak-alerts.maiak.workers.dev/v1/alerts",
  locations: "https://maiak-alerts.maiak.workers.dev/v1/locations",
  source: "https://alerts.in.ua",
  officialApp: "https://apps.apple.com/ua/app/id1611955391", // офіційний застосунок «Повітряна тривога»
  cacheSeconds: 50, // тривоги не перепитувати частіше
  staleMinutes: 30, // старіші дані віджет позначає часом перевірки
  oldMinutes: 180, // такі старі дані вже не показуємо як стан
  timerHours: 24, // довші тривоги (окуповані території, роками) без живого таймера
  locationsDays: 7, // список місць оновлюємо раз на тиждень
  postFreshMinutes: 60, // старіші дописи каналу моніторингу не показуємо
  busyPostMinutes: 20, // свіжий допис каналу: щось відбувається
  channelBusySeconds: 45, // канал не перепитувати частіше, коли щось відбувається
  channelQuietSeconds: 150, // у тиші канал раз на 2,5 хвилини
  // Як часто просити iOS оновити віджет із тривогами. iOS сама вирішує, коли саме (має денний ліміт),
  // тож це найкоротший проміжок, а не обіцянка.
  quietRefreshMinutes: 15,
  busyRefreshMinutes: 5,
}

// ---------- Типи ----------

export type Alert = {
  uid: string
  title: string
  kind: string // oblast, raion, hromada, city
  parent: string // для міста: UID громади, до якої воно належить
  oblast: string // UID області (визначає посередник за таблицею місць)
  raion: string // назва району
  type: string
  level: string // red: повітряна тривога, yellow: попередня загроза
  since: number // мс; 0, якщо невідомо
  threats: string[]
}

export type AlertFeed = {
  ok: boolean
  stale: boolean // посередник не дістав alerts.in.ua і віддав збережене
  fetchedAt: number // коли alerts.in.ua востаннє підтвердив цей стан
  alerts: Alert[]
}

// Що обрав користувач: область (або Київ, Севастополь), за бажанням район і громада. UID з alerts.in.ua.
export type Place = {
  oblast: string
  oblastTitle?: string
  raion?: string
  raionTitle?: string
  hromada?: string
  hromadaTitle?: string
}

// Місце в списку: область → райони → громади.
export type Location = { uid: string; title: string; children: Location[] }

// Налаштування модуля: чи показувати тривогу у віджеті, місце й канал моніторингу.
export type AlertSettings = {
  enabled?: boolean
  place?: Place | null
  channel?: string // назва публічного каналу Telegram
  channelTitle?: string
}

export type AlertKind = "alert" | "threat" | "nearby" | "quiet" | "nodata" | "setup"

export type AlertStatus = {
  kind: AlertKind
  title: string
  sub: string
  subShort: string | null // коротші подробиці для вузького віджета: «з 10:40» без загроз
  place: string // обране місце, коротко
  where: string // де оголошено тривогу: «уся область», район чи громада
  others: string[] // інші тривоги в області, свій район першим
  since: number // початок тривоги
  timer: boolean // живий таймер від початку: лише для тривог, коротших за ALERTS.timerHours
  stale: boolean
  checked: string | null // коли alerts.in.ua востаннє підтвердив стан: «10:42» або «13.11, 10:42»
  posts: string[] // свіжі дописи каналу моніторингу: «16:45 · 2 шахеди на місто»
  channel: string | null // назва каналу моніторингу
}

export type ChannelPost = { at: number; text: string }

// Області й міста з окремими тривогами, поки повний список місць не завантажено.
export const OBLASTS: [string, string][] = [
  ["31", "м. Київ"], ["4", "Вінницька область"], ["8", "Волинська область"], ["9", "Дніпропетровська область"],
  ["28", "Донецька область"], ["10", "Житомирська область"], ["11", "Закарпатська область"], ["12", "Запорізька область"],
  ["13", "Івано-Франківська область"], ["14", "Київська область"], ["15", "Кіровоградська область"], ["16", "Луганська область"],
  ["27", "Львівська область"], ["17", "Миколаївська область"], ["18", "Одеська область"], ["19", "Полтавська область"],
  ["5", "Рівненська область"], ["20", "Сумська область"], ["21", "Тернопільська область"], ["22", "Харківська область"],
  ["23", "Херсонська область"], ["3", "Хмельницька область"], ["24", "Черкаська область"], ["26", "Чернівецька область"],
  ["25", "Чернігівська область"], ["29", "Автономна Республіка Крим"], ["30", "м. Севастополь"],
]

export function defaultOblasts(): Location[] {
  return OBLASTS.map(([uid, title]) => ({ uid, title, children: [] }))
}

// Область графіка світла → область тривог: щоб перший вибір уже стояв на своїй області.
const REGION_OBLAST: Record<string, string> = {
  zaporizhzhia: "12", kyiv: "31", "dnipro-dnem": "9", "dnipro-cek": "9", dnipropetrovsk: "9", vinnytsia: "4", volyn: "8",
  donetsk: "28", zhytomyr: "10", zakarpattia: "11", "ivano-frankivsk": "13", "kyiv-oblast": "14", kirovohrad: "15", lviv: "27",
  mykolaiv: "17", odesa: "18", poltava: "19", rivne: "5", sumy: "20", ternopil: "21", kharkiv: "22", khmelnytskyi: "3",
  cherkasy: "24", chernivtsi: "26", chernihiv: "25",
}

export function oblastForRegion(region: string | null | undefined): string | null {
  return region && REGION_OBLAST[region] ? REGION_OBLAST[region] : null
}

// ---------- Розбір відповідей посередника ----------

const str = (v: unknown): string => (v === null || v === undefined ? "" : String(v))

export function parseAlertFeed(text: string): AlertFeed {
  const feed: AlertFeed = { ok: false, stale: false, fetchedAt: 0, alerts: [] }
  let root: any
  try {
    root = JSON.parse(text)
  } catch (e) {
    return feed
  }
  if (!root || typeof root !== "object" || !Array.isArray(root.alerts)) return feed
  feed.ok = root.ok === true
  feed.stale = root.stale === true
  feed.fetchedAt = typeof root.fetchedAt === "number" ? root.fetchedAt : 0
  for (const m of root.alerts) {
    if (!m || typeof m !== "object") continue
    const since = Date.parse(str(m.since))
    feed.alerts.push({
      uid: str(m.uid),
      title: str(m.title),
      kind: m.kind ? str(m.kind) : "unknown",
      parent: str(m.parent),
      oblast: str(m.oblast),
      raion: str(m.raion),
      type: m.type ? str(m.type) : "air_raid",
      level: str(m.level),
      since: Number.isFinite(since) ? since : 0,
      threats: Array.isArray(m.threats) ? m.threats.map(str) : [],
    })
  }
  return feed
}

export function parseLocations(text: string): Location[] {
  let root: any
  try {
    root = JSON.parse(text)
  } catch (e) {
    return []
  }
  if (!root || !Array.isArray(root.oblasts)) return []
  const node = (m: any, kids: Location[] = []): Location => ({ uid: str(m.uid), title: str(m.title), children: kids })
  return root.oblasts
    .filter((o: any) => o && o.uid)
    .map((o: any) =>
      node(o, (Array.isArray(o.raions) ? o.raions : []).filter((r: any) => r && r.uid).map((r: any) =>
        node(r, (Array.isArray(r.hromadas) ? r.hromadas : []).filter((h: any) => h && h.uid).map((h: any) => node(h))))))
}

// ---------- Місце ----------

export function placeTitle(p: Place): string {
  return p.hromadaTitle || p.raionTitle || p.oblastTitle || ""
}

// «м. Запоріжжя та Запорізька територіальна громада» не влазить у віджет: «… ТГ».
export function shortTitle(title: string | null | undefined): string {
  if (!title) return ""
  return title.replace(" територіальна громада", " ТГ").replace("Автономна Республіка Крим", "АР Крим")
}

// Ще коротше для малого віджета: «м. Запоріжжя та Запорізька ТГ» → «м. Запоріжжя», «Запорізька область» → «Запорізька обл.».
export function compactPlace(title: string | null | undefined): string {
  const t = shortTitle(title)
  const city = /^(м\. [^ ]+(?: [^ ]+)?) та /.exec(t)
  if (city) return city[1]
  return t.replace(/ область$/, " обл.").replace(/ район$/, " р-н")
}

// Зламаний чи неповний запис місця: громада без району не має сенсу.
export function cleanPlace(p: Place | null | undefined): Place | null {
  if (!p || !p.oblast) return null
  const out: Place = { oblast: String(p.oblast), oblastTitle: p.oblastTitle }
  if (p.raion) {
    out.raion = String(p.raion)
    out.raionTitle = p.raionTitle
    if (p.hromada) {
      out.hromada = String(p.hromada)
      out.hromadaTitle = p.hromadaTitle
    }
  }
  return out
}

// ---------- Стан для обраного місця ----------

// Тривога стосується місця, якщо оголошена в його області, районі чи громаді, або в місті цієї громади
// (у великих містах тривогу оголошують окремо: «м. Запоріжжя» 5564 належить громаді 564).
export function matches(a: Alert, p: Place): boolean {
  return a.uid === p.oblast || (!!p.raion && a.uid === p.raion)
    || (!!p.hromada && (a.uid === p.hromada || (a.kind === "city" && a.parent === p.hromada)))
}

// Жовтий рівень alerts.in.ua: попередня загроза, ще не повітряна тривога.
const yellow = (a: Alert) => a.level === "yellow"

export function active(s: AlertStatus | null | undefined): boolean {
  return !!s && (s.kind === "alert" || s.kind === "threat")
}

function rank(a: Alert): number {
  if (a.kind === "hromada" || a.kind === "city") return 3
  if (a.kind === "raion") return 2
  return 1
}

export function typeText(type: string): string {
  switch (type) {
    case "artillery_shelling": return "Загроза обстрілу"
    case "urban_fights": return "Вуличні бої"
    case "chemical": return "Хімічна загроза"
    case "nuclear": return "Радіаційна загроза"
    default: return "Повітряна тривога"
  }
}

const THREATS: Record<string, string> = {
  drones: "БпЛА", ballistic_missiles: "балістика", cruise_missiles: "крилаті ракети", unspecified_missiles: "ракети",
  guided_aerial_bombs: "КАБи", tactic_aircraft_activity: "тактична авіація", strategic_aircraft_activity: "стратегічна авіація",
  mig31k_departure: "МіГ-31К", air_defense: "робота ППО",
}

// «БпЛА, балістика»: не більше двох, без повторів.
export function threatText(threats: string[]): string | null {
  const words: string[] = []
  for (const t of threats) {
    const w = THREATS[t]
    if (w && !words.includes(w)) words.push(w)
  }
  return words.length ? words.slice(0, 2).join(", ") : null
}

const isCity = (p: Place) => !!p.oblastTitle && p.oblastTitle.startsWith("м. ")

// З якого часу: сьогодні «з 10:40», цього року «з 13.11, 22:10», давніше «з 04.04.2022».
export function alertSince(since: number, nowMs: number): string {
  if (since <= 0) return "триває"
  const at = kyivParts(new Date(since))
  const now = kyivParts(new Date(nowMs))
  const time = hm(at.min)
  if (at.ymd === now.ymd) return `з ${time}`
  const day = `${at.ymd.slice(8, 10)}.${at.ymd.slice(5, 7)}`
  if (at.ymd.slice(0, 4) === now.ymd.slice(0, 4)) return `з ${day}, ${time}`
  return `з ${day}.${at.ymd.slice(0, 4)}`
}

// Коли alerts.in.ua востаннє підтвердив стан: сьогодні лише час, інакше ще й дата.
export function checkedText(fetchedAt: number, nowMs: number): string {
  const at = kyivParts(new Date(fetchedAt))
  const now = kyivParts(new Date(nowMs))
  const time = hm(at.min)
  return at.ymd === now.ymd ? time : `${at.ymd.slice(8, 10)}.${at.ymd.slice(5, 7)}, ${time}`
}

function blank(): AlertStatus {
  return {
    kind: "setup", title: "Оберіть місце", sub: "Відкрийте «Графік світла» у Scripting", subShort: null, place: "", where: "",
    others: [], since: 0, timer: false, stale: false, checked: null, posts: [], channel: null,
  }
}

// Найточніша тривога для місця: громада чи місто, далі район, далі область.
function pick(feed: AlertFeed, place: Place, wantYellow: boolean): Alert | null {
  let best: Alert | null = null
  for (const a of feed.alerts) {
    if (!matches(a, place) || yellow(a) !== wantYellow) continue
    if (!best || rank(a) > rank(best)) best = a
  }
  return best
}

export function alertStatus(placeIn: Place | null | undefined, feed: AlertFeed | null, nowMs: number): AlertStatus {
  const s = blank()
  const place = cleanPlace(placeIn)
  if (!place) return s
  s.place = shortTitle(placeTitle(place))
  if (!feed || !feed.ok || feed.fetchedAt <= 0) {
    s.kind = "nodata"
    s.title = "Немає даних"
    s.sub = "Перевірте інтернет і оновіть"
    return s
  }
  const age = nowMs - feed.fetchedAt
  s.checked = checkedText(feed.fetchedAt, nowMs)
  s.stale = feed.stale || age > ALERTS.staleMinutes * 60000
  if (age > ALERTS.oldMinutes * 60000) {
    s.kind = "nodata"
    s.title = "Немає свіжих даних"
    s.sub = `Остання перевірка: ${s.checked}`
    return s
  }
  // Тривога (червоний рівень) важливіша за попередню загрозу (жовтий): спершу шукаємо її.
  let threatOnly = false
  let here = pick(feed, place, false)
  if (!here) {
    here = pick(feed, place, true)
    threatOnly = !!here
  }
  let since = Infinity
  const threats: string[] = []
  for (const a of feed.alerts) {
    if (!matches(a, place) || yellow(a) !== threatOnly) continue
    if (a.since > 0) since = Math.min(since, a.since)
    threats.push(...a.threats)
  }
  // Інші повітряні тривоги в області (без попередніх загроз): свій район першим.
  const own: string[] = []
  for (const a of feed.alerts) {
    if (matches(a, place) || place.oblast !== a.oblast || a.type !== "air_raid" || yellow(a)) continue
    if (place.raionTitle && place.raionTitle === a.raion) own.push(shortTitle(a.title))
    else s.others.push(shortTitle(a.title))
  }
  const inOwnRaion = own.length > 0
  s.others.unshift(...own)
  if (here) {
    s.kind = threatOnly ? "threat" : "alert"
    s.title = threatOnly && here.type === "air_raid" ? "Попередня загроза" : typeText(here.type)
    s.since = since === Infinity ? 0 : since
    s.timer = s.since > 0 && nowMs - s.since >= 0 && nowMs - s.since < ALERTS.timerHours * 3600000
    const threat = threatText(threats)
    s.subShort = alertSince(s.since, nowMs)
    s.sub = s.subShort + (threat ? ` · ${threat}` : "")
    // Де саме оголошено, якщо це не те саме, що обране місце: «уся область», район.
    const where = here.kind === "oblast" ? (isCity(place) ? "" : "уся область") : shortTitle(here.title)
    s.where = where === s.place ? "" : where
    return s
  }
  if (s.others.length) {
    s.kind = "nearby"
    const list = s.others.length > 1 ? `${s.others[0]} і ще ${s.others.length - 1}` : s.others[0]
    if (!place.raion) {
      s.title = "Тривога в частині області"
      s.sub = list
    } else if (!place.hromada && inOwnRaion) {
      s.title = "Тривога в частині району"
      s.sub = list
    } else {
      s.title = "Тут тихо"
      s.sub = `${inOwnRaion ? "поруч: " : "в області: "}${list}`
    }
    return s
  }
  s.kind = "quiet"
  s.title = "Тривоги немає"
  s.sub = isCity(place) ? "тихо в усьому місті" : "тихо в усій області"
  return s
}

// Коротка назва стану (сторінка налаштувань, екран блокування).
export function alertShortTitle(s: AlertStatus): string {
  switch (s.kind) {
    case "alert": return s.title === "Повітряна тривога" ? "Тривога" : s.title
    case "threat": return s.title === "Попередня загроза" ? "Загроза" : s.title
    case "nearby": return s.title === "Тривога в частині області" ? "Частина області" : "Тривога поруч"
    case "quiet": return "Тихо"
    case "nodata": return "Немає даних"
    default: return "Оберіть місце"
  }
}

// Напис біля значка тривоги на сторінці світла, коли щось не так; у тиші жодного. Короткий варіант для тісного місця:
// поруч стоїть значок сирени, тож «з 10:40» читається як «тривога з 10:40».
export function alertPill(s: AlertStatus, shortForm: boolean): string | null {
  const since = !!s.subShort && s.subShort.startsWith("з ") && s.subShort.length <= 7
  switch (s.kind) {
    case "alert":
      if (shortForm) return since ? (s.subShort as string) : "Тривога"
      return since ? `Тривога ${s.subShort}` : "Повітряна тривога"
    case "threat": return shortForm ? "Загроза" : "Попередня загроза"
    case "nearby": return shortForm ? "Поруч" : "Тривога поруч"
    case "nodata": return "Немає даних"
    case "setup": return "Оберіть місце"
    default: return null
  }
}

// ---------- Канал моніторингу ----------
// Користувач може підключити публічний Telegram-канал, де пишуть, що летить і куди. Формати в каналів різні,
// тож нічого не розбираємо: віджет показує останні свіжі дописи дослівно, з часом.

export const channelUrl = (id: string) => `https://t.me/s/${id}`

function plain(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#39;|&apos;|&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ") // \s у JavaScript ловить і нерозривний пробіл
    .trim()
}

// Будь-який публічний канал на t.me/s/канал: текст і час кожного допису, старіші першими. Дописи без тексту пропускаємо.
export function parseChannelPosts(html: string): ChannelPost[] {
  const out: ChannelPost[] = []
  const re = /tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>[\s\S]*?<time datetime="([^"]+)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const text = plain(m[1])
    const at = Date.parse(m[2])
    if (text && Number.isFinite(at)) out.push({ at, text })
  }
  return out
}

// Назва каналу зі сторінки t.me/s: «Моніторинг Запоріжжя».
export function parseChannelTitle(html: string): string | null {
  const m = /<meta property="og:title" content="([^"]*)"/.exec(html)
  const title = m ? plain(m[1]) : ""
  return title || null
}

// Свіжі дописи (не старші за ALERTS.postFreshMinutes), найновіші першими.
export function freshPosts(posts: ChannelPost[] | null | undefined, nowMs: number, limit: number): ChannelPost[] {
  const out: ChannelPost[] = []
  for (let i = (posts || []).length - 1; i >= 0 && out.length < limit; i--) {
    const p = (posts as ChannelPost[])[i]
    const age = nowMs - p.at
    if (age >= -5 * 60000 && age <= ALERTS.postFreshMinutes * 60000) out.push(p)
  }
  return out
}

export function postLine(p: ChannelPost): string {
  return `${hm(kyivParts(new Date(p.at)).min)} · ${p.text}`
}

// Додає до стану свіжі дописи каналу (до трьох). Без місця нічого не додаємо.
export function withPosts(s: AlertStatus, posts: ChannelPost[] | null | undefined, title: string | null, nowMs: number): AlertStatus {
  if (s.kind === "setup") return s
  return { ...s, posts: freshPosts(posts, nowMs, 3).map(postLine), channel: title }
}

// «Щось відбувається»: тривога чи загроза тут, тривога поруч або свіжий допис каналу моніторингу
// (канали часто пишуть раніше, ніж оголошують тривогу). Тоді й канал, і віджет перевіряємо частіше.
export function busy(s: AlertStatus | null | undefined, posts: ChannelPost[] | null | undefined, nowMs: number): boolean {
  if (s && (active(s) || s.kind === "nearby")) return true
  return (posts || []).some((p) => {
    const age = nowMs - p.at
    return age >= -5 * 60000 && age <= ALERTS.busyPostMinutes * 60000
  })
}

// Посилання, «@назва» чи сама назва каналу: лишаємо назву (як у logic.channelId, але без обмеження «svitlobot_»).
export function channelName(input: string): string {
  const s = String(input || "").trim().replace(/^https?:\/\//i, "").replace(/^(www\.)?(t|telegram)\.me\/(s\/)?/i, "").replace(/^@/, "")
  const id = s.split(/[/?#\s]/)[0]
  return /^[A-Za-z0-9_]{4,64}$/.test(id) ? id : ""
}

// ---------- Сторінки віджета ----------
// Модуль світла є завжди, тривога — якщо її ввімкнено в налаштуваннях. Тоді праворуч у віджеті стовпчик значків:
// дотик до значка показує сторінку модуля. Обрана сторінка тримається PAGE_HOLD_MINUTES, потім знову світло.

export const LIGHT = "light"
export const ALERT = "alert"
export const PAGE_HOLD_MINUTES = 15
export const PAGE_QUICK_SECONDS = 20 // одразу після дотику віджет малює збережене, без мережі

export function pagesOf(alertsOn: boolean): string[] {
  return alertsOn ? [LIGHT, ALERT] : [LIGHT]
}

// Вибір сторінки для кожного віджета окремо: ключ — розмір і поле Parameter (друга адреса).
export type PageChoice = { page: string; at: number }
export type PageMode = { page: string; until: number | null; quick: boolean }

export function pageKey(family: string, parameter: string | null | undefined): string {
  return `${family}|${String(parameter || "").trim().toLowerCase()}`
}

export function pageMode(choice: PageChoice | null | undefined, pages: string[], nowMs: number): PageMode {
  if (!choice || typeof choice.at !== "number") return { page: LIGHT, until: null, quick: false }
  const age = nowMs - choice.at
  const quick = age >= 0 && age < PAGE_QUICK_SECONDS * 1000
  const until = choice.at + PAGE_HOLD_MINUTES * 60000
  const held = age >= 0 && nowMs < until && pages.includes(choice.page)
  const page = held ? choice.page : LIGHT
  return { page, until: held && page !== LIGHT ? until : null, quick }
}

// Коли наступного разу оновити віджет з увімкненими тривогами: частіше, коли щось відбувається.
export function alertRefreshMinutes(s: AlertStatus | null | undefined, posts: ChannelPost[] | null | undefined, nowMs: number): number {
  return busy(s, posts, nowMs) ? ALERTS.busyRefreshMinutes : ALERTS.quietRefreshMinutes
}
