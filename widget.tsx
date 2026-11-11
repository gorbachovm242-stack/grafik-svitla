// Віджет: бере графік (кеш 10 хвилин), оновлює сповіщення й малює потрібний розмір.
// Після Widget.present() скрипт одразу зупиняється, тому все робимо до нього.
import { Widget, VStack, Text } from "scripting"
import { SETTINGS, buildView, dayMode, kyivParts, tomorrowShown, widgetReloadDate } from "./logic"
import { readConfig, readDay, widgetData } from "./store"
import { tryUpdateNotifications } from "./notifications"
import { WidgetContent } from "./widget_view"

async function main() {
  const cfg = readConfig()
  const started = new Date()
  const mode = dayMode(readDay(), kyivParts(started), started.getTime())
  // Щойно натиснули «Завтра ›» чи «‹ Сьогодні»: малюємо збережене одразу, а мережу лишаємо плановому оновленню.
  // Інакше графік і датчик СвітлоБота паралельно й не довше за SETTINGS.widgetBudgetMs: без інтернету віджет
  // малює збережене, а не чекає, доки iOS його зупинить і він лишиться старим.
  const { data, fact } = await widgetData(cfg, kyivParts(started), mode.quick)
  const date = new Date()
  const now = kyivParts(date)
  const view = buildView(cfg, { ...data, fact }, now)
  if (cfg && !mode.quick) await tryUpdateNotifications(cfg, data.sched, now, date, 3000)
  const family = Widget.family
  const tomorrow = tomorrowShown(mode, view, family)
  const size = Widget.displaySize
  // Прозорий фон: імітація з налаштувань віджета або віджет Scripting із прозорим чи розмитим тлом.
  const transparent = !!(Widget.isTransparentBackground || Widget.isTransparentMode || Widget.isBlurMode)
  Widget.present(
    <WidgetContent
      view={view}
      now={now}
      date={date}
      family={family}
      width={size.width}
      height={size.height}
      transparent={transparent}
      tomorrow={tomorrow}
    />,
    // Завтра віджет показує недовго: просимо iOS повернути сьогоднішній день, щойно мине SETTINGS.tomorrowHoldMinutes.
    { reloadPolicy: { policy: "after", date: widgetReloadDate(view, now, date, mode, tomorrow) } }
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
