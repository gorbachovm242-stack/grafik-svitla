// Кнопки у віджеті. «↻»: свіжий графік і стан датчика з мережі, сповіщення, і віджет перемальовується одразу.
// «Завтра ›» і «‹ Сьогодні»: малий і середній віджет показують інший день, малюючи збережене без мережі.
import { AppIntentManager, AppIntentProtocol, Widget } from "scripting"
import { SETTINGS, kyivParts } from "./logic"
import { freshData, readConfig, writeDay } from "./store"
import { tryUpdateNotifications } from "./notifications"

export const RefreshIntent = AppIntentManager.register({
  name: "RefreshIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async () => {
    const cfg = readConfig()
    if (cfg) {
      const date = new Date()
      const now = kyivParts(date)
      // Без інтернету не довше за SETTINGS.buttonBudgetMs, а віджет після цього одразу малює збережене.
      const { data } = await freshData(cfg, now, true, SETTINGS.buttonBudgetMs, SETTINGS.widgetRequestMs)
      await tryUpdateNotifications(cfg, data.sched, now, date, 3000)
    }
    Widget.reloadAll()
  },
})

export const DayIntent = AppIntentManager.register({
  name: "DayIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async ({ tomorrow }: { tomorrow: boolean }) => {
    writeDay(tomorrow === true, kyivParts(new Date()))
    Widget.reloadAll()
  },
})
