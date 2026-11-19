// Сторінка скрипта: три вкладки, як у «Маяку» для Android. «Світло» — головна картка стану, години відключень,
// черга, датчик, сповіщення й друга адреса; «Тривога» — картка тривоги й її налаштування; «Віджет» — вигляд,
// фон, як додати віджет і що означають його кнопки. Зміни одразу видно у віджеті.
import {
  Navigation, NavigationStack, List, Section, Text, TextField, Button, Picker, Toggle, Link, Script, Widget, useEffect, useState,
  TabView, Label, VStack, HStack, ZStack, Spacer, Image, Circle, Rectangle, RoundedRectangle, TimerIntervalLabel, DateLabel,
} from "scripting"
import type { VirtualNode, WidgetFamily } from "scripting"
import type { Channel, Config, Data, Fact, FactStatus, Run } from "./logic"
import type { View } from "./logic"
import {
  DEFAULT_LOOK, FIRST_NAME, LOCK_LOOKS, LOOKS, REGIONS, SECOND_NAME, SETTINGS, SVITLOBOT, URLS, VERSION, ZOE_GROUPS, addressesOf, buildView,
  changeDate, channelId, hasTimer, hm, kyivParts, lockLookOf, lookOf, notifyPrefs, regionById, searchChannels, windowText,
} from "./logic"
import type { AlertSettings, AlertStatus, Location, Place } from "./alerts"
import { ALERTS, active, alertShortTitle, channelName, cleanPlace, defaultOblasts, oblastForRegion } from "./alerts"
import type { IconTok, Ink } from "./theme"
import { STYLE_IDS, STYLE_NAMES, alertGlyph, alertIcon, alertPage, autoTokens, gradient, styleOf } from "./theme"
import type { AlertBundle } from "./store"
import {
  cachedAlerts, cachedData, cachedFact, cachedLocations, checkChannel, clearCache, freshAlerts, freshAll, getFact, loadChannels, loadGroups,
  loadLocations, readAlerts, readConfig, writeAlerts, writeConfig,
} from "./store"
import { forgetSecond, resetNotifications, tryUpdateNotifications } from "./notifications"

const REPO = "https://github.com/gorbachovm242-stack/grafik-svitla"
const PRIVACY = "https://github.com/gorbachovm242-stack/grafik-svitla/blob/main/PRIVACY.md"

// ---------- Тексти ----------

const QUEUE_HINT = "Точніше покаже датчик саме вашого будинку: знайдіть його за вулицею або вставте посилання на канал."
const NO_SENSORS =
  "У вашій черзі поки немає датчиків СвітлоБота. Знайдіть датчик свого будинку чи сусідів за вулицею, вставте посилання на канал або поставте свій."
const NOT_FOUND =
  "Нічого не знайдено. Новий датчик зʼявляється в пошуку лише після перевірки СвітлоБотом (кілька днів), а свій канал можна підключити одразу: вставте посилання t.me/svitlobot_…"
const MARKS: Record<FactStatus, string> = { on: "🟢", off: "🔴", unknown: "⚪️" }

const SECOND_ABOUT = "Батьки, робота чи дача: віджет і попередження ще для однієї черги."
const SECOND_WIDGET = "Щоб віджет показував другу адресу: утримуйте віджет → «Змінити віджет» → у полі Parameter напишіть 2."
const NOTIFY_HINT = "Попередження приходять про обидві адреси, з назвою на початку. Щоб проходили крізь «Зосередження», увімкніть у Параметрах iPhone → Сповіщення → Scripting «Чутливі до часу»."

const ALERTS_OFF = "Віджет покаже, чи є повітряна тривога у вашій громаді, з якого часу й що летить."
const ALERTS_RAIL = "Праворуч у віджеті зʼявиться стовпчик значків: торкніться значка тривоги, щоб побачити її докладно, і значка світла, щоб повернутися."
const ALERTS_ABOUT = "Оберіть свою громаду: у великих містах тривогу часто оголошують окремо від області."
const CHANNEL_HINT =
  "Публічний канал, де пишуть, що летить і куди. Віджет показує його дописи за останню годину, дослівно й з часом. Канали помиляються й запізнюються; закриті групи не підходять."
const ALERTS_LIMITS =
  "Коли оновити віджет, iPhone вирішує сам: зазвичай раз на 15–30 хвилин. «↻» у віджеті оновлює одразу. Сирени віджет не подасть — для цього офіційний застосунок."
const ALERTS_SOURCE = "Дані: alerts.in.ua через сервер-посередник «Маяка». Телефон отримує всі тривоги й сам обирає ваші: місце нікуди не надсилається."

const STYLE_HINT =
  "«Напівпрозорий» видно, коли в налаштуваннях віджета Scripting увімкнено прозорий фон. «Як система» вдень світлий, а в темній темі iPhone нічний."
const ABOUT =
  "Неофіційний скрипт: не повʼязаний з обленерго, ДТЕК, Укренерго чи державними органами. Важливе перевіряйте на сайті свого обленерго. Даних про вас скрипт не збирає."

const PREVIEWS: [WidgetFamily, string, string][] = [
  ["systemSmall", "Малий", "square"],
  ["systemMedium", "Середній", "rectangle"],
  ["systemLarge", "Великий", "square.fill"],
  ["accessoryRectangular", "Екран блокування", "lock.rectangle"],
]

const HOME_STEPS = [
  "Утримуйте порожнє місце на робочому екрані → «Редагувати» → «Додати віджет».",
  "Знайдіть Scripting, оберіть розмір і додайте.",
  "Утримуйте віджет → «Змінити віджет» → Script: «Графік світла».",
]
const LOCK_STEPS = [
  "Утримуйте екран блокування → «Налаштувати» → «Екран блокування».",
  "Торкніться поля віджетів і додайте Scripting.",
  "Торкніться доданого віджета й оберіть «Графік світла».",
]
const READING: [string, string][] = [
  ["Будинок і плитки", "кожне вікно — година, день читається зверху вниз; жовті горять, темні без світла, рамка — зараз"],
  ["Гірлянда", "24 лампочки: верхній дріт 0–12, нижній 12–24"],
  ["Батарея", "зі світлом розряджається до відключення, без світла заряджається до ввімкнення"],
  ["Кільце", "24 години по колу, північ угорі, крапка — зараз"],
]

// ---------- Кольори сторінки ----------
// Пари { light, dark }: сторінка Scripting сама світла чи темна разом з iPhone.

const T = autoTokens()

type Paint = { bg0: Ink; bg1: Ink; ink: Ink; soft: Ink; dark: boolean }

// Головна картка світла за станом, як у застосунку для Android: сонячна зі світлом, темно-синя без нього.
function heroPaint(kind: string): Paint {
  switch (kind) {
    case "on":
      return { bg0: { light: "#FFF8E7", dark: "#3A3322" }, bg1: { light: "#FFE4A6", dark: "#2A2415" }, ink: { light: "#1C1F33", dark: "#FFF4DA" }, soft: { light: "#50556F", dark: "#D9C9A0" }, dark: false }
    case "off":
      return { bg0: "#3E4378", bg1: "#262A55", ink: "#FFFFFF", soft: "#CDD0F0", dark: true }
    case "maybe":
    case "check":
      return { bg0: { light: "#FFF7EB", dark: "#3A2A1A" }, bg1: { light: "#FFE5C6", dark: "#2A1E12" }, ink: { light: "#1C1F33", dark: "#FFEFE0" }, soft: { light: "#50556F", dark: "#D9BFA6" }, dark: false }
    default:
      return { bg0: { light: "#FFFFFF", dark: "#232741" }, bg1: { light: "#F1F2F8", dark: "#14172A" }, ink: { light: "#1C1F33", dark: "#F3F4FF" }, soft: { light: "#50556F", dark: "#B5B9D6" }, dark: false }
  }
}

function Background({ bg0, bg1 }: { bg0: Ink; bg1: Ink }) {
  return <Rectangle fill={gradient([bg0, bg1], "top", "bottom")} />
}

// ---------- Частини ----------

// Смуга доби: 48 пів годин однакової ширини, поточна обведена; під нею години.
function DayStrip({ runs, nowMin, paint }: { runs: Run[]; nowMin: number | null; paint: Paint }) {
  const color = (st: string): Ink => {
    if (st === "on") return "#FFC83F"
    if (st === "off") return paint.dark ? "#8A90CC" : { light: "#3E4470", dark: "#8A90CC" }
    if (st === "maybe") return "#E4CF98"
    return paint.dark ? "#4A4F86" : { light: "#E2E4EE", dark: "#4A4F86" }
  }
  const stateAt = (m: number) => (runs.find((r) => r.s <= m && m < r.e) || { st: "unknown" }).st
  const cells = Array.from({ length: 48 }, (_, i) => {
    const fill = color(stateAt(i * 30 + 15))
    const now = nowMin !== null && nowMin >= i * 30 && nowMin < i * 30 + 30
    return (
      <ZStack frame={{ maxWidth: "infinity", height: 16 }}>
        <RoundedRectangle cornerRadius={2.5} fill={fill} />
        {now ? <RoundedRectangle cornerRadius={2.5} stroke={{ shapeStyle: paint.ink, strokeStyle: { lineWidth: 2 } }} /> : null}
      </ZStack>
    )
  })
  const hour = (h: string) => <Text font={11} foregroundStyle={paint.soft}>{h}</Text>
  return (
    <VStack spacing={4}>
      <HStack spacing={1.5}>{cells}</HStack>
      <HStack spacing={0}>
        {hour("0")}
        <Spacer />
        {hour("6")}
        <Spacer />
        {hour("12")}
        <Spacer />
        {hour("18")}
        <Spacer />
        {hour("24")}
      </HStack>
    </VStack>
  )
}

// Значок стану, як у стовпчику віджета.
function StateIcon({ tok, glyph, size }: { tok: IconTok; glyph: string; size: number }) {
  return (
    <ZStack frame={{ width: size, height: size }}>
      <Circle fill={tok.fill} frame={{ width: size, height: size }} />
      {tok.rim ? <Circle stroke={{ shapeStyle: tok.rim, strokeStyle: { lineWidth: 1.5 } }} frame={{ width: size - 1.5, height: size - 1.5 }} /> : null}
      {tok.ring ? (
        <Circle
          stroke={{ shapeStyle: tok.ring, strokeStyle: { lineWidth: 2.5, dash: tok.dashed ? [size * 0.16, size * 0.12] : undefined } }}
          frame={{ width: size - 2.5, height: size - 2.5 }}
        />
      ) : null}
      <Image systemName={glyph} font={Math.round(size * 0.46)} fontWeight="bold" foregroundStyle={tok.glyph} />
    </ZStack>
  )
}

function Hint({ text }: { text: string }) {
  return <Text font={13} foregroundStyle="secondaryLabel">{text}</Text>
}

function Steps({ steps }: { steps: string[] }) {
  return (
    <VStack alignment="leading" spacing={8}>
      {steps.map((step, i) => (
        <HStack alignment="top" spacing={10}>
          <Text font={15} fontWeight="bold" foregroundStyle="#4347B5" frame={{ width: 16, alignment: "leading" }}>{String(i + 1)}</Text>
          <Text font={15}>{step}</Text>
        </HStack>
      ))}
    </VStack>
  )
}

function daysText(view: View, today: boolean): string {
  if (today) return view.todayWindows.length ? view.todayWindows.map(windowText).join(", ") : "без відключень"
  if (!view.tomorrowRuns) return "графіка ще немає"
  return (view.tomorrowWindows || []).map(windowText).join(", ") || "без відключень"
}

// Друга адреса бере сховище поруч із першою: її дані окремо, щоб сторінка показала їх ще до мережі.
function secondOf(cfg: Config | null): Config | null {
  return addressesOf(cfg)[1] ?? null
}

// Черги, які можна показати одразу, ще до мережі: у Запоріжжі список сталий, деінде хоча б обрана черга.
function initialGroups(regionId: string, current: string | null | undefined): string[] {
  if (regionById(regionId)?.official) return ZOE_GROUPS
  return current ? [current] : []
}

function findLocation(list: Location[], uid: string | null | undefined): Location | null {
  return uid ? list.find((l) => l.uid === uid) || null : null
}

// ---------- Сторінка ----------

function App() {
  const [tab, setTab] = useState(0)
  const [cfg, setCfg] = useState<Config | null>(readConfig())
  // Область не обрано, поки користувач не обере сам (раніше за замовчуванням стояло Запоріжжя).
  const [region, setRegion] = useState<string>(readConfig()?.region ?? "")
  const [groups, setGroups] = useState<string[]>(initialGroups(readConfig()?.region ?? "", readConfig()?.group))
  const [groupsError, setGroupsError] = useState<string | null>(null)
  // Збережене видно одразу, ще до мережі: без інтернету сторінка не порожня.
  const [data, setData] = useState<Data>(cachedData(readConfig()))
  const [loading, setLoading] = useState(false)
  const [fact, setFact] = useState<Fact | null>(cachedFact(readConfig()))
  const [factLoaded, setFactLoaded] = useState(false)
  const [query, setQuery] = useState("")
  const [channels, setChannels] = useState<Channel[] | null>(null)
  const [channelsError, setChannelsError] = useState<string | null>(null)
  // Друга адреса.
  const [data2, setData2] = useState<Data>(cachedData(secondOf(readConfig())))
  const [fact2, setFact2] = useState<Fact | null>(cachedFact(secondOf(readConfig())))
  const [region2, setRegion2] = useState<string>(readConfig()?.second?.region ?? readConfig()?.region ?? "")
  const [groups2, setGroups2] = useState<string[]>(initialGroups(readConfig()?.second?.region ?? "", readConfig()?.second?.group))
  const [groups2Error, setGroups2Error] = useState<string | null>(null)
  const [name2, setName2] = useState<string>(readConfig()?.second?.name ?? "")
  // Повітряна тривога.
  const [alertSet, setAlertSet] = useState<AlertSettings>(readAlerts())
  const [alertBundle, setAlertBundle] = useState<AlertBundle | null>(cachedAlerts(readAlerts()))
  const [alertLoading, setAlertLoading] = useState(false)
  const [locations, setLocations] = useState<Location[]>(cachedLocations() ?? defaultOblasts())
  const [channelInput, setChannelInput] = useState("")
  const [channelError, setChannelError] = useState<string | null>(null)

  async function refresh(next: Config | null, force: boolean) {
    if (!next) return
    setLoading(true)
    const date = new Date()
    const now = kyivParts(date)
    // Обидві адреси разом: сповіщення про обидві.
    const all = await freshAll(next, now, force, SETTINGS.appBudgetMs, SETTINGS.timeoutSeconds * 1000)
    setData(all[0].data)
    setFact(all[0].fact)
    setFactLoaded(true)
    setData2(all[1] ? all[1].data : { sched: null, status: "ok" })
    setFact2(all[1] ? all[1].fact : null)
    await tryUpdateNotifications(next, all.map((f) => f.data.sched), now, date, 4000)
    setLoading(false)
    Widget.reloadAll()
  }

  async function refreshAlerts(next: AlertSettings, force: boolean) {
    if (!next.enabled) return
    setAlertLoading(true)
    setAlertBundle(await freshAlerts(next, force, SETTINGS.appBudgetMs, SETTINGS.timeoutSeconds * 1000))
    setAlertLoading(false)
    Widget.reloadAll()
  }

  function saveAlerts(next: AlertSettings) {
    writeAlerts(next)
    setAlertSet(next)
    setAlertBundle(cachedAlerts(next))
    Widget.reloadAll()
  }

  // Список датчиків вантажимо лише тоді, коли почали шукати.
  useEffect(() => {
    if (!query.trim() || channels !== null) return
    setChannelsError(null)
    loadChannels()
      .then((list) => setChannels(list))
      .catch(() => setChannelsError("Не вдалося завантажити датчики. Перевірте інтернет."))
  }, [query])

  async function chooseSensor(channel: Channel) {
    if (!cfg) return
    const next: Config = { ...cfg, svitlobot: channel.id, svitlobotName: channel.name }
    writeConfig(next)
    setCfg(next)
    setQuery("")
    setFact(await getFact(next, true))
    Widget.reloadAll()
  }

  // Без свого датчика знову працює факт за чергою.
  async function removeSensor() {
    if (!cfg) return
    const next: Config = { ...cfg }
    delete next.svitlobot
    delete next.svitlobotName
    writeConfig(next)
    setCfg(next)
    setFact(await getFact(next, true))
    Widget.reloadAll()
  }

  useEffect(() => {
    refresh(cfg, true)
    if (alertSet.enabled) {
      loadLocations().then((list) => setLocations(list))
      refreshAlerts(alertSet, true)
    }
  }, [])

  useEffect(() => {
    const found = regionById(region)
    if (!found) {
      setGroups([])
      return
    }
    setGroupsError(null)
    loadGroups(found)
      .then((list) => {
        setGroups(list)
        if (!list.length) setGroupsError("Для цього регіону зараз немає списку черг.")
      })
      .catch(() => {
        setGroups([])
        setGroupsError("Не вдалося завантажити список черг. Перевірте інтернет.")
      })
  }, [region])

  useEffect(() => {
    const found = regionById(region2)
    if (!found) {
      setGroups2([])
      return
    }
    setGroups2Error(null)
    loadGroups(found)
      .then((list) => {
        setGroups2(list)
        if (!list.length) setGroups2Error("Для цього регіону зараз немає списку черг.")
      })
      .catch(() => {
        setGroups2([])
        setGroups2Error("Не вдалося завантажити список черг. Перевірте інтернет.")
      })
  }, [region2])

  // Друга адреса зберігається, щойно обрали чергу. Її кеш і памʼять про графік починаються з нуля.
  async function chooseSecondGroup(group: string) {
    if (!cfg) return
    const next: Config = { ...cfg, second: { name: name2.trim() || SECOND_NAME, region: region2, group } }
    writeConfig(next)
    setCfg(next)
    clearCache(1)
    forgetSecond()
    await refresh(next, true)
  }

  function renameSecond(value: string) {
    setName2(value)
    if (!cfg || !cfg.second) return
    const next: Config = { ...cfg, second: { ...cfg.second, name: value.trim() || SECOND_NAME } }
    writeConfig(next)
    setCfg(next)
  }

  function renameFirst(value: string) {
    if (!cfg) return
    const next: Config = { ...cfg, name: value.trim() || undefined }
    writeConfig(next)
    setCfg(next)
  }

  async function removeSecond() {
    if (!cfg) return
    const next: Config = { ...cfg }
    delete next.second
    writeConfig(next)
    setCfg(next)
    clearCache(1)
    forgetSecond()
    setName2("")
    setData2({ sched: null, status: "ok" })
    setFact2(null)
    await refresh(next, false)
  }

  // Нова черга: старий кеш і памʼять про графік для сповіщень уже не годяться.
  async function chooseGroup(group: string) {
    const next: Config = { ...(cfg ?? {}), region, group }
    writeConfig(next)
    setCfg(next)
    clearCache()
    await resetNotifications()
    await refresh(next, true)
  }

  async function update(patch: Partial<Config>) {
    if (!cfg) return
    const next = { ...cfg, ...patch }
    writeConfig(next)
    setCfg(next)
    const date = new Date()
    await tryUpdateNotifications(next, [data.sched, data2.sched], kyivParts(date), date, 4000)
    Widget.reloadAll()
  }

  // Перше ввімкнення: місце одразу стоїть на області світла, якщо її обрано.
  function toggleAlerts(on: boolean) {
    const next: AlertSettings = { ...alertSet, enabled: on }
    if (on && !cleanPlace(next.place)) {
      const uid = oblastForRegion(cfg?.region)
      const oblast = findLocation(locations, uid) || findLocation(defaultOblasts(), uid)
      next.place = oblast ? { oblast: oblast.uid, oblastTitle: oblast.title } : null
    }
    saveAlerts(next)
    if (on) {
      loadLocations().then((list) => setLocations(list))
      refreshAlerts(next, true)
    }
  }

  function choosePlace(place: Place | null) {
    const next: AlertSettings = { ...alertSet, place }
    saveAlerts(next)
    refreshAlerts(next, false)
  }

  async function connectChannel() {
    const id = channelName(channelInput)
    if (!id) {
      setChannelError("Вставте посилання на канал (t.me/назва) або @назва.")
      return
    }
    setChannelError(null)
    try {
      const found = await checkChannel(id)
      if (!found) {
        setChannelError("Канал не знайдено або він закритий: підходять лише публічні канали.")
        return
      }
      const next: AlertSettings = { ...alertSet, channel: id, channelTitle: found.title || id }
      setChannelInput("")
      saveAlerts(next)
      refreshAlerts(next, false)
    } catch (e) {
      setChannelError("Не вдалося відкрити канал. Перевірте інтернет.")
    }
  }

  function removeChannel() {
    const next: AlertSettings = { ...alertSet }
    delete next.channel
    delete next.channelTitle
    saveAlerts(next)
  }

  const date = new Date()
  const now = kyivParts(date)
  const view = buildView(cfg, { ...data, fact }, now)
  const second = secondOf(cfg)
  const view2 = buildView(second, { ...data2, fact: fact2 }, now)
  const found = channels && query.trim() ? searchChannels(channels, query) : []
  // Новий канал зʼявляється в пошуку лише після модерації СвітлоБота (кілька днів), а за посиланням працює одразу.
  const direct = channelId(query)
  const directNew = /^svitlobot_/i.test(direct) && !found.some((c) => c.id.toLowerCase() === direct.toLowerCase()) ? direct : ""
  const prefs = cfg ? notifyPrefs(cfg) : { change: true, off: true, on: true }
  const sameRegion = cfg && cfg.region === region
  const official = regionById(region)?.official
  const s: AlertStatus | null = alertSet.enabled && alertBundle ? alertBundle.status : null
  const place = cleanPlace(alertSet.place)
  const oblast = findLocation(locations, place?.oblast)
  const raion = oblast ? findLocation(oblast.children, place?.raion) : null

  // ---------- Вкладка «Світло» ----------

  const paint = heroPaint(cfg ? view.kind : "none")
  const heroLabel = cfg ? `${second ? `${cfg.name || FIRST_NAME} · ` : ""}черга ${cfg.group}` : "Почніть тут"
  const lightHero = (
    <VStack
      alignment="leading"
      spacing={4}
      listRowBackground={<Background bg0={paint.bg0} bg1={paint.bg1} />}
      listRowInsets={{ top: 16, leading: 18, bottom: 14, trailing: 18 }}
    >
      <Text font={13} fontWeight="semibold" foregroundStyle={paint.soft}>{heroLabel}</Text>
      <Text font={26} fontWeight="bold" foregroundStyle={paint.ink}>{cfg ? (loading ? "Оновлюю…" : view.title) : "Оберіть область і чергу"}</Text>
      <Text font={16} foregroundStyle={paint.ink}>{cfg ? (view.notice ? `${view.sub}. ${view.notice}` : view.sub) : "Нижче, у розділі «Моя черга». Потім додайте віджет на екран."}</Text>
      {cfg && hasTimer(view, now) ? (
        <TimerIntervalLabel
          from={date.getTime()}
          to={changeDate(view, now, date).getTime()}
          countsDown
          font={30}
          fontWeight="bold"
          fontDesign="monospaced"
          monospacedDigit
          foregroundStyle={paint.ink}
        />
      ) : null}
      {cfg && view.todayRuns.length ? (
        <VStack spacing={0} padding={{ top: 8 }}>
          <DayStrip runs={view.todayRuns} nowMin={view.nowMin} paint={paint} />
        </VStack>
      ) : null}
      {cfg ? (
        <HStack padding={{ top: 6 }}>
          <Text font={13} foregroundStyle={paint.soft}>{view.checked !== null ? `перевірено о ${hm(view.checked)}` : ""}</Text>
          <Spacer />
          <Button title="Оновити" systemImage="arrow.clockwise" buttonStyle="bordered" controlSize="small" tint={paint.ink} action={() => refresh(cfg, true)} />
        </HStack>
      ) : null}
    </VStack>
  )

  // Тривога в обраному місці: червона смуга над світлом, дотик веде на вкладку «Тривога».
  const banner = s && active(s) ? (
    <Section>
      <Button action={() => setTab(1)} buttonStyle="plain" listRowBackground={<Rectangle fill={alertIcon(T, s.kind).fill} />}>
        <HStack spacing={10}>
          <Image systemName={alertGlyph(s.kind)} font={18} fontWeight="bold" foregroundStyle={alertIcon(T, s.kind).glyph} />
          <VStack alignment="leading" spacing={1}>
            <Text font={16} fontWeight="bold" foregroundStyle={alertIcon(T, s.kind).glyph}>{`${alertShortTitle(s)}${s.subShort ? ` ${s.subShort}` : ""}`}</Text>
            <Text font={13} foregroundStyle={alertIcon(T, s.kind).glyph} opacity={0.85}>{s.place}</Text>
          </VStack>
          <Spacer />
          <Image systemName="chevron.right" font={14} fontWeight="semibold" foregroundStyle={alertIcon(T, s.kind).glyph} />
        </HStack>
      </Button>
    </Section>
  ) : null

  const lightTab = (
    <NavigationStack>
      <List navigationTitle="Світло">
        {banner}
        <Section>{lightHero}</Section>

        {cfg ? (
          <Section header={<Text>Відключення</Text>}>
            <VStack alignment="leading" spacing={2}>
              <Text font={13} foregroundStyle="secondaryLabel">Сьогодні</Text>
              <Text font={17}>{daysText(view, true)}</Text>
            </VStack>
            <VStack alignment="leading" spacing={2}>
              <Text font={13} foregroundStyle="secondaryLabel">Завтра</Text>
              <Text font={17}>{daysText(view, false)}</Text>
            </VStack>
          </Section>
        ) : null}

        <Section header={<Text>Моя черга</Text>} footer={official ? <Text>Для Запоріжжя є пошук черги за адресою на сайті обленерго.</Text> : undefined}>
          <Picker title="Область" value={region} onChanged={(value: string) => setRegion(value)} pickerStyle="menu">
            {[<Text tag="">Оберіть</Text>].concat(REGIONS.map((r) => <Text tag={r.id}>{r.name}</Text>))}
          </Picker>
          {!region ? null : groups.length ? (
            <Picker
              title="Черга"
              value={sameRegion && cfg ? cfg.group : ""}
              onChanged={(value: string) => {
                if (value) chooseGroup(value)
              }}
              pickerStyle="menu"
            >
              {[<Text tag="">Оберіть</Text>].concat(groups.map((g) => <Text tag={g}>{`Черга ${g}`}</Text>))}
            </Picker>
          ) : (
            <Hint text={groupsError ?? "Завантажую черги…"} />
          )}
          {official ? <Link url={URLS.zoeQueue}>Не знаю свою чергу</Link> : null}
        </Section>

        {cfg ? (
          <Section header={<Text>Чи є світло насправді</Text>} footer={<Text>{cfg.svitlobot ? `Датчик: ${cfg.svitlobotName || cfg.svitlobot}` : view.fact ? QUEUE_HINT : ""}</Text>}>
            {view.fact ? (
              <Label title={`${view.fact.full}${view.fact.checked ? ` · ${view.fact.checked}` : ""}`} systemImage={view.fact.kind === "on" ? "lightbulb.max.fill" : view.fact.kind === "off" ? "lightbulb.slash.fill" : "lightbulb"} />
            ) : (
              <Hint text={cfg.svitlobot || !factLoaded ? "Перевіряю датчики…" : NO_SENSORS} />
            )}
            <TextField
              title="Пошук датчика"
              prompt={cfg.svitlobot ? "Інший датчик: вулиця чи посилання" : "Вулиця, будинок або посилання на канал"}
              value={query}
              onChanged={(value: string) => setQuery(value)}
            />
            {directNew ? (
              <Button
                title={`Підключити канал ${directNew}`}
                action={() => chooseSensor({ id: directNew, name: directNew, status: "unknown", since: null, users: 0, queue: null })}
              />
            ) : null}
            {query.trim() && channelsError ? <Hint text={channelsError} /> : null}
            {query.trim() && !channelsError && channels === null ? <Hint text="Завантажую датчики…" /> : null}
            {query.trim() && channels !== null && !found.length && !directNew ? <Hint text={NOT_FOUND} /> : null}
            {found.map((channel) => (
              <Button title={`${MARKS[channel.status]} ${channel.name}`} action={() => chooseSensor(channel)} />
            ))}
            {cfg.svitlobot ? <Button title="Прибрати датчик" role="destructive" action={() => removeSensor()} /> : null}
            <Link url={SVITLOBOT.howTo}>Як поставити свій датчик</Link>
          </Section>
        ) : null}

        {cfg ? (
          <Section header={<Text>Сповіщення</Text>} footer={<Text>{NOTIFY_HINT}</Text>}>
            <Toggle title="Графік черги змінився" value={prefs.change} onChanged={(value: boolean) => update({ notifyChange: value })} />
            <Toggle title="За 10 хв до відключення" value={prefs.off} onChanged={(value: boolean) => update({ notifyOff: value })} />
            <Toggle title="За 10 хв до ввімкнення" value={prefs.on} onChanged={(value: boolean) => update({ notifyOn: value })} />
          </Section>
        ) : null}

        {cfg ? (
          <Section header={<Text>Друга адреса</Text>} footer={<Text>{second ? SECOND_WIDGET : SECOND_ABOUT}</Text>}>
            {second ? (
              <VStack alignment="leading" spacing={2}>
                <Text font={17} fontWeight="semibold">{loading ? "Оновлюю…" : `${second.place}: ${view2.title}`}</Text>
                <Text font={15} foregroundStyle="secondaryLabel">{`Сьогодні: ${daysText(view2, true)}`}</Text>
                <Text font={15} foregroundStyle="secondaryLabel">{`Завтра: ${daysText(view2, false)}`}</Text>
              </VStack>
            ) : null}
            <TextField title="Назва" prompt="Наприклад, Батьки" value={name2} onChanged={(value: string) => renameSecond(value)} />
            <Picker title="Область" value={region2} onChanged={(value: string) => setRegion2(value)} pickerStyle="menu">
              {[<Text tag="">Оберіть</Text>].concat(REGIONS.map((r) => <Text tag={r.id}>{r.name}</Text>))}
            </Picker>
            {!region2 ? null : groups2.length ? (
              <Picker
                title="Черга"
                value={cfg.second && cfg.second.region === region2 ? cfg.second.group : ""}
                onChanged={(value: string) => {
                  if (value) chooseSecondGroup(value)
                }}
                pickerStyle="menu"
              >
                {[<Text tag="">Оберіть</Text>].concat(groups2.map((g) => <Text tag={g}>{`Черга ${g}`}</Text>))}
              </Picker>
            ) : (
              <Hint text={groups2Error ?? "Завантажую черги…"} />
            )}
            {second ? (
              <TextField title="Назва першої адреси" prompt={FIRST_NAME} value={cfg.name ?? ""} onChanged={(value: string) => renameFirst(value)} />
            ) : null}
            {second ? <Button title="Прибрати другу адресу" role="destructive" action={() => removeSecond()} /> : null}
          </Section>
        ) : null}
      </List>
    </NavigationStack>
  )

  // ---------- Вкладка «Тривога» ----------

  const page = alertPage(T, s ? s.kind : "setup")
  const posts = s ? s.posts : []
  const others = s ? s.others.slice(s.kind === "nearby" ? 1 : 0) : []
  const alertHero = s ? (
    <VStack
      alignment="leading"
      spacing={4}
      listRowBackground={<Background bg0={page.bg0} bg1={page.bg1} />}
      listRowInsets={{ top: 16, leading: 18, bottom: 14, trailing: 18 }}
    >
      <HStack alignment="top">
        <VStack alignment="leading" spacing={4}>
          <Text font={13} fontWeight="semibold" foregroundStyle={page.muted}>{s.place || "Повітряна тривога"}</Text>
          <Text font={26} fontWeight="bold" foregroundStyle={page.title}>{alertLoading ? "Оновлюю…" : s.title}</Text>
        </VStack>
        <Spacer />
        <StateIcon tok={alertIcon(T, s.kind)} glyph={alertGlyph(s.kind)} size={44} />
      </HStack>
      <Text font={16} foregroundStyle={page.text}>{s.sub}</Text>
      {active(s) && s.where ? (
        <Text font={14} foregroundStyle={page.muted}>{s.where === "уся область" ? "оголошено на всю область" : `оголошено: ${s.where}`}</Text>
      ) : null}
      {s.timer ? (
        <DateLabel date={new Date(s.since)} style="timer" font={30} fontWeight="bold" fontDesign="monospaced" monospacedDigit foregroundStyle={page.title} />
      ) : null}
      {posts.length ? (
        <VStack alignment="leading" spacing={3} padding={{ top: 6 }}>
          <Text font={13} fontWeight="semibold" foregroundStyle={page.muted}>{s.channel ? `Канал «${s.channel}»` : "Канал"}</Text>
          {posts.map((post) => <Text font={14} foregroundStyle={page.text}>{post}</Text>)}
        </VStack>
      ) : null}
      {others.length ? (
        <Text font={14} foregroundStyle={page.muted} padding={{ top: 4 }}>
          {`${active(s) || s.kind === "nearby" ? "Також тривога" : "В області тривога"}: ${others.slice(0, 3).join(", ")}${others.length > 3 ? ` і ще ${others.length - 3}` : ""}`}
        </Text>
      ) : null}
      <HStack padding={{ top: 6 }}>
        <Text font={13} foregroundStyle={page.muted}>{s.checked ? `${s.stale ? "дані за" : "перевірено о"} ${s.checked}` : ""}</Text>
        <Spacer />
        <Button title="Оновити" systemImage="arrow.clockwise" buttonStyle="bordered" controlSize="small" tint={page.title} action={() => refreshAlerts(alertSet, true)} />
      </HStack>
    </VStack>
  ) : (
    <VStack alignment="leading" spacing={6} listRowInsets={{ top: 16, leading: 18, bottom: 14, trailing: 18 }}>
      <HStack alignment="top">
        <Text font={22} fontWeight="bold">Повітряна тривога у віджеті</Text>
        <Spacer />
        <StateIcon tok={T.icons.idle} glyph={alertGlyph("setup")} size={40} />
      </HStack>
      <Text font={16} foregroundStyle="secondaryLabel">{ALERTS_OFF}</Text>
    </VStack>
  )

  const alertTab = (
    <NavigationStack>
      <List navigationTitle="Тривога">
        <Section>{alertHero}</Section>

        <Section footer={<Text>{ALERTS_RAIL}</Text>}>
          <Toggle title="Показувати у віджеті" value={!!alertSet.enabled} onChanged={(value: boolean) => toggleAlerts(value)} />
        </Section>

        {alertSet.enabled ? (
          <Section header={<Text>Місце</Text>} footer={<Text>{ALERTS_ABOUT}</Text>}>
            <Picker
              title="Область"
              value={place?.oblast ?? ""}
              onChanged={(value: string) => {
                const o = findLocation(locations, value)
                choosePlace(o ? { oblast: o.uid, oblastTitle: o.title } : null)
              }}
              pickerStyle="menu"
            >
              {[<Text tag="">Оберіть</Text>].concat(locations.map((l) => <Text tag={l.uid}>{l.title}</Text>))}
            </Picker>
            {place && oblast && oblast.children.length ? (
              <Picker
                title="Район"
                value={place.raion ?? ""}
                onChanged={(value: string) => {
                  const r = findLocation(oblast.children, value)
                  choosePlace(r ? { oblast: oblast.uid, oblastTitle: oblast.title, raion: r.uid, raionTitle: r.title } : { oblast: oblast.uid, oblastTitle: oblast.title })
                }}
                pickerStyle="navigationLink"
              >
                {[<Text tag="">Уся область</Text>].concat(oblast.children.map((l) => <Text tag={l.uid}>{l.title}</Text>))}
              </Picker>
            ) : null}
            {place && oblast && raion && raion.children.length ? (
              <Picker
                title="Громада"
                value={place.hromada ?? ""}
                onChanged={(value: string) => {
                  const h = findLocation(raion.children, value)
                  const base: Place = { oblast: oblast.uid, oblastTitle: oblast.title, raion: raion.uid, raionTitle: raion.title }
                  choosePlace(h ? { ...base, hromada: h.uid, hromadaTitle: h.title } : base)
                }}
                pickerStyle="navigationLink"
              >
                {[<Text tag="">Увесь район</Text>].concat(raion.children.map((l) => <Text tag={l.uid}>{l.title}</Text>))}
              </Picker>
            ) : null}
          </Section>
        ) : null}

        {alertSet.enabled ? (
          <Section header={<Text>Що летить: канал у Telegram</Text>} footer={<Text>{CHANNEL_HINT}</Text>}>
            {alertSet.channel ? <Label title={alertSet.channelTitle || alertSet.channel} systemImage="paperplane.fill" /> : null}
            <TextField
              title="Канал"
              prompt={alertSet.channel ? "Інший канал: t.me/назва або @назва" : "t.me/назва або @назва"}
              value={channelInput}
              onChanged={(value: string) => setChannelInput(value)}
            />
            {channelInput.trim() ? <Button title="Підключити канал" action={() => connectChannel()} /> : null}
            {channelError ? <Hint text={channelError} /> : null}
            {alertSet.channel ? <Button title="Прибрати канал" role="destructive" action={() => removeChannel()} /> : null}
          </Section>
        ) : null}

        <Section header={<Text>Сирена й миттєві сповіщення</Text>} footer={<Text>{`${ALERTS_LIMITS}\n\n${ALERTS_SOURCE}`}</Text>}>
          <Link url={ALERTS.officialApp}>Офіційний застосунок «Повітряна тривога»</Link>
          <Link url={ALERTS.source}>Мапа тривог alerts.in.ua</Link>
        </Section>
      </List>
    </NavigationStack>
  )

  // ---------- Вкладка «Віджет» ----------

  const legend: [IconTok, string, string][] = [
    [T.icons.alert, alertGlyph("alert"), "тривога у вашій громаді"],
    [T.icons.threat, alertGlyph("threat"), "попередня загроза"],
    [T.icons.nearby, alertGlyph("nearby"), "тривога поруч, у вас тихо"],
    [T.icons.quiet, alertGlyph("quiet"), "тихо"],
    [T.icons.stale, alertGlyph("nodata"), "немає свіжих даних"],
  ]

  const widgetTab = (
    <NavigationStack>
      <List navigationTitle="Віджет">
        {cfg ? (
          <Section header={<Text>Вигляд</Text>} footer={<Text>{STYLE_HINT}</Text>}>
            <Picker title="Робочий екран" value={lookOf(cfg.look, DEFAULT_LOOK)} onChanged={(value: string) => update({ look: value })} pickerStyle="menu">
              {Object.keys(LOOKS).map((id) => <Text tag={id}>{LOOKS[id].name}</Text>)}
            </Picker>
            <Picker title="Екран блокування" value={lockLookOf(cfg.lockLook)} onChanged={(value: string) => update({ lockLook: value })} pickerStyle="menu">
              {Object.keys(LOCK_LOOKS).map((id) => <Text tag={id}>{LOCK_LOOKS[id].name}</Text>)}
            </Picker>
            <Picker title="Фон" value={styleOf(cfg.style)} onChanged={(value: string) => update({ style: value })} pickerStyle="menu">
              {STYLE_IDS.map((id) => <Text tag={id}>{STYLE_NAMES[id]}</Text>)}
            </Picker>
          </Section>
        ) : null}

        {cfg ? (
          <Section header={<Text>Подивитися віджет</Text>}>
            {PREVIEWS.map(([family, name, icon]) => (
              <Button action={() => Widget.preview({ family })}>
                <Label title={name} systemImage={icon} />
              </Button>
            ))}
          </Section>
        ) : null}

        <Section header={<Text>Кнопки у віджеті</Text>}>
          <Label title="«↻» — оновити все одразу" systemImage="arrow.clockwise" />
          <Label title="Значок світла — сторінка світла" systemImage="bolt.fill" />
          <Label title="Значок тривоги — тривога докладно" systemImage="light.beacon.max.fill" />
          <Label title="Кружечки внизу — яка сторінка відкрита" systemImage="ellipsis" />
          <Label title="Дотик до віджета — відкрити цю сторінку" systemImage="hand.tap" />
        </Section>

        <Section header={<Text>Значок тривоги</Text>} footer={<Text>Стовпчик значків зʼявляється, коли на вкладці «Тривога» ввімкнено «Показувати у віджеті».</Text>}>
          {legend.map(([tok, glyph, text]) => (
            <HStack spacing={12}>
              <StateIcon tok={tok} glyph={glyph} size={28} />
              <Text font={16}>{text}</Text>
            </HStack>
          ))}
        </Section>

        <Section header={<Text>Як додати на робочий екран</Text>}>
          <Steps steps={HOME_STEPS} />
        </Section>

        <Section header={<Text>Як додати на екран блокування</Text>}>
          <Steps steps={LOCK_STEPS} />
        </Section>

        <Section header={<Text>Як читати малюнок</Text>}>
          {READING.map(([name, text]) => (
            <VStack alignment="leading" spacing={2}>
              <Text font={16} fontWeight="semibold">{name}</Text>
              <Text font={15} foregroundStyle="secondaryLabel">{text}</Text>
            </VStack>
          ))}
        </Section>

        <Section header={<Text>{`Про скрипт · версія ${VERSION}`}</Text>} footer={<Text>{ABOUT}</Text>}>
          {official ? <Link url={URLS.zoe}>Сайт Запоріжжяобленерго</Link> : null}
          <Link url={REPO}>Скрипт на GitHub і оновлення</Link>
          <Link url={PRIVACY}>Політика конфіденційності</Link>
        </Section>
      </List>
    </NavigationStack>
  )

  const tabItem = (title: string, icon: string): VirtualNode => <Label title={title} systemImage={icon} />
  return (
    <TabView tabIndex={tab} onTabIndexChanged={(value: number) => setTab(value)}>
      <VStack tabItem={tabItem("Світло", "bolt.fill")} tag={0}>{lightTab}</VStack>
      <VStack tabItem={tabItem("Тривога", "light.beacon.max.fill")} tag={1} badge={s && active(s) ? "!" : undefined}>{alertTab}</VStack>
      <VStack tabItem={tabItem("Віджет", "square.grid.2x2.fill")} tag={2}>{widgetTab}</VStack>
    </TabView>
  )
}

async function run() {
  await Navigation.present({ element: <App /> })
  Script.exit()
}

run()
