// Кнопки у віджеті. «↻»: свіжий графік і стан датчика з мережі (для обох адрес), тривоги й канал моніторингу,
// сповіщення, і віджет перемальовується одразу. Значки в стовпчику: показати сторінку модуля (світло чи тривога).
import { AppIntentManager, AppIntentProtocol, Widget } from "scripting"
import { SETTINGS, kyivParts } from "./logic"
import { ALERT } from "./alerts"
import { freshAlerts, freshAll, readAlerts, readConfig, writePage } from "./store"
import { tryUpdateNotifications } from "./notifications"

export const RefreshIntent = AppIntentManager.register({
  name: "RefreshIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async () => {
    const base = readConfig()
    const date = new Date()
    const now = kyivParts(date)
    // Без інтернету не довше за SETTINGS.buttonBudgetMs, а віджет після цього одразу малює збережене.
    const light = async () => {
      if (!base) return
      const all = await freshAll(base, now, true, SETTINGS.buttonBudgetMs, SETTINGS.widgetRequestMs)
      await tryUpdateNotifications(base, all.map((f) => f.data.sched), now, date, 3000)
    }
    await Promise.all([light(), freshAlerts(readAlerts(), true, SETTINGS.buttonBudgetMs, SETTINGS.widgetRequestMs)])
    Widget.reloadAll()
  },
})

// key: який це віджет (розмір і поле Parameter), щоб інші віджети лишилися на своїх сторінках.
// Сторінку тривоги спершу коротко оновлюємо, тож вона одразу свіжа; далі віджет малює збережене без мережі.
export const PageIntent = AppIntentManager.register({
  name: "PageIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async ({ page, key }: { page: string; key: string }) => {
    writePage(String(key || ""), String(page || ""))
    if (page === ALERT) await freshAlerts(readAlerts(), false, SETTINGS.pageBudgetMs, SETTINGS.widgetRequestMs)
    Widget.reloadAll()
  },
})

// До 2.0 малий і середній віджет мали кнопку «Завтра ›». Поки iOS не перемалювала старий віджет, дотик до неї
// просто оновлює віджет (тепер завтра видно рядком поруч із сьогодні).
export const DayIntent = AppIntentManager.register({
  name: "DayIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async () => {
    Widget.reloadAll()
  },
})
