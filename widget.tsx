// Віджет: бере графік (кеш 10 хвилин), оновлює сповіщення й малює потрібний розмір.
// Після Widget.present() скрипт одразу зупиняється, тому все робимо до нього.
import { Widget, VStack, Text } from "scripting"
import { SETTINGS, buildView, kyivParts, refreshDate } from "./logic"
import type { Data } from "./logic"
import { getFact, getSchedule, readConfig } from "./store"
import { tryUpdateNotifications } from "./notifications"
import { WidgetContent } from "./widget_view"

async function main() {
  const date = new Date()
  const now = kyivParts(date)
  const cfg = readConfig()
  // Графік і датчик СвітлоБота паралельно: віджет має обмежений час.
  const [data, fact]: [Data, Awaited<ReturnType<typeof getFact>>] = await Promise.all([
    cfg ? getSchedule(cfg, now, false, SETTINGS.widgetBudgetMs) : Promise.resolve<Data>({ sched: null, status: "ok" }),
    getFact(cfg, false),
  ])
  const view = buildView(cfg, { ...data, fact }, now)
  if (cfg) await tryUpdateNotifications(cfg, data.sched, now, date, 4000)
  const size = Widget.displaySize
  // Прозорий фон: імітація з налаштувань віджета або віджет Scripting із прозорим чи розмитим тлом.
  const transparent = !!(Widget.isTransparentBackground || Widget.isTransparentMode || Widget.isBlurMode)
  Widget.present(
    <WidgetContent
      view={view}
      now={now}
      date={date}
      family={Widget.family}
      width={size.width}
      height={size.height}
      transparent={transparent}
    />,
    { reloadPolicy: { policy: "after", date: refreshDate(view, now, date) } }
  )
}

// Непередбачена помилка дає повідомлення, а не порожній віджет.
main().catch((e) => {
  Widget.present(
    <VStack alignment="leading" spacing={2} padding={12}>
      <Text font={13} fontWeight="semibold">Помилка віджета</Text>
      <Text font={11} lineLimit={3}>{String(e)}</Text>
    </VStack>,
    { reloadPolicy: { policy: "after", date: new Date(Date.now() + SETTINGS.refreshMinutes * 60000) } }
  )
})
