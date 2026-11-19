// Віджет: бере графік (кеш 10 хвилин) і, якщо ввімкнено, тривоги, оновлює сповіщення й малює потрібний розмір.
// Після Widget.present() скрипт одразу зупиняється, тому все робимо до нього.
import { Widget, VStack, Text } from "scripting"
import { SETTINGS, addressesOf, buildView, kyivParts, refreshDate, slotFromParameter } from "./logic"
import { alertRefreshMinutes, pageKey, pageMode, pagesOf } from "./alerts"
import { cachedAlerts, freshAlerts, readAlerts, readConfig, readPage, widgetDataAll } from "./store"
import { tryUpdateNotifications } from "./notifications"
import type { Backdrop } from "./theme"
import { WidgetContent } from "./widget_view"

async function main() {
  const base = readConfig()
  // Друга адреса: у полі Parameter налаштувань віджета «2» (чи назва другої адреси).
  const slot = slotFromParameter(Widget.parameter, base)
  const settings = readAlerts()
  const pages = pagesOf(!!settings.enabled)
  const family = Widget.family
  const key = pageKey(family, Widget.parameter)
  const started = new Date()
  const mode = pageMode(readPage(key), pages, started.getTime())
  // Щойно торкнулися значка в стовпчику: малюємо збережене одразу, а мережу лишаємо плановому оновленню.
  // Інакше графік, датчик СвітлоБота й тривоги паралельно й не довше за SETTINGS.widgetBudgetMs: без інтернету
  // віджет малює збережене, а не чекає, доки iOS його зупинить і він лишиться старим.
  const [all, alerts] = await Promise.all([
    widgetDataAll(base, kyivParts(started), mode.quick),
    mode.quick ? Promise.resolve(cachedAlerts(settings)) : freshAlerts(settings, false, SETTINGS.widgetBudgetMs, SETTINGS.widgetRequestMs),
  ])
  const cfg = addressesOf(base)[slot] ?? null
  const { data, fact } = all[slot] ?? all[0]
  const date = new Date()
  const now = kyivParts(date)
  const view = buildView(cfg, { ...data, fact }, now)
  // Сповіщення про обидві адреси, хоч віджет показує одну.
  if (base && !mode.quick) await tryUpdateNotifications(base, all.map((f) => f.data.sched), now, date, 3000)
  const size = Widget.displaySize
  // Прозорий фон із налаштувань віджета Scripting: шпалери, намальовані під віджетом, або тло, яке малює сама iOS.
  const backdrop: Backdrop = Widget.isTransparentMode || Widget.isBlurMode ? "system" : Widget.isTransparentBackground ? "simulated" : "none"
  // З тривогами просимо оновлення частіше (iOS усе одно вирішує сама, коли), а обрану сторінку тривоги
  // повертаємо на світло, щойно мине її час.
  const alertMinutes = alerts ? alertRefreshMinutes(alerts.status, alerts.posts, date.getTime()) : null
  let reload = refreshDate(view, now, date, alertMinutes).getTime()
  if (mode.until !== null) reload = Math.min(reload, mode.until + 1000)
  Widget.present(
    <WidgetContent
      view={view}
      now={now}
      date={date}
      family={family}
      width={size.width}
      height={size.height}
      backdrop={backdrop}
      alertState={alerts ? alerts.status : null}
      pages={pages}
      page={mode.page}
      pageKey={key}
    />,
    { reloadPolicy: { policy: "after", date: new Date(reload) } }
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
