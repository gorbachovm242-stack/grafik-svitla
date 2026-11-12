// Три сповіщення: графік змінився, за 10 хвилин до відключення, за 10 хвилин до ввімкнення.
// Ставить їх і застосунок, і віджет, коли iOS його оновлює, і кнопка «↻».
import { Notification } from "scripting"
import type { Config, Known, Now, Sched } from "./logic"
import { changeMessage, knownWindows, notifyPrefs, plannedNotifications, scheduleChanges } from "./logic"

const PLANNED_KEY = "planned"
const KNOWN_KEY = "known"
const THREAD = "grafik-svitla"

function queueKey(cfg: Config): string {
  return `${cfg.region}|${cfg.group}`
}

// Заплановані попередження міняємо лише тоді, коли змінився їхній набір.
async function syncPlanned(cfg: Config, sched: Sched | null, now: Now, date: Date): Promise<void> {
  const prefs = notifyPrefs(cfg)
  const items = sched ? plannedNotifications(sched, now, cfg.group, prefs) : []
  // v2: тексти рахуються від моменту показу (12.11.2026). Нова позначка один раз переставляє вже заплановані
  // попередження зі старими словами «завтра о …».
  const signature = `v2|${queueKey(cfg)}#${items.map((item) => item.id).join("|")}`
  const saved = Storage.get<{ signature: string }>(PLANNED_KEY)
  if (saved && saved.signature === signature) return
  await Notification.removeAllPendingsOfCurrentScript()
  const base = new Date(date.getTime())
  base.setSeconds(0, 0)
  for (const item of items) {
    const seconds = Math.round((base.getTime() + (item.triggerMin - now.min) * 60000 - Date.now()) / 1000)
    if (seconds < 1) continue
    await Notification.schedule({
      title: item.title,
      body: item.body,
      threadIdentifier: THREAD,
      interruptionLevel: "timeSensitive",
      trigger: new TimeIntervalNotificationTrigger({ timeInterval: seconds, repeats: false }),
    })
  }
  Storage.set(PLANNED_KEY, { signature })
}

// Графік черги змінився чи зʼявився новий: повідомляємо одразу. Перше завантаження й зміна черги мовчать.
async function checkChange(cfg: Config, sched: Sched | null, now: Now): Promise<void> {
  if (!sched) return
  const saved = Storage.get<{ key: string; known: Known }>(KNOWN_KEY)
  const prev = saved && saved.key === queueKey(cfg) ? saved.known : null
  const next = knownWindows(prev, sched, now)
  Storage.set(KNOWN_KEY, { key: queueKey(cfg), known: next })
  const message = notifyPrefs(cfg).change ? changeMessage(scheduleChanges(prev, next, now), now, cfg.group) : null
  if (!message) return
  await Notification.schedule({ title: message.title, body: message.body, threadIdentifier: THREAD, interruptionLevel: "timeSensitive" })
}

export async function updateNotifications(cfg: Config, sched: Sched | null, now: Now, date: Date): Promise<void> {
  await syncPlanned(cfg, sched, now, date)
  await checkChange(cfg, sched, now)
}

// Сповіщення необовʼязкові: їхня помилка чи зависання не повинні лишити віджет порожнім.
export async function tryUpdateNotifications(cfg: Config, sched: Sched | null, now: Now, date: Date, timeoutMs: number): Promise<void> {
  let timer: number | undefined
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, timeoutMs) as unknown as number
  })
  try {
    await Promise.race([updateNotifications(cfg, sched, now, date), timeout])
  } catch (e) {
    console.log(`Сповіщення: ${e}`)
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

// Вимкнули всі три або змінили чергу: старі заплановані прибираємо одразу.
export async function resetNotifications(): Promise<void> {
  Storage.remove(PLANNED_KEY)
  Storage.remove(KNOWN_KEY)
  await Notification.removeAllPendingsOfCurrentScript()
}
