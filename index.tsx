// Сторінка налаштувань: черга, три сповіщення, повітряна тривога, вигляд і фон віджета. Зміни одразу видно у віджеті.
import {
  Navigation, NavigationStack, List, Section, Text, TextField, Button, Picker, Toggle, Link, Script, Widget, useEffect, useState,
} from "scripting"
import type { WidgetFamily } from "scripting"
import type { Channel, Config, Data, Fact, FactStatus } from "./logic"
import type { View } from "./logic"
import {
  DEFAULT_LOOK, FIRST_NAME, LOCK_LOOKS, LOOKS, REGIONS, SECOND_NAME, SETTINGS, SVITLOBOT, URLS, addressesOf, buildView, channelId, hm,
  kyivParts, lockLookOf, lookOf, notifyPrefs, regionById, searchChannels, windowText,
} from "./logic"
import type { AlertSettings, Location, Place } from "./alerts"
import { ALERTS, active, alertShortTitle, channelName, cleanPlace, defaultOblasts, oblastForRegion } from "./alerts"
import { STYLE_IDS, STYLE_NAMES, styleOf } from "./theme"
import type { AlertBundle } from "./store"
import {
  cachedAlerts, cachedData, cachedFact, checkChannel, clearCache, freshAlerts, freshAll, getFact, loadChannels, loadGroups, loadLocations,
  readAlerts, readConfig, writeAlerts, writeConfig,
} from "./store"
import { forgetSecond, resetNotifications, tryUpdateNotifications } from "./notifications"

const HOW_TO_ADD =
  "Робочий екран: утримуйте порожнє місце, натисніть «Редагувати» → «Додати віджет», знайдіть Scripting, оберіть розмір і додайте. " +
  "Потім утримуйте віджет, «Змінити віджет», і в полі Script оберіть «Графік світла».\n\n" +
  "Екран блокування: утримуйте його, «Налаштувати» → «Екран блокування», торкніться поля віджетів і додайте Scripting. " +
  "Потім торкніться доданого віджета й оберіть «Графік світла»."
const HOW_TO_ADD_ALERTS =
  "\n\nКоли ввімкнено повітряну тривогу, праворуч у віджеті стовпчик значків: торкніться значка тривоги, щоб побачити її докладно, " +
  "і значка світла, щоб повернутися. Кнопка «↻» оновлює все одразу."

// Без власного датчика факт береться з усіх датчиків СвітлоБота вашої черги, нічого налаштовувати не треба.
const QUEUE_HINT = "Точніше покаже датчик саме вашого будинку: знайдіть його за вулицею або вставте посилання на канал."
const NO_SENSORS =
  "У вашій черзі поки немає датчиків СвітлоБота. Знайдіть датчик свого будинку чи сусідів за вулицею, вставте посилання на канал або поставте свій."

const MARKS: Record<FactStatus, string> = { on: "🟢", off: "🔴", unknown: "⚪️" }

const SECOND_ABOUT = "Батьки, робота чи дача: віджет і попередження ще для однієї черги. Оберіть область і чергу."
const SECOND_WIDGET =
  "Щоб віджет показував другу адресу: утримуйте віджет → «Змінити віджет» → у полі Parameter напишіть 2. " +
  "Попередження приходять про обидві адреси, з назвою на початку."

const ALERTS_OFF =
  "Увімкніть, і віджет покаже, чи є повітряна тривога у вашій громаді, з якого часу й що летить. " +
  "Праворуч у віджеті зʼявиться стовпчик значків: світло й тривога."
const ALERTS_ABOUT = "Оберіть свою громаду: у великих містах тривогу часто оголошують окремо від області."
const CHANNEL_HINT =
  "Публічний канал, де пишуть, що летить і куди. Віджет показує його останні дописи, не старші за годину, дослівно й з часом. " +
  "Це неофіційні дані: канали помиляються й запізнюються. Закриті групи й канали не підходять."
const ALERTS_LIMITS =
  "Коли оновити віджет, iPhone вирішує сам: зазвичай раз на 15–30 хвилин, частіше, якщо ви часто на нього дивитеся. " +
  "Кнопка «↻» у віджеті оновлює одразу. Сирени віджет не подасть: гучно сповіщає офіційний застосунок «Повітряна тривога», " +
  "обовʼязково поставте його."
const ALERTS_SOURCE =
  "Дані про тривоги: alerts.in.ua (волонтерська «Мапа тривог») через сервер-посередник «Маяка». Телефон бере всі активні тривоги " +
  "й сам обирає ваші: обране місце нікуди не надсилається."
const STYLE_HINT =
  "«Напівпрозорий» видно, коли в налаштуваннях віджета Scripting увімкнено прозорий фон (утримуйте віджет → «Змінити віджет»). " +
  "«Як система» вдень світлий, а в темній темі iPhone нічний."

function daysLine(view: View, today: boolean): string {
  if (today) return `Сьогодні: ${view.todayWindows.length ? view.todayWindows.map(windowText).join(", ") : "без відключень"}`
  return `Завтра: ${view.tomorrowRuns ? (view.tomorrowWindows || []).map(windowText).join(", ") || "без відключень" : "графіка ще немає"}`
}

// Друга адреса бере сховище поруч із першою: її дані окремо, щоб сторінка показала їх ще до мережі.
function secondOf(cfg: Config | null): Config | null {
  return addressesOf(cfg)[1] ?? null
}

const PREVIEWS: [WidgetFamily, string][] = [
  ["systemSmall", "Малий"],
  ["systemMedium", "Середній"],
  ["systemLarge", "Великий"],
  ["accessoryRectangular", "Екран блокування"],
]

function findLocation(list: Location[], uid: string | null | undefined): Location | null {
  return uid ? list.find((l) => l.uid === uid) || null : null
}

function App() {
  const [cfg, setCfg] = useState<Config | null>(readConfig())
  // Область не обрано, поки користувач не обере сам (раніше за замовчуванням стояло Запоріжжя).
  const [region, setRegion] = useState<string>(readConfig()?.region ?? "")
  const [groups, setGroups] = useState<string[]>([])
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
  const [groups2, setGroups2] = useState<string[]>([])
  const [groups2Error, setGroups2Error] = useState<string | null>(null)
  const [name2, setName2] = useState<string>(readConfig()?.second?.name ?? "")
  // Повітряна тривога.
  const [alertSet, setAlertSet] = useState<AlertSettings>(readAlerts())
  const [alertBundle, setAlertBundle] = useState<AlertBundle | null>(cachedAlerts(readAlerts()))
  const [alertLoading, setAlertLoading] = useState(false)
  const [locations, setLocations] = useState<Location[]>(defaultOblasts())
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

  // ---------- Повітряна тривога ----------

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

  const now = kyivParts(new Date())
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
  const alertStatus = alertSet.enabled && alertBundle ? alertBundle.status : null
  const place = cleanPlace(alertSet.place)
  const oblast = findLocation(locations, place?.oblast)
  const raion = oblast ? findLocation(oblast.children, place?.raion) : null

  return (
    <NavigationStack>
      <List navigationTitle="Графік світла">
        {alertStatus && active(alertStatus) ? (
          <Section>
            <Text font={17} fontWeight="semibold" foregroundStyle="systemRed">
              {`${alertShortTitle(alertStatus)}${alertStatus.subShort ? ` ${alertStatus.subShort}` : ""}: ${alertStatus.place}`}
            </Text>
          </Section>
        ) : null}

        {cfg ? (
          <Section title={`${second ? `${cfg.name || FIRST_NAME}: ` : ""}${regionById(cfg.region)?.name ?? ""}, черга ${cfg.group}`}>
            <Text font={17} fontWeight="semibold">{loading ? "Оновлюю…" : view.title}</Text>
            <Text>{view.notice ? `${view.sub}. ${view.notice}` : view.sub}</Text>
            <Text foregroundStyle="secondaryLabel">{daysLine(view, true)}</Text>
            <Text foregroundStyle="secondaryLabel">{daysLine(view, false)}</Text>
            {view.checked !== null ? <Text foregroundStyle="secondaryLabel">{`Перевірено о ${hm(view.checked)}`}</Text> : null}
            <Button title="Оновити зараз" action={() => refresh(cfg, true)} />
          </Section>
        ) : (
          <Section title="Почніть тут">
            <Text>Оберіть область і свою чергу. Потім додайте віджет на екран.</Text>
          </Section>
        )}

        <Section title="Черга">
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
            <Text foregroundStyle="secondaryLabel">{groupsError ?? "Завантажую черги…"}</Text>
          )}
          {official ? <Link url={URLS.zoeQueue}>Не знаю свою чергу</Link> : null}
        </Section>

        {cfg ? (
          <Section title="Чи є світло насправді">
            {view.fact ? (
              <Text font={17} fontWeight="semibold">{`${view.fact.full}${view.fact.checked ? ` · ${view.fact.checked}` : ""}`}</Text>
            ) : (
              <Text foregroundStyle="secondaryLabel">{cfg.svitlobot || !factLoaded ? "Перевіряю датчики…" : NO_SENSORS}</Text>
            )}
            {cfg.svitlobot ? (
              <Text foregroundStyle="secondaryLabel">{`Датчик: ${cfg.svitlobotName || cfg.svitlobot}`}</Text>
            ) : view.fact ? (
              <Text foregroundStyle="secondaryLabel">{QUEUE_HINT}</Text>
            ) : null}
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
            {query.trim() && channelsError ? <Text foregroundStyle="secondaryLabel">{channelsError}</Text> : null}
            {query.trim() && !channelsError && channels === null ? <Text foregroundStyle="secondaryLabel">Завантажую датчики…</Text> : null}
            {query.trim() && channels !== null && !found.length && !directNew ? (
              <Text foregroundStyle="secondaryLabel">
                Нічого не знайдено. Новий датчик зʼявляється в пошуку лише після перевірки СвітлоБотом (кілька днів), а свій канал можна підключити одразу: вставте посилання t.me/svitlobot_…
              </Text>
            ) : null}
            {found.map((channel) => (
              <Button title={`${MARKS[channel.status]} ${channel.name}`} action={() => chooseSensor(channel)} />
            ))}
            {cfg.svitlobot ? <Button title="Прибрати датчик" role="destructive" action={() => removeSensor()} /> : null}
            <Link url={SVITLOBOT.howTo}>Як поставити свій датчик</Link>
          </Section>
        ) : null}

        <Section title="Повітряна тривога">
          <Toggle title="Показувати у віджеті" value={!!alertSet.enabled} onChanged={(value: boolean) => toggleAlerts(value)} />
          {alertStatus ? (
            <Text font={17} fontWeight="semibold">{alertLoading ? "Оновлюю…" : alertStatus.title}</Text>
          ) : (
            <Text foregroundStyle="secondaryLabel">{ALERTS_OFF}</Text>
          )}
          {alertStatus && !alertLoading ? <Text>{alertStatus.sub}</Text> : null}
          {alertStatus && alertStatus.where ? (
            <Text foregroundStyle="secondaryLabel">{alertStatus.where === "уся область" ? "Оголошено на всю область" : `Оголошено: ${alertStatus.where}`}</Text>
          ) : null}
          {alertStatus ? alertStatus.posts.map((post) => <Text foregroundStyle="secondaryLabel">{post}</Text>) : null}
          {alertStatus && alertStatus.checked ? (
            <Text foregroundStyle="secondaryLabel">{`${alertStatus.stale ? "Дані за" : "Перевірено о"} ${alertStatus.checked}`}</Text>
          ) : null}
          {alertSet.enabled ? <Button title="Оновити тривоги" action={() => refreshAlerts(alertSet, true)} /> : null}
        </Section>

        {alertSet.enabled ? (
          <Section title="Місце для тривог">
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
            <Text foregroundStyle="secondaryLabel">{ALERTS_ABOUT}</Text>
          </Section>
        ) : null}

        {alertSet.enabled ? (
          <Section title="Що летить: канал у Telegram">
            {alertSet.channel ? (
              <Text font={17} fontWeight="semibold">{alertSet.channelTitle || alertSet.channel}</Text>
            ) : null}
            <TextField
              title="Канал"
              prompt={alertSet.channel ? "Інший канал: t.me/назва або @назва" : "t.me/назва або @назва"}
              value={channelInput}
              onChanged={(value: string) => setChannelInput(value)}
            />
            {channelInput.trim() ? <Button title="Підключити канал" action={() => connectChannel()} /> : null}
            {channelError ? <Text foregroundStyle="secondaryLabel">{channelError}</Text> : null}
            {alertSet.channel ? <Button title="Прибрати канал" role="destructive" action={() => removeChannel()} /> : null}
            <Text foregroundStyle="secondaryLabel">{CHANNEL_HINT}</Text>
          </Section>
        ) : null}

        {alertSet.enabled ? (
          <Section title="Миттєві сповіщення">
            <Text foregroundStyle="secondaryLabel">{ALERTS_LIMITS}</Text>
            <Link url={ALERTS.officialApp}>Офіційний застосунок «Повітряна тривога»</Link>
          </Section>
        ) : null}

        {alertSet.enabled ? (
          <Section title="Звідки дані про тривоги">
            <Text foregroundStyle="secondaryLabel">{ALERTS_SOURCE}</Text>
            <Link url={ALERTS.source}>Мапа тривог alerts.in.ua</Link>
          </Section>
        ) : null}

        {cfg ? (
          <Section title="Друга адреса">
            {second ? (
              <Text font={17} fontWeight="semibold">{loading ? "Оновлюю…" : `${second.place}: ${view2.title}`}</Text>
            ) : (
              <Text foregroundStyle="secondaryLabel">{SECOND_ABOUT}</Text>
            )}
            {second ? <Text>{view2.notice ? `${view2.sub}. ${view2.notice}` : view2.sub}</Text> : null}
            {second ? <Text foregroundStyle="secondaryLabel">{daysLine(view2, true)}</Text> : null}
            {second ? <Text foregroundStyle="secondaryLabel">{daysLine(view2, false)}</Text> : null}
            {second && view2.fact ? <Text foregroundStyle="secondaryLabel">{view2.fact.full}</Text> : null}
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
              <Text foregroundStyle="secondaryLabel">{groups2Error ?? "Завантажую черги…"}</Text>
            )}
            {second ? (
              <TextField title="Назва першої адреси" prompt={FIRST_NAME} value={cfg.name ?? ""} onChanged={(value: string) => renameFirst(value)} />
            ) : null}
            {second ? <Text foregroundStyle="secondaryLabel">{SECOND_WIDGET}</Text> : null}
            {second ? <Button title="Прибрати другу адресу" role="destructive" action={() => removeSecond()} /> : null}
          </Section>
        ) : null}

        {cfg ? (
          <Section title="Сповіщення">
            <Toggle title="Графік черги змінився" value={prefs.change} onChanged={(value: boolean) => update({ notifyChange: value })} />
            <Toggle title="За 10 хв до відключення" value={prefs.off} onChanged={(value: boolean) => update({ notifyOff: value })} />
            <Toggle title="За 10 хв до ввімкнення" value={prefs.on} onChanged={(value: boolean) => update({ notifyOn: value })} />
          </Section>
        ) : null}

        {cfg ? (
          <Section title="Вигляд віджета">
            <Picker title="Робочий екран" value={lookOf(cfg.look, DEFAULT_LOOK)} onChanged={(value: string) => update({ look: value })} pickerStyle="menu">
              {Object.keys(LOOKS).map((id) => (
                <Text tag={id}>{LOOKS[id].name}</Text>
              ))}
            </Picker>
            <Picker
              title="Екран блокування"
              value={lockLookOf(cfg.lockLook)}
              onChanged={(value: string) => update({ lockLook: value })}
              pickerStyle="menu"
            >
              {Object.keys(LOCK_LOOKS).map((id) => (
                <Text tag={id}>{LOCK_LOOKS[id].name}</Text>
              ))}
            </Picker>
            <Picker title="Фон" value={styleOf(cfg.style)} onChanged={(value: string) => update({ style: value })} pickerStyle="menu">
              {STYLE_IDS.map((id) => (
                <Text tag={id}>{STYLE_NAMES[id]}</Text>
              ))}
            </Picker>
            <Text foregroundStyle="secondaryLabel">{STYLE_HINT}</Text>
          </Section>
        ) : null}

        {cfg ? (
          <Section title="Подивитися віджет">
            {PREVIEWS.map(([family, name]) => (
              <Button title={name} action={() => Widget.preview({ family })} />
            ))}
          </Section>
        ) : null}

        <Section title="Як додати віджет">
          <Text>{HOW_TO_ADD + (alertSet.enabled ? HOW_TO_ADD_ALERTS : "")}</Text>
        </Section>

        {official ? (
          <Section>
            <Link url={URLS.zoe}>Сайт Запоріжжяобленерго</Link>
          </Section>
        ) : null}
      </List>
    </NavigationStack>
  )
}

async function run() {
  await Navigation.present({ element: <App /> })
  Script.exit()
}

run()
