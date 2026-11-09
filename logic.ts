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
  widgetBudgetMs: 18000, // скільки часу віджет може витратити на всі джерела
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
}

export function notifyPrefs(cfg: Config): { change: boolean; off: boolean; on: boolean } {
  return { change: cfg.notifyChange !== false, off: cfg.notifyOff !== false, on: cfg.notifyOn !== false }
}
export type Data = { sched: Sched | null; status: "ok" | "nogroup" | "fail" }
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

// Коли iOS варто знову намалювати віджет: за 10 секунд після зміни стану, а між змінами раз на 30 хвилин.
export function refreshDate(view: View, now: Now, date: Date): Date {
  const latest = date.getTime() + SETTINGS.refreshMinutes * 60000
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
export const DEFAULT_LOCK_LOOK = "battery" // на екрані блокування повний графік зайвий

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
