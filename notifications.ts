// Три сповіщення: графік змінився, за 10 хвилин до відключення, за 10 хвилин до ввімкнення.
// Ставить їх і застосунок, і віджет, коли iOS його оновлює, і кнопка «↻». Коли адрес дві, сповіщення
// приходять про обидві, і текст починається з назви адреси: «Батьки, черга 3.2: …».
import { Notification } from "scripting"
import type { Config, Known, Now, Sched } from "./logic"
import { addressesOf, changeMessage, knownWindows, notifyPrefs, plannedNotifications, scheduleChanges } from "./logic"

const PLANNED_KEY = "planned"
const KNOWN_KEY = "known"
const THREAD = "grafik-svitla"

function queueKey(cfg: Config): string {
  return `${cfg.region}|${cfg.group}`
}

function knownKey(slot: number | undefined): string {
  return slot ? `${KNOWN_KEY}${slot + 1}` : KNOWN_KEY
}

// Графіки адрес у тому ж порядку, що й addressesOf(base). Одна адреса може прийти просто графіком.
type Scheds = Sched | null | (Sched | null)[]

function schedsOf(scheds: Scheds): (Sched | null)[] {
  return Array.isArray(scheds) ? scheds : [scheds]
}

// Заплановані попередження міняємо лише тоді, коли змінився їхній набір.
async function syncPlanned(base: Config, scheds: (Sched | null)[], now: Now, date: Date): Promise<void> {
  const prefs = notifyPrefs(base)
  const addresses = addressesOf(base)
  const items = addresses
    .flatMap((cfg, i) => {
      const sched = scheds[i]
      if (!sched) return []
      return plannedNotifications(sched, now, cfg.group, prefs, cfg.place).map((item) => ({ ...item, id: `${cfg.slot ?? 0}:${item.id}` }))
    })
    .sort((a, b) => a.triggerMin - b.triggerMin)
  // v3: тексти від моменту показу (12.11.2026) і дві адреси. Нова позначка один раз переставляє старі попередження.
  // Назви адрес теж у позначці: перейменували «Батьки», і тексти запланованих попереджень оновляться.
  const signature = `v3|${addresses.map((a) => `${queueKey(a)}:${a.place ?? ""}`).join("+")}#${items.map((item) => item.id).join("|")}`
  const saved = Storage.get<{ signature: string }>(PLANNED_KEY)
  if (saved && saved.signature === signature) return
  await Notification.removeAllPendingsOfCurrentScript()
  const start = new Date(date.getTime())
  start.setSeconds(0, 0)
  for (const item of items) {
    const seconds = Math.round((start.getTime() + (item.triggerMin - now.min) * 60000 - Date.now()) / 1000)
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
  const key = knownKey(cfg.slot)
  const saved = Storage.get<{ key: string; known: Known }>(key)
  const prev = saved && saved.key === queueKey(cfg) ? saved.known : null
  const next = knownWindows(prev, sched, now)
  Storage.set(key, { key: queueKey(cfg), known: next })
  const message = notifyPrefs(cfg).change ? changeMessage(scheduleChanges(prev, next, now), now, cfg.group, cfg.place) : null
  if (!message) return
  await Notification.schedule({ title: message.title, body: message.body, threadIdentifier: THREAD, interruptionLevel: "timeSensitive" })
}

export async function updateNotifications(base: Config, scheds: Scheds, now: Now, date: Date): Promise<void> {
  const list = schedsOf(scheds)
  await syncPlanned(base, list, now, date)
  const addresses = addressesOf(base)
  for (let i = 0; i < addresses.length; i++) await checkChange(addresses[i], list[i] ?? null, now)
}

// Сповіщення необовʼязкові: їхня помилка чи зависання не повинні лишити віджет порожнім.
export async function tryUpdateNotifications(base: Config, scheds: Scheds, now: Now, date: Date, timeoutMs: number): Promise<void> {
  let timer: number | undefined
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, timeoutMs) as unknown as number
  })
  try {
    await Promise.race([updateNotifications(base, scheds, now, date), timeout])
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
  Storage.remove(knownKey(1))
  await Notification.removeAllPendingsOfCurrentScript()
}

// Друга адреса змінилася чи зникла: памʼять про її графік більше не годиться, а перша лишається.
export function forgetSecond(): void {
  Storage.remove(knownKey(1))
  Storage.remove(PLANNED_KEY)
}
