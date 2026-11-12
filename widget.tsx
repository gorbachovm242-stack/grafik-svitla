// Віджет: бере графік (кеш 10 хвилин), оновлює сповіщення й малює потрібний розмір.
// Після Widget.present() скрипт одразу зупиняється, тому все робимо до нього.
import { Widget, VStack, Text } from "scripting"
import { SETTINGS, addressesOf, buildView, dayMode, kyivParts, slotFromParameter, tomorrowShown, widgetReloadDate } from "./logic"
import { readConfig, readDay, widgetDataAll } from "./store"
import { tryUpdateNotifications } from "./notifications"
import { WidgetContent } from "./widget_view"

async function main() {
  const base = readConfig()
  // Друга адреса: у полі Parameter налаштувань віджета «2» (чи назва другої адреси).
  const slot = slotFromParameter(Widget.parameter, base)
  const started = new Date()
  const mode = dayMode(readDay(), kyivParts(started), started.getTime())
  // Щойно натиснули «Завтра ›» чи «‹ Сьогодні»: малюємо збережене одразу, а мережу лишаємо плановому оновленню.
  // Інакше графік і датчик СвітлоБота обох адрес паралельно й не довше за SETTINGS.widgetBudgetMs: без інтернету
  // віджет малює збережене, а не чекає, доки iOS його зупинить і він лишиться старим.
  const all = await widgetDataAll(base, kyivParts(started), mode.quick)
  const cfg = addressesOf(base)[slot] ?? null
  const { data, fact } = all[slot] ?? all[0]
  const date = new Date()
  const now = kyivParts(date)
  const view = buildView(cfg, { ...data, fact }, now)
  // Сповіщення про обидві адреси, хоч віджет показує одну.
  if (base && !mode.quick) await tryUpdateNotifications(base, all.map((f) => f.data.sched), now, date, 3000)
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
