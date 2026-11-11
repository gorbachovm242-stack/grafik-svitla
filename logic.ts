// «Графік світла»: уся логіка без звертань до Scripting, щоб її можна було перевірити на ПК.
// Години подаються за київським часом. Дані: офіційний сайт Запоріжжяобленерго та спільні дані обленерго.

export const SETTINGS = {
  cacheMinutes: 10, // не перевіряти джерело частіше
  // Між змінами просимо iOS оновлювати віджет раз на 30 хвилин: частіші запити вичерпують її денний ліміт,
  // і тоді вона спізнюється саме в момент зміни стану.
  refreshMinutes: 30,
  staleMinutes: 180, // після цього показувати, що дані застарілі
  noticeMinutes: 10, // за скільки хвилин попереджати про вимкнення й увімкнення
  timeoutSeconds: 8, // очікування одного джерела
  // Без інтернету запит буває висить довше за свій тайм-аут, а iOS тим часом зупиняє віджет, і він лишається старим.
  // Тому в мережі є спільний крайній строк, після якого віджет малює збережене.
  widgetBudgetMs: 8000, // скільки віджет чекає мережу: графік і датчик разом
  widgetRequestMs: 5000, // одне джерело у віджеті, щоб і на запасне лишився час
  buttonBudgetMs: 10000, // кнопка «↻»
  appBudgetMs: 25000, // сторінка налаштувань
  offlineRetryMinutes: 5, // після невдалої спроби віджет стільки не йде в мережу, а одразу малює збережене
  factCacheMinutes: 4, // датчик СвітлоБота не перепитувати частіше
  factRefreshMinutes: 15, // з датчиком віджет просить оновлення частіше
  factStaleMinutes: 60, // старіші дані датчика позначаємо часом перевірки
  // Кнопка «Завтра ›» у малому й середньому віджеті: скільки показувати завтра, перш ніж віджет сам повернеться на сьогодні.
  tomorrowHoldMinutes: 3,
  dayTapQuickSeconds: 20, // одразу після натискання «Завтра ›» чи «‹ Сьогодні» віджет малює збережене, без мережі
}

export const URLS = {
  zoe: "https://www.zoe.com.ua/outage/",
  zoeQueue:
    "https://script.google.com/macros/s/AKfycbwFgBo9W8JL_7FqghJ1hDiE-Fyxzs4GZJAq2xhTseOiv5ZnkusMKj0_g9R0DJKko19r/exec",
  feedNew: "https://dtek-api.svitlo-proxy.workers.dev/",
  feedGithub: "https://raw.githubusercontent.com/chaichuk/UA-power-outages-monitor/main/artifacts/last-message.json",
  feedOld: "https://svitlo-proxy.svitlo-proxy.workers.dev",
}

export const ZOE_GROUPS = ["1.1", "1.2", "2.1", "2.2", "3.1", "3.2", "4.1", "4.2", "5.1", "5.2", "6.1", "6.2"]

export type Region = { id: string; name: string; ids: string[]; official?: boolean; oldOnly?: boolean }

// ids: назви регіону в спільних даних (у двох джерелах вони різні).
// oldOnly: регіон є лише в старому джерелі.
export const REGIONS: Region[] = [
  { id: "zaporizhzhia", name: "м. Запоріжжя та область", ids: ["zaporizka-oblast"], official: true },
  { id: "kyiv", name: "м. Київ", ids: ["kyiv"] },
  { id: "dnipro-dnem", name: "м. Дніпро (ДнЕМ)", ids: ["dnipro-dnem"] },
  { id: "dnipro-cek", name: "м. Дніпро (ЦЕК)", ids: ["dnipro-cek"] },
  { id: "vinnytsia", name: "Вінницька", ids: ["vinnitska-oblast"], oldOnly: true },
  { id: "volyn", name: "Волинська", ids: ["volinska-oblast"], oldOnly: true },
  { id: "dnipropetrovsk", name: "Дніпропетровська", ids: ["dnipropetrovska-oblast"] },
  { id: "donetsk", name: "Донецька", ids: ["donetska-oblast"], oldOnly: true },
  { id: "zhytomyr", name: "Житомирська", ids: ["zhytomyrska-oblast", "jitomirska-oblast"] },
  { id: "zakarpattia", name: "Закарпатська", ids: ["zakarpatska-oblast"] },
  { id: "ivano-frankivsk", name: "Івано-Франківська", ids: ["ivano-frankivska-oblast"] },
  { id: "kyiv-oblast", name: "Київська", ids: ["kiivska-oblast"] },
  { id: "kirovohrad", name: "Кіровоградська", ids: ["kirovogradska-oblast"], oldOnly: true },
  { id: "lviv", name: "Львівська", ids: ["lvivska-oblast"] },
  { id: "mykolaiv", name: "Миколаївська", ids: ["mikolaivska-oblast"], oldOnly: true },
  { id: "odesa", name: "Одеська", ids: ["odeska-oblast"] },
  { id: "poltava", name: "Полтавська", ids: ["poltavska-oblast"] },
  { id: "rivne", name: "Рівненська", ids: ["rivnenska-oblast"] },
  { id: "sumy", name: "Сумська", ids: ["sumska-oblast"], oldOnly: true },
  { id: "ternopil", name: "Тернопільська", ids: ["ternopilska-oblast"] },
  { id: "kharkiv", name: "Харківська", ids: ["kharkivska-oblast", "harkivska-oblast"] },
  { id: "khmelnytskyi", name: "Хмельницька", ids: ["khmelnytska-oblast", "hmelnitska-oblast"] },
  { id: "cherkasy", name: "Черкаська", ids: ["cherkaska-oblast"] },
  { id: "chernivtsi", name: "Чернівецька", ids: ["chernivetska-oblast"] },
  { id: "chernihiv", name: "Чернігівська", ids: ["chernihivska-oblast", "chernigivska-oblast"] },
]

const MONTHS: Record<string, number> = {
  січня: 1, лютого: 2, березня: 3, квітня: 4, травня: 5, червня: 6,
  липня: 7, серпня: 8, вересня: 9, жовтня: 10, листопада: 11, грудня: 12,
}

// ---------- Типи ----------

export type Status = "on" | "off" | "maybe" | "unknown"
// День: s і e у хвилинах від півночі, st: on, off, maybe (можливе відключення), unknown.
export type Run = { s: number; e: number; st: Status }
export type Day = { status: "ok" | "check" | "none"; runs: Run[] }
export type Sched = { days: Record<string, Day>; emergency: boolean; warn?: boolean; key?: string; fetchedAt?: number }
// Три сповіщення, кожне можна вимкнути. Не задано: увімкнено.
export type Config = {
  region: string
  group: string
  notifyChange?: boolean // графік черги змінився або зʼявився новий
  notifyOff?: boolean // за 10 хвилин до відключення
  notifyOn?: boolean // за 10 хвилин до ввімкнення
  style?: string
  look?: string
  lockLook?: string
  svitlobot?: string // канал датчика СвітлоБота: чи є світло насправді
  svitlobotName?: string // його назва-адреса для налаштувань
}

export function notifyPrefs(cfg: Config): { change: boolean; off: boolean; on: boolean } {
  return { change: cfg.notifyChange !== false, off: cfg.notifyOff !== false, on: cfg.notifyOn !== false }
}
export type Data = { sched: Sched | null; status: "ok" | "nogroup" | "fail"; fact?: Fact | null }
export type Now = { ymd: string; min: number }
export type Kind = "setup" | "nogroup" | "nodata" | "on" | "off" | "maybe" | "check" | "none"

export type View = {
  kind: Kind
  title: string
  sub: string
  group: string | null
  style: string | null
  look: string | null
  lockLook: string | null
  nowMin: number
  todayRuns: Run[]
  todayWindows: Run[]
  windowsLeft: Run[]
  tomorrowRuns: Run[] | null
  tomorrowWindows: Run[] | null
  runFrom: number | null
  changeMin: number | null
  short: string
  notice: string | null
  noticeShort: string | null
  stale: boolean
  checked: number | null
  fact: FactView | null // що каже датчик СвітлоБота, якщо його обрано
}

// ---------- Час ----------

export function pad(n: number): string {
  return String(n).padStart(2, "0")
}

// Години подаються за київським часом, навіть якщо телефон за кордоном.
export function kyivParts(date: Date): Now {
  for (const timeZone of ["Europe/Kyiv", "Europe/Kiev"]) {
    try {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hourCycle: "h23",
      }).formatToParts(date)
      const get = (type: string) => parts.find((p) => p.type === type)!.value
      return { ymd: `${get("year")}-${get("month")}-${get("day")}`, min: Number(get("hour")) * 60 + Number(get("minute")) }
    } catch (e) {
      // наступна назва поясу або місцевий час нижче
    }
  }
  return {
    ymd: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    min: date.getHours() * 60 + date.getMinutes(),
  }
}

export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

export function hm(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`
}

// «о 13:30», але «об 11:30».
export function at(min: number): string {
  return `${Math.floor(min / 60) === 11 ? "об" : "о"} ${hm(min)}`
}

// ---------- Графік: спільна форма даних ----------

export function mergeRuns(runs: Run[]): Run[] {
  const out: Run[] = []
  for (const r of runs) {
    if (r.e <= r.s) continue
    const last = out[out.length - 1]
    if (last && last.st === r.st && last.e === r.s) last.e = r.e
    else out.push({ s: r.s, e: r.e, st: r.st })
  }
  return out
}

export function runsFromOff(ranges: [number, number][]): Run[] {
  const runs: Run[] = []
  let pos = 0
  for (const [s, e] of ranges.slice().sort((a, b) => a[0] - b[0])) {
    if (s > pos) runs.push({ s: pos, e: s, st: "on" })
    runs.push({ s: Math.max(s, pos), e, st: "off" })
    pos = Math.max(pos, e)
  }
  if (pos < 1440) runs.push({ s: pos, e: 1440, st: "on" })
  return mergeRuns(runs)
}

// ---------- Офіційний сайт Запоріжжяобленерго ----------

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>|<\/p>|<\/div>|<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#8211;|&#8212;|&ndash;|&mdash;/g, "–")
    .replace(/&nbsp;|&#160;/g, " ")
}

function findDate(text: string): { day: number; month: number } | null {
  const m = /(\d{1,2})\s+(січня|лютого|березня|квітня|травня|червня|липня|серпня|вересня|жовтня|листопада|грудня)/.exec(
    text.toLowerCase()
  )
  return m ? { day: Number(m[1]), month: MONTHS[m[2]] } : null
}

export function parseRanges(text: string): { ranges: [number, number][]; exact: boolean } {
  const ranges: [number, number][] = []
  const re = /(\d{1,2})[:.](\d{2})\s*[–—-]\s*(\d{1,2})[:.](\d{2})/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const s = Number(m[1]) * 60 + Number(m[2])
    const e = Number(m[3]) * 60 + Number(m[4])
    if (s < e && e <= 1440) ranges.push([s, e])
  }
  // Кожен час має належати до розібраного проміжку, інакше рядок прочитано неточно.
  const times = (text.match(/\d{1,2}[:.]\d{2}/g) || []).length
  return { ranges, exact: times === ranges.length * 2 }
}

export type Post = {
  title: string
  date: { day: number; month: number } | null
  groups: Record<string, [number, number][]>
  exact: boolean
}

// Дописи йдуть від найновішого до найстарішого.
export function parsePosts(html: string): Post[] {
  const posts: Post[] = []
  const articleRe = /<article[^>]*>([\s\S]*?)<\/article>/gi
  let m: RegExpExecArray | null
  while ((m = articleRe.exec(html))) {
    const heading = /<h2[^>]*>([\s\S]*?)<\/h2>/i.exec(m[1])
    if (!heading) continue
    const title = stripHtml(heading[1]).trim()
    if (!title) continue
    const lines = stripHtml(m[1].slice(heading.index + heading[0].length))
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
    const groups: Record<string, [number, number][]> = {}
    let exact = true
    for (const line of lines) {
      const g = /^(\d\.\d)\s*[:.–—-]\s*(.+)$/.exec(line)
      if (!g) continue
      const parsed = parseRanges(g[2])
      if (!parsed.exact || !parsed.ranges.length) exact = false
      groups[g[1]] = parsed.ranges
    }
    posts.push({ title, date: findDate(title) || findDate(lines[0] || ""), groups, exact })
  }
  return posts
}

export function dayFromPosts(posts: Post[], ymd: string, group: string): Day | null {
  const [, month, day] = ymd.split("-").map(Number)
  const post = posts.find((p) => p.date && p.date.month === month && p.date.day === day && /ГПВ|ГРАФІК/i.test(p.title))
  if (!post) return null
  if (!post.exact || !Object.keys(post.groups).length) return { status: "check", runs: [] }
  // Обленерго перелічує лише черги з відключеннями. Немає черги в дописі: цього дня без відключень.
  return { status: "ok", runs: runsFromOff(post.groups[group] || []) }
}

// ---------- Спільні дані обленерго ----------

export function dayFromFeed(slots: Record<string, number | string>): Day {
  const runs: Run[] = []
  for (let i = 0; i < 48; i++) {
    const code = Number(slots[`${pad(Math.floor(i / 2))}:${i % 2 ? "30" : "00"}`] || 0)
    const st: Status = code === 1 ? "on" : code === 2 ? "off" : code === 3 ? "maybe" : "unknown"
    runs.push({ s: i * 30, e: i * 30 + 30, st })
  }
  if (runs.every((r) => r.st === "unknown")) return { status: "none", runs: [] }
  return { status: "ok", runs: mergeRuns(runs) }
}

export type Feed = { regions: { cpu: string; emergency?: boolean; schedule?: Record<string, Record<string, Record<string, number>>> }[] }

export function parseFeed(text: string): Feed {
  let json = JSON.parse(text)
  if (json && typeof json.body === "string") json = JSON.parse(json.body)
  if (!json || !Array.isArray(json.regions)) throw new Error("Невідомий формат даних")
  return json as Feed
}

export function feedRegion(json: Feed, region: Region) {
  return json.regions.find((r) => region.ids.includes(r.cpu)) || null
}

export function scheduleFromFeed(json: Feed, region: Region, group: string): Sched | null {
  const item = feedRegion(json, region)
  const byDate = item && item.schedule ? item.schedule[group] : null
  if (!item || !byDate) return null
  const days: Record<string, Day> = {}
  Object.keys(byDate).forEach((date) => {
    days[date] = dayFromFeed(byDate[date] || {})
  })
  return { days, emergency: !!item.emergency }
}

// ---------- Джерела ----------

// Завантажувач сторінки за адресою: на телефоні це fetch, у тестах підставні дані.
export type Load = (url: string) => Promise<string>

export function regionById(id: string): Region | null {
  return REGIONS.find((r) => r.id === id) || null
}

export function sourcesFor(region: Region): string[] {
  const feeds = region.oldOnly ? [URLS.feedOld] : [URLS.feedNew, URLS.feedGithub, URLS.feedOld]
  return region.official ? ["official"].concat(feeds) : feeds
}

function usableDay(sched: Sched, ymd: string): boolean {
  const day = sched.days[ymd]
  return !!day && day.runs.length > 0
}

export async function loadOfficial(load: Load, group: string, today: string): Promise<Sched> {
  const posts = parsePosts(await load(URLS.zoe))
  if (!posts.length) throw new Error("На сторінці не знайдено дописів")
  const days: Record<string, Day> = {}
  for (const ymd of [today, addDays(today, 1)]) {
    const day = dayFromPosts(posts, ymd, group)
    if (day) days[ymd] = day
  }
  return { days, emergency: false }
}

export type FetchResult = { status: "ok"; sched: Sched } | { status: "nogroup" | "fail" }

// Перше джерело з графіком на сьогодні перемагає. Дані за інші дати сьогоднішні не замінюють.
export async function fetchSchedule(
  cfg: Config,
  today: string,
  load: Load,
  budgetMs: number = Infinity,
  log: (message: string) => void = () => {}
): Promise<FetchResult> {
  const region = regionById(cfg.region)
  if (!region) return { status: "fail" }
  const started = Date.now()
  let fallback: Sched | null = null
  let reached = false
  let mainFeedWorks = false
  let warn = false
  for (const source of sourcesFor(region)) {
    if (source === URLS.feedGithub && mainFeedWorks) continue // там ті самі дані
    if (Date.now() - started > budgetMs) break
    try {
      const sched =
        source === "official" ? await loadOfficial(load, cfg.group, today) : scheduleFromFeed(parseFeed(await load(source)), region, cfg.group)
      reached = true
      if (source === URLS.feedNew) mainFeedWorks = true
      if (!sched) continue
      if (sched.days[today] && sched.days[today].status === "check") warn = true
      if (usableDay(sched, today)) return { status: "ok", sched: Object.assign(sched, { warn }) }
      fallback = fallback || sched
    } catch (e) {
      log(`${source}: ${e}`)
    }
  }
  if (fallback) return { status: "ok", sched: Object.assign(fallback, { warn }) }
  return { status: reached ? "nogroup" : "fail" }
}

export function sortGroups(groups: string[]): string[] {
  return groups.slice().sort((a, b) => parseFloat(a) - parseFloat(b) || a.localeCompare(b))
}

export async function groupsFor(region: Region, load: Load): Promise<string[]> {
  if (region.official) return ZOE_GROUPS
  const item = feedRegion(parseFeed(await load(region.oldOnly ? URLS.feedOld : URLS.feedNew)), region)
  return sortGroups(Object.keys((item && item.schedule) || {}))
}

// ---------- Стан на зараз ----------

// Дві доби на одній осі: сьогоднішні хвилини 0..1440, завтрашні 1440..2880.
export function timeline(sched: Sched, today: string): Run[] {
  const line: Run[] = []
  ;[today, addDays(today, 1)].forEach((ymd, i) => {
    const day = sched.days[ymd]
    if (day) day.runs.forEach((r) => line.push({ s: r.s + i * 1440, e: r.e + i * 1440, st: r.st }))
  })
  return mergeRuns(line)
}

function windowsOf(day: Day | undefined): Run[] {
  return day ? day.runs.filter((r) => r.st === "off" || r.st === "maybe") : []
}

type State = { kind: Kind; current?: Run; next?: Run | null; line: Run[] }

export function getState(sched: Sched, now: Now): State {
  const day = sched.days[now.ymd]
  if (!day || !day.runs.length) return { kind: day && day.status === "check" ? "check" : "none", line: [] }
  const line = timeline(sched, now.ymd)
  const index = line.findIndex((r) => r.s <= now.min && now.min < r.e)
  if (index < 0 || line[index].st === "unknown") return { kind: "none", line }
  return { kind: line[index].st as Kind, current: line[index], next: line[index + 1] || null, line }
}

export function whenText(min: number): string {
  return min >= 1440 ? `завтра ${at(min - 1440)}` : at(min)
}

// Межа проміжку: «23:30», «24:00» (північ сьогодні), «06:00 завтра».
export function untilText(min: number): string {
  return min > 1440 ? `${hm(min - 1440)} завтра` : hm(min)
}

export function windowText(w: Run): string {
  return `${hm(w.s)}–${hm(w.e)}${w.st === "maybe" ? "?" : ""}`
}

export function buildView(cfg: Config | null, data: Data, now: Now, nowMs: number = Date.now()): View {
  const view: View = {
    kind: "setup", title: "Оберіть чергу", sub: "Відкрийте «Графік світла» у Scripting", group: cfg ? cfg.group : null,
    style: cfg && cfg.style ? cfg.style : null, look: cfg && cfg.look ? cfg.look : null, lockLook: cfg && cfg.lockLook ? cfg.lockLook : null,
    nowMin: now.min, todayRuns: [], todayWindows: [], windowsLeft: [], tomorrowRuns: null, tomorrowWindows: null,
    runFrom: null, changeMin: null, short: "—", notice: null, noticeShort: null, stale: false, checked: null,
    fact: cfg ? factView(data.fact, now, nowMs) : null,
  }
  if (!cfg) return view

  const sched = data.sched
  if (!sched) {
    view.kind = data.status === "nogroup" ? "nogroup" : "nodata"
    view.title = data.status === "nogroup" ? "Черги немає" : "Немає даних"
    view.sub = data.status === "nogroup" ? `Черга ${cfg.group} зникла з графіка` : "Не вдалося завантажити"
    return view
  }

  const state = getState(sched, now)
  const today = sched.days[now.ymd]
  const tomorrow = sched.days[addDays(now.ymd, 1)]
  view.kind = state.kind
  view.runFrom = state.current ? state.current.s : null
  view.todayRuns = today ? today.runs : []
  view.todayWindows = windowsOf(today)
  view.windowsLeft = view.todayWindows.filter((w) => w.e > now.min)
  if (tomorrow && tomorrow.runs.length) {
    view.tomorrowRuns = tomorrow.runs
    view.tomorrowWindows = windowsOf(tomorrow)
  }
  const fetchedAt = sched.fetchedAt ?? nowMs
  view.checked = kyivParts(new Date(fetchedAt)).min
  view.stale = (nowMs - fetchedAt) / 60000 > SETTINGS.staleMinutes
  if (sched.emergency) {
    view.notice = "Аварійні відключення"
    view.noticeShort = "аварійні"
  } else if (sched.warn) {
    view.notice = "Графік міг змінитися"
    view.noticeShort = "перевірте сайт"
  } else if (view.stale) {
    view.notice = `Дані від ${hm(view.checked)}`
    view.noticeShort = `дані ${hm(view.checked)}`
  }

  // Написи кажуть «до коли», а не «що зараз»: iOS перемальовує віджет із запізненням,
  // і «Світло до 23:30» о 23:33 лишається правдою, а «Світло є» вже ні.
  const next = state.next
  const index = state.current ? state.line.indexOf(state.current) : -1
  const afterNext = index >= 0 ? state.line[index + 2] || null : null
  if (state.kind === "on") {
    if (next && (next.st === "off" || next.st === "maybe")) {
      view.title = `Світло до ${untilText(next.s)}`
      const known = !!afterNext && afterNext.st !== "unknown"
      if (next.st === "off") view.sub = known ? `Потім без світла до ${untilText(next.e)}` : "Потім відключення"
      else view.sub = known ? `Потім можливе відключення до ${untilText(next.e)}` : "Потім можливе відключення"
      view.changeMin = next.s
    } else {
      view.title = "Світло є"
      view.sub = "Більше без відключень"
    }
  } else if (state.kind === "off" || state.kind === "maybe") {
    view.title = state.kind === "off" ? "Світла немає" : "Можливе відключення"
    if (next && next.st !== "unknown") {
      if (state.kind === "off") view.title = `Без світла до ${untilText(next.s)}`
      const known = !!afterNext && afterNext.st !== "unknown"
      if (next.st === "on") view.sub = known ? `Потім світло до ${untilText(next.e)}` : "Потім світло"
      else view.sub = `Потім можливе відключення до ${untilText(next.e)}`
      if (state.kind === "maybe") view.sub = `До ${untilText(next.s)}${next.st === "on" ? ", потім світло" : ""}`
      view.changeMin = next.s
    } else if (state.current!.e <= 1440) {
      view.sub = "До кінця доби"
    } else {
      view.sub = "До кінця завтрашнього дня"
    }
  } else if (state.kind === "check") {
    view.title = "Графік змінився"
    view.sub = "Перевірте сайт обленерго"
  } else {
    view.title = "Графіка немає"
    view.sub = "На сьогодні не опубліковано"
  }
  if (view.changeMin !== null) view.short = hm(view.changeMin % 1440)
  return view
}

// Момент зміни стану як дата: хвилини доби від «зараз» до зміни.
export function changeDate(view: View, now: Now, date: Date): Date {
  const base = new Date(date.getTime())
  base.setSeconds(0, 0)
  return new Date(base.getTime() + ((view.changeMin ?? now.min) - now.min) * 60000)
}

// Таймер показуємо, лише коли зміна менш ніж за добу.
export function hasTimer(view: View, now: Now): boolean {
  return view.changeMin !== null && view.changeMin - now.min < 1440
}

// Другий рядок на екрані блокування, коли таймера немає. Повний графік тут не потрібен.
export function lockLine(view: View): string {
  if (view.kind === "on") return view.tomorrowRuns ? "Сьогодні й завтра без відключень" : "Сьогодні більше без відключень"
  return view.sub
}

// Підпис над великим часом: «світло до» 23:30. Після зміни він лишається правдою, навіть якщо iOS не встигла перемалювати.
export function changeVerb(view: View): string {
  const verb = ({ on: "світло до", off: "без світла до", maybe: "можливо до" } as Record<string, string>)[view.kind] || ""
  return view.changeMin !== null && view.changeMin >= 1440 ? `${verb} завтра` : verb
}

export function lockVerb(view: View): string {
  return ({ on: "Світло до", off: "Без світла до", maybe: "Можливо до" } as Record<string, string>)[view.kind] || ""
}

export function lockTitle(view: View): string {
  if (view.changeMin === null) return view.title
  return `${lockVerb(view)} ${view.short}${view.changeMin >= 1440 ? " завтра" : ""}`
}

export function isCharging(view: View): boolean {
  return view.kind === "off" || view.kind === "maybe"
}

// Що писати замість часу, коли наступної зміни немає.
export function quietWords(view: View): string {
  if (view.kind === "on") return "Без\nвідключень"
  return isCharging(view) ? "До кінця\nдоби" : view.title
}

// Частка поточного відрізка: зі світлом батарея розряджається до вимкнення, без нього заряджається до ввімкнення.
export function batteryLevel(view: View): number {
  if (view.changeMin === null || view.runFrom === null) return view.kind === "on" ? 1 : 0
  const left = (view.changeMin - view.nowMin) / (view.changeMin - view.runFrom)
  return isCharging(view) ? 1 - left : left
}

export function captionText(view: View): string {
  const group = view.group ? `Черга ${view.group}` : "Графік світла"
  return view.kind === "on" || view.kind === "off" || view.kind === "maybe" ? `${group} · за графіком` : group
}

// ---------- Сьогодні чи завтра ----------
// Малий і середній віджет кнопкою «Завтра ›» показують графік на завтра. Вибір зберігається разом із часом натискання.

export type DayChoice = { tomorrow: boolean; at: number; ymd: string }
export type DayMode = { tomorrow: boolean; until: number | null; quick: boolean }

// Завтра показуємо лише того самого дня й не довше за SETTINGS.tomorrowHoldMinutes: опівночі «завтра» стає «сьогодні»,
// а забутий перемикач не ховає поточний стан надовго. quick: натискання щойно було, тож малюємо без мережі.
export function dayMode(choice: DayChoice | null, now: Now, nowMs: number): DayMode {
  if (!choice || typeof choice.at !== "number") return { tomorrow: false, until: null, quick: false }
  const age = nowMs - choice.at
  const quick = age >= 0 && age < SETTINGS.dayTapQuickSeconds * 1000
  const until = choice.at + SETTINGS.tomorrowHoldMinutes * 60000
  const tomorrow = choice.tomorrow === true && choice.ymd === now.ymd && age >= 0 && nowMs < until
  return { tomorrow, until: tomorrow ? until : null, quick }
}

// Графік на завтра вже опубліковано: тоді й зʼявляється «Завтра ›».
export function hasTomorrow(view: View): boolean {
  return view.tomorrowRuns !== null
}

// Завтра показують лише малий і середній віджет: великий і так має обидва дні, а на екрані блокування кнопок немає.
export function tomorrowShown(mode: DayMode, view: View, family: string): boolean {
  return mode.tomorrow && hasTomorrow(view) && (family === "systemSmall" || family === "systemMedium")
}

// Коли перемалювати віджет: як завжди, а коли показано завтра, ще й щойно мине SETTINGS.tomorrowHoldMinutes,
// щоб віджет сам повернувся на сьогодні.
export function widgetReloadDate(view: View, now: Now, date: Date, mode: DayMode, tomorrow: boolean): Date {
  const next = refreshDate(view, now, date).getTime()
  return new Date(tomorrow && mode.until !== null ? Math.min(next, mode.until + 1000) : next)
}

// «1 відключення», «3 відключення», «5 відключень».
export function outagesWord(n: number): string {
  const one = n % 10 === 1 && n % 100 !== 11
  const few = n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)
  return one || few ? "відключення" : "відключень"
}

// «3 відключення · 9 год», «Без відключень».
export function tomorrowSummary(view: View): string {
  if (!view.tomorrowRuns) return "Графіка ще немає"
  const windows = view.tomorrowWindows || []
  if (!windows.length) return "Без відключень"
  const total = windows.reduce((sum, w) => sum + (w.e - w.s), 0)
  return `${windows.length} ${outagesWord(windows.length)} · ${durationText(total)}`
}

const MONTH_NAMES = ["січня", "лютого", "березня", "квітня", "травня", "червня", "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"]

// «12 листопада».
export function dateWords(ymd: string): string {
  const [, m, d] = ymd.split("-").map(Number)
  return `${d} ${MONTH_NAMES[m - 1]}`
}

// Коли iOS варто знову намалювати віджет: за 10 секунд після зміни стану, а між змінами раз на 30 хвилин
// (з датчиком СвітлоБота раз на 15, щоб фактичний стан не відставав).
export function refreshDate(view: View, now: Now, date: Date): Date {
  const minutes = view.fact ? SETTINGS.factRefreshMinutes : SETTINGS.refreshMinutes
  const latest = date.getTime() + minutes * 60000
  if (view.changeMin === null) return new Date(latest)
  return new Date(Math.min(latest, changeDate(view, now, date).getTime() + 10000))
}

// ---------- Години для малюнків ----------
// Кожна клітинка, вікно чи лампочка це одна година. Частину години зафарбовано точно за графіком.

export type Part = { from: number; to: number; st: Status }

// Години from..to, поділені за станом. Те, чого немає в графіку, вважаємо невідомим.
export function partsOf(runs: Run[], from: number, to: number): Part[] {
  const parts: Part[] = []
  let cursor = from
  for (const run of runs) {
    const s = Math.max(run.s, from)
    const e = Math.min(run.e, to)
    if (e <= s) continue
    if (s > cursor) parts.push({ from: cursor, to: s, st: "unknown" })
    parts.push({ from: s, to: e, st: run.st })
    cursor = e
  }
  if (cursor < to) parts.push({ from: cursor, to, st: "unknown" })
  return parts
}

export function hourParts(runs: Run[], hour: number): Part[] {
  return partsOf(runs, hour * 60, (hour + 1) * 60)
}

export function currentHour(nowMin: number | null): number {
  return nowMin === null ? -1 : Math.floor(nowMin / 60)
}

// ---------- Вигляди ----------

export const LOOKS: Record<string, { name: string }> = {
  house: { name: "Будинок" },
  tiles: { name: "Плитки" },
  garland: { name: "Гірлянда" },
  battery: { name: "Батарея" },
  ring: { name: "Кільце" },
}
export const DEFAULT_LOOK = "house"
// Екран блокування: замість батареї лампочка (09.11.2026, на прохання користувача). Повний графік там зайвий.
export const LOCK_LOOKS: Record<string, { name: string }> = {
  bulb: { name: "Лампочка" },
  house: { name: "Будинок" },
  tiles: { name: "Плитки" },
  garland: { name: "Гірлянда" },
  ring: { name: "Кільце" },
}
export const DEFAULT_LOCK_LOOK = "bulb"

export function lockLookOf(id: string | null | undefined): string {
  if (id === "battery") return "bulb"
  return id && LOCK_LOOKS[id] ? id : DEFAULT_LOCK_LOOK
}

// Лампочка світиться, коли світло є: за датчиком, а без нього за графіком. Без світла перекреслена.
export function bulbState(view: View): "on" | "off" | "maybe" {
  const fact = view.fact
  if (fact && (fact.kind === "on" || fact.kind === "off")) return fact.kind
  if (view.kind === "on") return "on"
  if (view.kind === "off") return "off"
  return "maybe"
}

export function lookOf(id: string | null | undefined, fallback: string): string {
  return id && LOOKS[id] ? id : fallback
}

// ---------- Сповіщення ----------
// Лише три види: графік змінився, за 10 хвилин до відключення, за 10 хвилин до ввімкнення.

export type Planned = { id: string; kind: "off" | "on"; triggerMin: number; title: string; body: string }

type Outage = { s: number; e: number; maybe: boolean; endKnown: boolean }

// Відключення й можливі відключення поспіль це одне знеструмлення. Кінець відомий, лише якщо після нього є світло.
function outagesOf(sched: Sched, now: Now): Outage[] {
  const line = timeline(sched, now.ymd)
  const out: Outage[] = []
  for (let i = 0; i < line.length; i++) {
    const run = line[i]
    if (run.st !== "off" && run.st !== "maybe") continue
    const last = out[out.length - 1]
    if (last && last.e === run.s) {
      // Однакові стани timeline уже злила, тож поруч лише відключення й можливе: разом це відключення.
      last.e = run.e
      last.maybe = false
    } else {
      out.push({ s: run.s, e: run.e, maybe: run.st === "maybe", endKnown: false })
    }
  }
  for (const outage of out) {
    const after = line.find((r) => r.s === outage.e)
    outage.endKnown = !!after && after.st === "on"
  }
  return out
}

function dayOfMinute(now: Now, min: number): string {
  return min >= 1440 ? addDays(now.ymd, 1) : now.ymd
}

export function plannedNotifications(sched: Sched, now: Now, group: string, prefs: { off: boolean; on: boolean }): Planned[] {
  const lead = SETTINGS.noticeMinutes
  const items: Planned[] = []
  for (const outage of outagesOf(sched, now)) {
    const startAt = outage.s - lead
    if (prefs.off && startAt > now.min) {
      const until = outage.endKnown ? `, увімкнуть ${whenText(outage.e)}` : ""
      items.push({
        id: `off-${dayOfMinute(now, outage.s)}-${outage.s % 1440}`,
        kind: "off",
        triggerMin: startAt,
        title: outage.maybe ? `Через ${lead} хв можливе відключення` : `Через ${lead} хв вимкнуть світло`,
        body: `Черга ${group}: ${outage.maybe ? "можливе відключення" : "відключення"} ${whenText(outage.s)}${until}`,
      })
    }
    const endAt = outage.e - lead
    if (prefs.on && outage.endKnown && endAt > now.min) {
      items.push({
        id: `on-${dayOfMinute(now, outage.e)}-${outage.e % 1440}`,
        kind: "on",
        triggerMin: endAt,
        title: `Через ${lead} хв увімкнуть світло`,
        body: `Черга ${group}: світло ${whenText(outage.e)}`,
      })
    }
  }
  return items.sort((a, b) => a.triggerMin - b.triggerMin)
}

// Відомі вікна відключень за датами. Дата, що зникла з даних, лишається такою, як була:
// інакше перемикання між джерелами давало б хибне «графік змінився».
export type Known = Record<string, [number, number, Status][]>

export function knownWindows(prev: Known | null, sched: Sched, now: Now): Known {
  const out: Known = {}
  for (const ymd of [now.ymd, addDays(now.ymd, 1)]) {
    const day = sched.days[ymd]
    if (day && day.status === "ok" && day.runs.length) out[ymd] = windowsOf(day).map((w) => [w.s, w.e, w.st])
    else if (prev && prev[ymd]) out[ymd] = prev[ymd]
  }
  return out
}

export type Change = { ymd: string; windows: Run[]; isNew: boolean }

// Перше завантаження нічого не повідомляє. Минулі години сьогодні не рахуються:
// виправлення того, що вже минуло, нікому не цікаве.
export function scheduleChanges(prev: Known | null, next: Known, now: Now): Change[] {
  if (!prev) return []
  const changes: Change[] = []
  for (const ymd of Object.keys(next).sort()) {
    const cut = ymd === now.ymd ? now.min : -1
    const after = next[ymd].filter((w) => w[1] > cut)
    const runs = after.map(([s, e, st]) => ({ s, e, st }))
    const before = prev[ymd]
    if (!before) {
      changes.push({ ymd, windows: runs, isNew: true })
      continue
    }
    const was = before.filter((w) => w[1] > cut)
    if (JSON.stringify(was) !== JSON.stringify(after)) changes.push({ ymd, windows: runs, isNew: false })
  }
  return changes
}

export function changeMessage(changes: Change[], now: Now, group: string): { title: string; body: string } | null {
  if (!changes.length) return null
  const onlyNew = changes.every((c) => c.isNew)
  const parts = changes.map((c) => {
    const day = c.ymd === now.ymd ? "сьогодні" : "завтра"
    const list = c.windows.length ? c.windows.map(windowText).join(", ") : "без відключень"
    return `${day}: ${list}`
  })
  return {
    title: onlyNew ? "Новий графік відключень" : "Графік відключень змінився",
    body: `Черга ${group}, ${parts.join("; ")}`,
  }
}

// ---------- Фактичний стан: датчик СвітлоБота ----------
// Графік каже, коли світло мають вимкнути, а датчик, чи воно є насправді. Датчик це телефон на зарядці чи роутер,
// що щохвилини стукає до СвітлоБота (svitlobot.in.ua). Обирають його канал: свій або сусідів.
// Джерела: відкритий список каналів (стан і час останньої зміни кожного) і публічна сторінка каналу в Telegram,
// де бот сам пише «Світло з'явилося … Його не було 3год 17хв».

export const SVITLOBOT = {
  list: "https://api.svitlobot.in.ua/website/getChannelsForMap",
  howTo: "https://svitlobot.in.ua/instructions",
  posts: (channel: string) => `https://t.me/s/${channel}`,
}

export type FactStatus = "on" | "off" | "unknown"
// queue: як СвітлоБот підписує розклад датчика («Запорізька обл. — група 3.2», у Києві «Група 4.1»), null якщо не обрано.
export type Channel = { id: string; name: string; status: FactStatus; since: number | null; users: number; queue: string | null }

// Список для мапи: -1;&&&;стан;&&&;час зміни (UTC);&&&;назва;&&&;канал;&&&;кількість;&&&;широта;&&&;довгота;&&&;…;&&&;розклад;&&&;…
// Короткий список: стан;&;час зміни;&;назва;&;канал;&;кількість. Стан 1: світло є, 2: світла немає, інше: датчик мовчить.
export function parseChannels(text: string): Channel[] {
  const out: Channel[] = []
  for (const line of text.split("\n")) {
    let f: string[]
    let queue: string | null = null
    if (line.includes(";&&&;")) {
      const m = line.split(";&&&;")
      if (m.length < 6) continue
      f = m.slice(1, 6)
      const q = (m[9] || "").trim()
      queue = q && q !== "-" ? q : null
    } else {
      f = line.split(";&;")
      if (f.length < 5) continue
    }
    const id = f[3].trim()
    if (!/^[A-Za-z0-9_]+$/.test(id)) continue
    const code = parseInt(f[0].trim(), 10)
    const since = Date.parse(f[1].trim())
    out.push({
      id,
      name: f[2].trim().replace(/\s*,?\s*->\s*/g, ", "),
      status: code === 1 ? "on" : code === 2 ? "off" : "unknown",
      since: Number.isFinite(since) ? since : null,
      users: Math.max(0, (parseInt(f[4].trim(), 10) || 0) - 1),
      queue,
    })
  }
  return out
}

// Як СвітлоБот називає регіон у розкладі датчика. Київ без префікса («Група 4.1»).
const SVITLOBOT_REGIONS: Record<string, string> = {
  zaporizhzhia: "Запорізька обл.", kyiv: "", "kyiv-oblast": "Київська обл.", "dnipro-dnem": "Дніпро (ДТЕК)",
  "dnipro-cek": "Дніпро (ЦЕК)", odesa: "Одеса та обл.", vinnytsia: "Вінницька обл.", cherkasy: "Черкаська обл.",
  chernihiv: "Чернігівська обл.", kharkiv: "Харківська обл.", khmelnytskyi: "Хмельницька обл.", lviv: "Львівська обл.",
  poltava: "Полтавська обл.", "ivano-frankivsk": "Івано-Франківська обл.", rivne: "Рівненська обл.",
  ternopil: "Тернопільська обл.", zakarpattia: "Закарпатська обл.", zhytomyr: "Житомирська обл.",
}

// Чи датчик стоїть у цій черзі цього регіону.
export function inQueue(ch: Channel, region: string, group: string): boolean {
  if (!ch.queue || !(region in SVITLOBOT_REGIONS)) return false
  const m = /(\d+)[.,](\d+)/.exec(ch.queue)
  if (!m || `${m[1]}.${m[2]}` !== group) return false
  const prefix = SVITLOBOT_REGIONS[region]
  return prefix ? ch.queue.startsWith(prefix) : /^Група\s/.test(ch.queue)
}

export const queueId = (region: string, group: string) => `queue:${region}:${group}`
export const isQueueFact = (fact: { channel: string }) => fact.channel.startsWith("queue:")

export type QueueCount = { on: number; off: number; total: number }

// Без власного датчика: усі датчики СвітлоБота з черги користувача. Стан той, що в більшості (від 60 %),
// час зміни медіанний серед них; інакше «по-різному». Датчиків немає: null.
export function queueChannel(list: Channel[], region: string, group: string): { channel: Channel; count: QueueCount } | null {
  const sensors = list.filter((c) => inQueue(c, region, group))
  const on = sensors.filter((c) => c.status === "on")
  const off = sensors.filter((c) => c.status === "off")
  const total = on.length + off.length
  if (!total) return null
  const status: FactStatus = on.length >= total * 0.6 ? "on" : off.length >= total * 0.6 ? "off" : "unknown"
  const pool = status === "on" ? on : status === "off" ? off : []
  const times = pool.map((c) => c.since).filter((t): t is number => t !== null).sort((a, b) => a - b)
  return {
    channel: { id: queueId(region, group), name: `черга ${group}`, status, since: times.length ? times[Math.floor(times.length / 2)] : null, users: total, queue: null },
    count: { on: on.length, off: off.length, total },
  }
}

// Посилання, «@назва» чи сама назва каналу: лишаємо назву.
export function channelId(input: string): string {
  const s = input.trim().replace(/^https?:\/\//i, "").replace(/^(www\.)?(t|telegram)\.me\/(s\/)?/i, "").replace(/^@/, "")
  const id = s.split(/[/?#\s]/)[0]
  return /^[A-Za-z0-9_]{4,64}$/.test(id) ? id : ""
}

export function findChannel(list: Channel[], id: string): Channel | null {
  const key = id.toLowerCase()
  return list.find((c) => c.id.toLowerCase() === key) || null
}

function searchWords(text: string): string {
  return text.toLowerCase().replace(/[’'ʼ`]/g, "").replace(/[^0-9a-zа-яіїєґё_]+/g, " ").trim()
}

// Пошук за вулицею, будинком чи назвою каналу: кожне слово запиту має знайтися. Більші канали вище.
export function searchChannels(list: Channel[], query: string, limit = 8): Channel[] {
  const wanted = searchWords(query).split(" ").filter(Boolean)
  if (!wanted.length) return []
  const direct = channelId(query).toLowerCase()
  return list
    .filter((c) => (direct && c.id.toLowerCase() === direct) || wanted.every((w) => searchWords(`${c.name} ${c.id}`).includes(w)))
    .sort((a, b) => b.users - a.users)
    .slice(0, limit)
}

// «3год 17хв», «6хв», «1д 2год» → хвилини.
export function durationMin(text: string): number | null {
  const d = /(\d+)\s*д/.exec(text)
  const h = /(\d+)\s*год/.exec(text)
  const m = /(\d+)\s*хв/.exec(text)
  if (!d && !h && !m) return null
  return (d ? Number(d[1]) * 1440 : 0) + (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0)
}

function plainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#39;|&apos;|&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
}

export type Comeback = { at: number; offMin: number }

// Дописи бота на t.me/s/канал: «🟢 10:10 Світло з'явилося 🕓 Його не було 3год 17хв» і час допису.
export function parseComebacks(html: string): Comeback[] {
  const out: Comeback[] = []
  const re = /tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>[\s\S]*?<time datetime="([^"]+)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const text = plainText(m[1])
    if (!/Світло з.явилося/.test(text)) continue
    const gone = /не було\s*([0-9\sдгохв]+)/.exec(text)
    const offMin = gone ? durationMin(gone[1]) : null
    const at = Date.parse(m[2])
    if (offMin !== null && Number.isFinite(at)) out.push({ at, offMin })
  }
  return out
}

// Допис бота про зміну стану: «🔴 06:53 Світло зникло …» чи «🟢 10:10 Світло з'явилося … Його не було 3год 17хв».
export type StatusPost = { at: number; status: "on" | "off"; since: number; offMin: number | null }

// Власний канал працює одразу, без модерації СвітлоБота: стан беремо з його дописів на t.me/s/канал.
// Час зміни — з тексту (за Києвом), бо бот пише допис на кілька хвилин пізніше; дата — з часу допису.
export function parseStatusPosts(html: string): StatusPost[] {
  const out: StatusPost[] = []
  const re = /tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>[\s\S]*?<time datetime="([^"]+)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const text = plainText(m[1])
    const s = /(\d{1,2}):(\d{2})\s*Світло (зникло|з.явилося)/.exec(text)
    const at = Date.parse(m[2])
    if (!s || !Number.isFinite(at)) continue
    const on = s[3] !== "зникло"
    let back = kyivParts(new Date(at)).min - (Number(s[1]) * 60 + Number(s[2]))
    if (back < 0) back += 1440 // зміна до півночі, допис після
    const gone = on ? /не було\s*([0-9\sдгохв]+)/.exec(text) : null
    out.push({ at, status: on ? "on" : "off", since: Math.floor(at / 60000) * 60000 - back * 60000, offMin: gone ? durationMin(gone[1]) : null })
  }
  return out
}

// Факт власного каналу з останнього допису про зміну стану. «Скільки не було» бот пише сам;
// якщо ні, рахуємо від попереднього допису «зникло». Дописів про світло немає: null.
export function postsFact(posts: StatusPost[], id: string, name: string, nowMs: number): Fact | null {
  if (!posts.length) return null
  const sorted = posts.slice().sort((a, b) => a.since - b.since)
  const last = sorted[sorted.length - 1]
  let lastOffMin: number | null = null
  if (last.status === "on") {
    const before = sorted.filter((p) => p.status === "off" && p.since < last.since).pop()
    lastOffMin = last.offMin !== null ? last.offMin : before ? Math.round((last.since - before.since) / 60000) : null
  }
  return {
    channel: id, name, status: last.status, since: last.since, lastOffMin, lastOffEnd: lastOffMin !== null ? last.since : null,
    postsFor: last.since, checkedAt: nowMs,
  }
}

export type Fact = {
  channel: string
  name: string
  status: FactStatus | "missing" // missing: каналу вже немає в списку
  since: number | null // коли змінився стан
  lastOffMin: number | null // скільки не було світла минулого разу (коли воно вже є)
  lastOffEnd: number | null // коли те відключення скінчилося
  postsFor: number | null // для якої зміни вже шукали тривалість у дописах каналу
  checkedAt: number
  count?: QueueCount | null // лише для черги: скільки датчиків зі світлом і без
}

// Новий стан датчика разом із попереднім: якщо бачили початок відключення, тривалість точна.
// У черзі медіанний час зміни трохи гуляє між перевірками, тож те саме ввімкнення — у межах 30 хвилин.
export function mergeFact(prev: Fact | null, ch: Channel | null, id: string, nowMs: number): Fact {
  const same = prev && prev.channel.toLowerCase() === id.toLowerCase() ? prev : null
  let lastOffMin = same ? same.lastOffMin : null
  let lastOffEnd = same ? same.lastOffEnd : null
  const postsFor = same ? same.postsFor : null
  if (!ch) {
    return { channel: same ? same.channel : id, name: same ? same.name : id, status: "missing", since: null, lastOffMin, lastOffEnd, postsFor, checkedAt: nowMs }
  }
  if (ch.status === "on" && ch.since !== null) {
    if (same && same.status === "off" && same.since !== null && same.since < ch.since) {
      lastOffMin = Math.round((ch.since - same.since) / 60000)
      lastOffEnd = ch.since
    } else if (same && same.status === "on" && same.since !== null && Math.abs(ch.since - same.since) <= 30 * 60000) {
      // те саме ввімкнення: тривалість лишається
    } else if (lastOffEnd !== ch.since) {
      lastOffMin = null
      lastOffEnd = null
    }
  }
  return { channel: ch.id, name: ch.name, status: ch.status, since: ch.since, lastOffMin, lastOffEnd, postsFor, checkedAt: nowMs }
}

// Факт для черги, з тією самою памʼяттю про тривалість, що й для одного датчика.
export function queueFact(prev: Fact | null, list: Channel[], region: string, group: string, nowMs: number): Fact | null {
  const q = queueChannel(list, region, group)
  return q ? { ...mergeFact(prev, q.channel, q.channel.id, nowMs), count: q.count } : null
}

// Світло повернулося, а початку відключення не бачили: тривалість шукаємо в дописах каналу, один раз на зміну.
// У черзі одного каналу немає, тож там не шукаємо.
export function needsPosts(fact: Fact): boolean {
  return !isQueueFact(fact) && fact.status === "on" && fact.since !== null && fact.lastOffMin === null && fact.postsFor !== fact.since
}

export function withComeback(fact: Fact, comebacks: Comeback[]): Fact {
  const out: Fact = { ...fact, postsFor: fact.since }
  if (fact.status !== "on" || fact.since === null || fact.lastOffMin !== null) return out
  const since = fact.since
  const hit = comebacks.find((c) => Math.abs(c.at - since) <= 10 * 60000)
  return hit ? { ...out, lastOffMin: hit.offMin, lastOffEnd: since } : out
}

export type FactView = {
  kind: FactStatus | "missing"
  full: string // для налаштувань: «Світло є з 10:10 · не було 3 год 17 хв»
  line: string // для віджета: «Світло є · не було 3 год 17 хв»
  short: string // для тісних місць: «не було 3 год 17 хв»
  timerFrom: number | null // від цього моменту рахує живий таймер, поки світла немає
  checked: string | null // дані датчика старі: коли перевіряли востаннє
}

// «3 год 17 хв», «45 хв», «2 дн 3 год».
export function durationText(min: number): string {
  if (min < 60) return `${min} хв`
  const d = Math.floor(min / 1440)
  const h = Math.floor((min % 1440) / 60)
  const m = min % 60
  if (d) return h ? `${d} дн ${h} год` : `${d} дн`
  return m ? `${h} год ${m} хв` : `${h} год`
}

// Момент за Києвом: сьогодні «06:53», інший день «08.11 06:53».
export function sinceText(ms: number, now: Now): string {
  const p = kyivParts(new Date(ms))
  if (p.ymd === now.ymd) return hm(p.min)
  return `${p.ymd.slice(8, 10)}.${p.ymd.slice(5, 7)} ${hm(p.min)}`
}

export function factView(fact: Fact | null | undefined, now: Now, nowMs: number): FactView | null {
  if (!fact) return null
  const old = nowMs - fact.checkedAt > SETTINGS.factStaleMinutes * 60000
  const checked = old ? `дані ${sinceText(fact.checkedAt, now)}` : null
  if (fact.status === "missing") {
    return {
      kind: "missing",
      full: "Немає даних від датчика: канал ще не писав про світло або назву введено з помилкою",
      line: "Немає даних від датчика",
      short: "датчик ?",
      timerFrom: null,
      checked,
    }
  }
  const when = fact.since !== null ? sinceText(fact.since, now) : null
  // Для черги в налаштуваннях видно, за скількома датчиками.
  const count = isQueueFact(fact) ? fact.count || null : null
  const source = count ? ` (за ${count.total} ${count.total % 10 === 1 && count.total % 100 !== 11 ? "датчиком" : "датчиками"} черги)` : ""
  if (fact.status === "on") {
    const gone = fact.lastOffMin !== null && fact.lastOffMin > 0 ? `не було ${durationText(fact.lastOffMin)}` : null
    const since = when ? `Світло є з ${when}` : "Світло є"
    return {
      kind: "on",
      full: (gone ? `${since} · ${gone}` : since) + source,
      line: gone ? `Світло є · ${gone}` : since,
      short: gone || (when ? `є з ${when}` : "світло є"),
      timerFrom: null,
      checked,
    }
  }
  if (fact.status === "off") {
    const line = when ? `Світла немає з ${when}` : "Світла немає"
    return { kind: "off", full: line + source, line, short: when ? `немає з ${when}` : "світла немає", timerFrom: old ? null : fact.since, checked }
  }
  if (count) {
    return {
      kind: "unknown",
      full: `У черзі по-різному: світло є в ${count.on} з ${count.total}`,
      line: `У черзі по-різному: ${count.on} з ${count.total}`,
      short: "по-різному",
      timerFrom: null,
      checked,
    }
  }
  const line = when ? `Датчик мовчить з ${when}` : "Датчик мовчить"
  return { kind: "unknown", full: line, line, short: "датчик мовчить", timerFrom: null, checked }
}
