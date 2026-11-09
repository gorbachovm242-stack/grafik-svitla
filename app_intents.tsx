// Кнопка «↻» у віджеті: свіжий графік із мережі, сповіщення, і віджет перемальовується одразу.
import { AppIntentManager, AppIntentProtocol, Widget } from "scripting"
import { kyivParts } from "./logic"
import { getSchedule, readConfig } from "./store"
import { tryUpdateNotifications } from "./notifications"

export const RefreshIntent = AppIntentManager.register({
  name: "RefreshIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async () => {
    const cfg = readConfig()
    if (cfg) {
      const date = new Date()
      const now = kyivParts(date)
      const data = await getSchedule(cfg, now, true, 15000)
      await tryUpdateNotifications(cfg, data.sched, now, date, 4000)
    }
    Widget.reloadAll()
  },
})
