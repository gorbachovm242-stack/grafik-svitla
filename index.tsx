// Сторінка налаштувань: черга, три сповіщення, вигляд і фон віджета. Зміни одразу видно у віджеті.
import {
  Navigation, NavigationStack, List, Section, Text, Button, Picker, Toggle, Link, Script, Widget, useEffect, useState,
} from "scripting"
import type { WidgetFamily } from "scripting"
import type { Config, Data } from "./logic"
import {
  DEFAULT_LOCK_LOOK, DEFAULT_LOOK, LOOKS, REGIONS, URLS, buildView, hm, kyivParts, lookOf, notifyPrefs, regionById, windowText,
} from "./logic"
import { STYLES, styleOf } from "./theme"
import { clearCache, getSchedule, loadGroups, readConfig, writeConfig } from "./store"
import { resetNotifications, tryUpdateNotifications } from "./notifications"

const HOW_TO_ADD =
  "Робочий екран: утримуйте порожнє місце, натисніть «Редагувати» → «Додати віджет», знайдіть Scripting, оберіть розмір і додайте. " +
  "Потім утримуйте віджет, «Змінити віджет», і в полі Script оберіть «Графік світла».\n\n" +
  "Екран блокування: утримуйте його, «Налаштувати» → «Екран блокування», торкніться поля віджетів і додайте Scripting. " +
  "Потім торкніться доданого віджета й оберіть «Графік світла»."

const PREVIEWS: [WidgetFamily, string][] = [
  ["systemSmall", "Малий"],
  ["systemMedium", "Середній"],
  ["systemLarge", "Великий"],
  ["accessoryRectangular", "Екран блокування"],
]

function App() {
  const [cfg, setCfg] = useState<Config | null>(readConfig())
  const [region, setRegion] = useState<string>(readConfig()?.region ?? "zaporizhzhia")
  const [groups, setGroups] = useState<string[]>([])
  const [groupsError, setGroupsError] = useState<string | null>(null)
  const [data, setData] = useState<Data>({ sched: null, status: "ok" })
  const [loading, setLoading] = useState(false)

  async function refresh(next: Config | null, force: boolean) {
    if (!next) return
    setLoading(true)
    const date = new Date()
    const now = kyivParts(date)
    const fresh = await getSchedule(next, now, force)
    setData(fresh)
    await tryUpdateNotifications(next, fresh.sched, now, date, 4000)
    setLoading(false)
    Widget.reloadAll()
  }

  useEffect(() => {
    refresh(cfg, true)
  }, [])

  useEffect(() => {
    const found = regionById(region)
    if (!found) return
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
    await tryUpdateNotifications(next, data.sched, kyivParts(date), date, 4000)
    Widget.reloadAll()
  }

  const now = kyivParts(new Date())
  const view = buildView(cfg, data, now)
  const prefs = cfg ? notifyPrefs(cfg) : { change: true, off: true, on: true }
  const sameRegion = cfg && cfg.region === region
  const official = regionById(region)?.official

  return (
    <NavigationStack>
      <List navigationTitle="Графік світла">
        {cfg ? (
          <Section title={`${regionById(cfg.region)?.name ?? ""}, черга ${cfg.group}`}>
            <Text font={17} fontWeight="semibold">{loading ? "Оновлюю…" : view.title}</Text>
            <Text>{view.notice ? `${view.sub}. ${view.notice}` : view.sub}</Text>
            <Text foregroundStyle="secondaryLabel">
              {`Сьогодні: ${view.todayWindows.length ? view.todayWindows.map(windowText).join(", ") : "без відключень"}`}
            </Text>
            <Text foregroundStyle="secondaryLabel">
              {`Завтра: ${view.tomorrowRuns ? (view.tomorrowWindows || []).map(windowText).join(", ") || "без відключень" : "графіка ще немає"}`}
            </Text>
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
            {REGIONS.map((r) => (
              <Text tag={r.id}>{r.name}</Text>
            ))}
          </Picker>
          {groups.length ? (
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
              value={lookOf(cfg.lockLook, DEFAULT_LOCK_LOOK)}
              onChanged={(value: string) => update({ lockLook: value })}
              pickerStyle="menu"
            >
              {Object.keys(LOOKS).map((id) => (
                <Text tag={id}>{LOOKS[id].name}</Text>
              ))}
            </Picker>
            <Picker title="Фон" value={styleOf(cfg.style)} onChanged={(value: string) => update({ style: value })} pickerStyle="menu">
              {Object.keys(STYLES).map((id) => (
                <Text tag={id}>{STYLES[id].name}</Text>
              ))}
            </Picker>
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
          <Text>{HOW_TO_ADD}</Text>
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
