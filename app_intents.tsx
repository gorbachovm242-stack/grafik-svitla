// Кнопка «↻» у віджеті: свіжий графік і стан датчика з мережі, сповіщення, і віджет перемальовується одразу.
import { AppIntentManager, AppIntentProtocol, Widget } from "scripting"
import { kyivParts } from "./logic"
import { getFact, getSchedule, readConfig } from "./store"
import { tryUpdateNotifications } from "./notifications"

export const RefreshIntent = AppIntentManager.register({
  name: "RefreshIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async () => {
    const cfg = readConfig()
    if (cfg) {
      const date = new Date()
      const now = kyivParts(date)
      const [data] = await Promise.all([getSchedule(cfg, now, true, 15000), getFact(cfg, true)])
      await tryUpdateNotifications(cfg, data.sched, now, date, 4000)
    }
    Widget.reloadAll()
  },
})
