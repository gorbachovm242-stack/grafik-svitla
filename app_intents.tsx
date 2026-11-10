// Кнопка «↻» у віджеті: свіжий графік і стан датчика з мережі, сповіщення, і віджет перемальовується одразу.
import { AppIntentManager, AppIntentProtocol, Widget } from "scripting"
import { SETTINGS, kyivParts } from "./logic"
import { freshData, readConfig } from "./store"
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
