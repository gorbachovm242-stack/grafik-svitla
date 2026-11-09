// Налаштування, кеш графіка й завантаження з мережі. Сховище спільне для застосунку, віджета й кнопки «↻».
import type { Config, Data, Now, Sched, Region } from "./logic"
import { SETTINGS, fetchSchedule, groupsFor } from "./logic"

const CONFIG_KEY = "config"
const CACHE_KEY = "cache"

export function readConfig(): Config | null {
  const cfg = Storage.get<Config>(CONFIG_KEY)
  return cfg && cfg.region && cfg.group ? cfg : null
}

export function writeConfig(cfg: Config): void {
  Storage.set(CONFIG_KEY, cfg)
}

export function readCache(): Sched | null {
  return Storage.get<Sched>(CACHE_KEY)
}

export function clearCache(): void {
  Storage.remove(CACHE_KEY)
}

// Один запит із тайм-аутом. Помилка HTTP теж помилка, а не порожня сторінка.
export async function loadText(url: string): Promise<string> {
  const response = await fetch(url, {
    timeout: SETTINGS.timeoutSeconds,
    headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148" },
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.text()
}

// Перші 10 хвилин після завантаження мережу не чіпаємо. Не вдалося оновити: працюємо зі збереженим.
export async function getSchedule(cfg: Config, now: Now, force: boolean, budgetMs: number = Infinity): Promise<Data> {
  const key = `${cfg.region}|${cfg.group}`
  const cached = readCache()
  const valid = cached && cached.key === key ? cached : null
  const ageMinutes = valid && valid.fetchedAt ? (Date.now() - valid.fetchedAt) / 60000 : Infinity
  if (!force && ageMinutes < SETTINGS.cacheMinutes) return { sched: valid, status: "ok" }
  const result = await fetchSchedule(cfg, now.ymd, loadText, budgetMs, (message) => console.log(message))
  if (result.status === "ok") {
    const sched: Sched = Object.assign(result.sched, { key, fetchedAt: Date.now() })
    Storage.set(CACHE_KEY, sched)
    return { sched, status: "ok" }
  }
  return { sched: valid, status: result.status }
}

export function loadGroups(region: Region): Promise<string[]> {
  return groupsFor(region, loadText)
}
