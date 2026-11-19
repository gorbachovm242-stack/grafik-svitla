// Розкладки віджета для всіх розмірів. Таймер іде сам, навіть якщо iOS довго не оновлює віджет.
// Коли в налаштуваннях увімкнено тривогу, праворуч стовпчик значків модулів (світло, тривога) на мʼякій доріжці
// й під ним кружечки сторінок, як у «Маяку» для Android: дотик до значка показує сторінку модуля,
// дотик до самої сторінки відкриває налаштування. Без тривоги віджет такий, як і був: лише світло.
import {
  VStack, HStack, ZStack, Spacer, Text, Image, Button, TimerIntervalLabel, DateLabel, Circle, Capsule, Rectangle,
} from "scripting"
import type { FontWeight, TextAlignment, VirtualNode, WidgetFamily } from "scripting"
import type { Now, Run, View } from "./logic"
import {
  DEFAULT_LOOK, bulbState, captionText, changeDate, changeVerb, hasTimer, hasTomorrow, hm, isCharging, keepTogether, lockLine,
  lockLookOf, lockTitle, lockVerb, lookOf, quietWords, todayRow, tomorrowFirst, tomorrowRow, windowText,
} from "./logic"
import type { AlertStatus } from "./alerts"
import { ALERT, LIGHT, active, alertPill, alertShortTitle, compactPlace } from "./alerts"
import { Battery, DayLook, Garland, House, PICTURES, Ring, Tiles } from "./looks"
import type { Backdrop, IconTok, Ink, PageTok, Tokens } from "./theme"
import {
  LOCK_PAINT, LOCK_RING, alertGlyph, alertIcon, alertPage, backgroundFill, fade, homePaint, lightGlyph, lightIcon, lightOf,
  ringColors, tokensFor,
} from "./theme"
import { PageIntent, RefreshIntent } from "./app_intents"

export type Ctx = {
  view: View
  now: Now
  date: Date
  t: Tokens
  width: number // увесь віджет
  height: number
  contentW: number // сторінка без стовпчика значків
  alert: AlertStatus | null // null: модуль тривоги вимкнено (стовпчика немає)
  pages: string[]
  page: string
  pageKey: string // який це віджет: для кнопок у стовпчику
}

const railOn = (c: Ctx) => c.alert !== null

// Ширина стовпчика: доріжка (значок і відступи), смужка відкритої сторінки й поле до краю.
const RAIL_SMALL = 34
const RAIL_WIDE = 46

const fill = { maxWidth: "infinity" as const, maxHeight: "infinity" as const }

// ---------- Елементи ----------

function Label({
  text, size, weight = "regular", color, lines = 1, scale = 0.7, rounded = false, align, fixed = false, truncate = false,
}: {
  text: string; size: number; weight?: FontWeight; color?: Ink | null; lines?: number; scale?: number; rounded?: boolean
  align?: TextAlignment; fixed?: boolean; truncate?: boolean
}) {
  return (
    <Text
      font={size}
      fontWeight={weight}
      fontDesign={rounded ? "rounded" : undefined}
      foregroundStyle={color ?? undefined}
      lineLimit={lines}
      minScaleFactor={scale}
      multilineTextAlignment={align}
      fixedSize={fixed ? { horizontal: true, vertical: false } : undefined}
      truncationMode={truncate ? "tail" : undefined}
    >
      {keepTogether(text)}
    </Text>
  )
}

function Timer({
  c, size, weight = "regular", color, align = "leading", width,
}: { c: Ctx; size: number; weight?: FontWeight; color?: Ink | null; align?: TextAlignment; width?: number }) {
  const frameAlign = align === "trailing" ? "trailing" : align === "center" ? "center" : "leading"
  return (
    <TimerIntervalLabel
      from={c.date.getTime()}
      to={changeDate(c.view, c.now, c.date).getTime()}
      countsDown
      font={size}
      fontWeight={weight}
      fontDesign="monospaced"
      monospacedDigit
      foregroundStyle={color ?? undefined}
      multilineTextAlignment={align}
      lineLimit={1}
      minScaleFactor={0.7}
      frame={width ? { width, alignment: frameAlign } : undefined}
    />
  )
}

// Таймер тривоги рахує вгору від її початку.
function AlertTimer({ s, size, color }: { s: AlertStatus; size: number; color: Ink }) {
  return (
    <DateLabel
      date={new Date(s.since)}
      style="timer"
      font={size}
      fontWeight="bold"
      fontDesign="monospaced"
      monospacedDigit
      foregroundStyle={color}
      lineLimit={1}
      frame={{ width: Math.round(size * 0.62 * 8), alignment: "leading" }}
    />
  )
}

function Refresh({ color, size = 22 }: { color: Ink; size?: number }) {
  return (
    <Button intent={RefreshIntent(undefined)} buttonStyle="plain">
      <Image systemName="arrow.clockwise" font={size * 0.52} fontWeight="semibold" foregroundStyle={color} frame={{ width: size, height: size }} />
    </Button>
  )
}

function statusColor(kind: string, t: Tokens): Ink {
  if (kind === "on") return t.titleBolt
  if (kind === "off") return t.text
  if (kind === "maybe" || kind === "check") return t.warn
  return t.muted
}

function statusSymbol(kind: string): string {
  if (kind === "on") return "bolt.fill"
  if (kind === "off") return "bolt.slash.fill"
  if (kind === "maybe" || kind === "check") return "exclamationmark.triangle.fill"
  return "questionmark.circle"
}

// Великий час: зі світлом колір тексту, без нього той самий бурштиновий, що й блискавка.
const timeColor = (c: Ctx) => (c.view.kind === "on" ? c.t.text : c.t.titleBolt)

// Коли адрес дві, замість «черга 3.2» назва адреси («Батьки»): так видно, який це віджет.
function footerText(view: View): string {
  return view.noticeShort || view.place || `черга ${view.group}`
}

function Footer({ c, size = 11 }: { c: Ctx; size?: number }) {
  return <Label text={footerText(c.view)} size={size} color={c.view.noticeShort ? c.t.warn : c.t.muted} />
}

function Checked({ c }: { c: Ctx }) {
  return c.view.checked !== null ? <Label text={`перевірено ${hm(c.view.checked)}`} size={10} color={c.t.muted} /> : <Spacer />
}

// Кружечок зі станом: заливка, обідок чи кільце (пунктир — немає даних).
function Dot({ tok, size }: { tok: IconTok; size: number }) {
  return (
    <ZStack frame={{ width: size, height: size }}>
      <Circle fill={tok.fill} frame={{ width: size, height: size }} />
      {tok.rim ? <Circle stroke={{ shapeStyle: tok.rim, strokeStyle: { lineWidth: 1.2 } }} frame={{ width: size - 1.2, height: size - 1.2 }} /> : null}
      {tok.ring ? (
        <Circle
          stroke={{ shapeStyle: tok.ring, strokeStyle: { lineWidth: 1.6, dash: tok.dashed ? [2, 1.6] : undefined } }}
          frame={{ width: size - 1.6, height: size - 1.6 }}
        />
      ) : null}
    </ZStack>
  )
}

// Датчик СвітлоБота: чи є світло насправді (бурштинова крапка — є, темна — немає, пунктир — датчик мовчить).
function SensorDot({ c, size = 9 }: { c: Ctx; size?: number }) {
  const fact = c.view.fact
  if (!fact) return null
  const tok = fact.kind === "on" ? c.t.sensor.on : fact.kind === "off" ? c.t.sensor.off : c.t.sensor.silent
  return <Dot tok={tok} size={size} />
}

// Рядок датчика: крапка, слова, а без світла ще й живий таймер від вимкнення.
// На екрані блокування iOS фарбує все сама, тож lock: без кольорів.
function FactLine({ c, compact = false, size = 11, lock = false }: { c: Ctx; compact?: boolean; size?: number; lock?: boolean }) {
  const fact = c.view.fact
  if (!fact) return null
  // Поруч із живим таймером повний рядок не вміщується: «Немає з 11:53» і таймер.
  const withTimer = !compact && fact.timerFrom !== null
  const short = fact.short.charAt(0).toUpperCase() + fact.short.slice(1)
  const text = compact ? fact.short : withTimer ? short : `${fact.line}${fact.checked ? ` · ${fact.checked}` : ""}`
  const color = lock ? null : c.t.text
  return (
    <HStack spacing={3}>
      {lock ? (
        <Image systemName={fact.kind === "on" || fact.kind === "off" ? "circle.fill" : "circle.dashed"} font={size * 0.62} />
      ) : (
        <SensorDot c={c} size={Math.round(size * 0.75)} />
      )}
      <Label text={text} size={size} weight="medium" color={color} scale={0.75} />
      {withTimer && fact.timerFrom !== null ? (
        <DateLabel
          date={new Date(fact.timerFrom)}
          style="timer"
          font={size}
          fontWeight="medium"
          fontDesign="monospaced"
          monospacedDigit
          foregroundStyle={color ?? undefined}
          lineLimit={1}
          frame={{ width: size * 4.6, alignment: "leading" }}
        />
      ) : null}
    </HStack>
  )
}

// Напис біля значка тривоги на сторінці світла (середній і великий віджет), коли щось не так.
// Довгий («Тривога з 10:40»), якщо поруч вистачає місця, інакше короткий («з 10:40»).
function pillText(c: Ctx, room: number): string | null {
  const s = c.alert
  if (!s) return null
  const long = alertPill(s, false)
  if (!long) return null
  const width = (text: string) => text.length * 12 * 0.55 + 18
  return width(long) <= room ? long : alertPill(s, true)
}

function Pill({ c, text }: { c: Ctx; text: string }) {
  const s = c.alert as AlertStatus
  const tok = s.kind === "setup" ? c.t.icons.stale : alertIcon(c.t, s.kind)
  return (
    <HStack spacing={0} padding={{ leading: 9, trailing: 9, top: 3, bottom: 3 }} background={{ style: tok.pillBg ?? tok.fill, shape: "capsule" }}>
      <Label text={text} size={12} weight="bold" color={tok.pillText ?? tok.glyph} scale={0.75} />
    </HStack>
  )
}

// Заголовок стану світла, подробиці й таймер. pill: напис тривоги в рядку таймера (праворуч, біля стовпчика).
function Status({ c, withTimer = true, pill = null }: { c: Ctx; withTimer?: boolean; pill?: VirtualNode | null }) {
  const { view, t } = c
  const timer = !view.notice && withTimer && hasTimer(view, c.now)
  return (
    <VStack alignment="leading" spacing={1}>
      <HStack spacing={4}>
        <Image systemName={statusSymbol(view.kind)} font={15} fontWeight="semibold" foregroundStyle={statusColor(view.kind, t)} />
        <Label text={view.title} size={18} weight="bold" color={t.text} />
      </HStack>
      <Label text={view.sub} size={13} weight="medium" color={t.text} lines={2} />
      {view.notice ? <Label text={view.notice} size={12} weight="semibold" color={t.warn} /> : null}
      {timer || pill ? (
        <HStack spacing={4}>
          {timer ? <Timer c={c} size={13} weight="medium" color={t.timer} /> : null}
          <Spacer minLength={4} />
          {pill}
        </HStack>
      ) : null}
    </VStack>
  )
}

function Centered({ children }: { children: VirtualNode }) {
  return (
    <HStack spacing={0}>
      <Spacer minLength={0} />
      {children}
      <Spacer minLength={0} />
    </HStack>
  )
}

// Батарея з написом усередині. Напис центровано в частині ліворуч від блискавки:
// зовнішній блок має розмір батареї, внутрішній лише відступи (порядок модифікаторів тут не важить).
function BatteryDial({ c, width, height }: { c: Ctx; width: number; height: number }) {
  const charging = isCharging(c.view)
  const words = c.view.changeMin === null ? quietWords(c.view) : c.view.short
  return (
    <ZStack frame={{ width, height }}>
      <Battery width={width} height={height} view={c.view} paint={homePaint("battery", c.t)} />
      <VStack spacing={0} frame={{ width, height }}>
        <VStack spacing={0} padding={{ leading: 8, trailing: charging ? Math.round(height * 0.62) : 14 }}>
          {hasTimer(c.view, c.now) ? (
            <Timer c={c} size={Math.round(height * 0.33)} weight="bold" color={c.t.text} align="center" />
          ) : (
            <Label text={words} size={14} weight="semibold" color={c.t.text} lines={2} align="center" />
          )}
        </VStack>
      </VStack>
    </ZStack>
  )
}

// Написи всередині кільця: дія, час і таймер або короткі слова. below: рядок про завтра під ними.
function DialText({ c, unit, withTimer, below = null }: { c: Ctx; unit: number; withTimer: boolean; below?: string | null }) {
  const { view, t } = c
  const footer = view.noticeShort ? (
    <Label text={view.noticeShort} size={11 * unit} weight="medium" color={t.warn} align="center" />
  ) : withTimer && hasTimer(view, c.now) ? (
    <Timer c={c} size={12 * unit} color={t.timer} align="center" />
  ) : (
    <Label text={view.place || `черга ${view.group}`} size={11 * unit} weight="medium" color={t.muted} align="center" />
  )
  const place = view.place && (view.noticeShort || (withTimer && hasTimer(view, c.now))) ? (
    <Label text={view.place} size={11 * unit} weight="semibold" color={t.brand} align="center" />
  ) : null
  const tomorrow = below ? <Label text={below} size={9.5 * unit} weight="semibold" color={t.brand} align="center" /> : null
  if (view.changeMin === null) {
    return (
      <VStack spacing={2}>
        {place}
        <Label text={quietWords(view)} size={13 * unit} weight="semibold" color={t.text} lines={2} align="center" />
        {footer}
        {tomorrow}
      </VStack>
    )
  }
  return (
    <VStack spacing={0}>
      {place}
      <Label text={changeVerb(view)} size={11 * unit} weight="medium" color={t.muted} align="center" />
      <Label text={view.short} size={26 * unit} weight="bold" rounded color={timeColor(c)} />
      {footer}
      {tomorrow}
    </VStack>
  )
}

function TomorrowText({ c, unit }: { c: Ctx; unit: number }) {
  const { view, t } = c
  const windows = view.tomorrowWindows || []
  if (!view.tomorrowRuns || !windows.length) {
    return (
      <Label text={view.tomorrowRuns ? "Без\nвідключень" : "Ще\nнемає"} size={13 * unit} weight="semibold" color={t.text} lines={2} align="center" />
    )
  }
  return (
    <VStack spacing={0}>
      <Label text="перше" size={11 * unit} weight="medium" color={t.muted} />
      <Label text={hm(windows[0].s)} size={25 * unit} weight="bold" rounded color={t.text} />
    </VStack>
  )
}

function RingDial({ c, size, runs, nowMin, center }: { c: Ctx; size: number; runs: Run[]; nowMin: number | null; center: VirtualNode }) {
  return (
    <ZStack frame={{ width: size, height: size }}>
      <Ring size={size} lineWidth={9} runs={runs} nowMin={nowMin} colors={ringColors(c.t)} hoursColor={c.t.muted} />
      {center}
    </ZStack>
  )
}

// ---------- Стовпчик значків ----------

// Значок модуля: коло стану з відступом кольору фону, обідок чи кільце (пунктир — немає даних), знак, світіння.
function StatusIcon({ icon, glyph, size, halo }: { icon: IconTok; glyph: string; size: number; halo: Ink | null }) {
  const box = size + 4
  return (
    <ZStack frame={{ width: box, height: box }}>
      {halo && lightOf(halo) !== "clear" ? <Circle fill={halo} frame={{ width: box, height: box }} /> : null}
      <Circle fill={icon.fill} frame={{ width: size, height: size }} shadow={icon.glow ? { color: icon.glow, radius: size * 0.2 } : undefined} />
      {icon.rim ? <Circle stroke={{ shapeStyle: icon.rim, strokeStyle: { lineWidth: 1.5 } }} frame={{ width: size - 1.5, height: size - 1.5 }} /> : null}
      {icon.ring ? (
        <Circle
          stroke={{ shapeStyle: icon.ring, strokeStyle: { lineWidth: 2.5, dash: icon.dashed ? [size * 0.16, size * 0.12] : undefined } }}
          frame={{ width: size - 2.5, height: size - 2.5 }}
        />
      ) : null}
      <Image systemName={glyph} font={Math.round(size * 0.46)} fontWeight="bold" foregroundStyle={icon.glyph} />
    </ZStack>
  )
}

function railItems(c: Ctx): { page: string; icon: IconTok; glyph: string }[] {
  const s = c.alert as AlertStatus
  return [
    { page: LIGHT, icon: lightIcon(c.t, c.view.kind), glyph: lightGlyph(c.view.kind) },
    { page: ALERT, icon: alertIcon(c.t, s.kind), glyph: alertGlyph(s.kind) },
  ]
}

// Кружечки сторінок: відкрита — капсула, інші — кільця.
function Dots({ c, small }: { c: Ctx; small: boolean }) {
  const d = small ? 5 : 6
  return (
    <HStack spacing={small ? 3 : 4}>
      {c.pages.map((p) =>
        p === c.page ? (
          <Capsule fill={c.t.dotOn} frame={{ width: small ? 10 : 13, height: d }} />
        ) : (
          <Circle stroke={{ shapeStyle: c.t.dotOff, strokeStyle: { lineWidth: 1.5 } }} frame={{ width: d, height: d }} />
        ),
      )}
    </HStack>
  )
}

// Стовпчик: значки на доріжці, смужка біля значка відкритої сторінки, унизу кружечки. У малому віджеті «↻»
// теж тут, над кружечками: на сторінці він стояв би впритул до значків і натискався б замість них.
// Дотик до значка іншої сторінки показує її; значок відкритої сторінки не кнопка, тож відкриває налаштування.
function Rail({ c, small }: { c: Ctx; small: boolean }) {
  const size = small ? 24 : 32
  const cell = size + 4
  const pitch = small ? 30 : 39
  const items = railItems(c)
  const icons = items.map((it) => {
    const icon = <StatusIcon icon={it.icon} glyph={it.glyph} size={size} halo={c.t.halo} />
    return it.page === c.page ? icon : (
      <Button intent={PageIntent({ page: it.page, key: c.pageKey })} buttonStyle="plain">
        {icon}
      </Button>
    )
  })
  const markers = items.map((it) => (
    <ZStack frame={{ width: 3, height: cell }}>
      {it.page === c.page ? <Capsule fill={c.t.marker} frame={{ width: 3, height: small ? 14 : 18 }} /> : null}
    </ZStack>
  ))
  return (
    <VStack spacing={0} frame={{ width: small ? RAIL_SMALL : RAIL_WIDE, maxHeight: "infinity" }} padding={{ top: small ? 7 : 6, bottom: small ? 9 : 11 }}>
      <HStack spacing={1} alignment="top">
        <VStack spacing={pitch - cell} padding={small ? 0 : 1} background={{ style: c.t.track, shape: "capsule" }}>
          {icons}
        </VStack>
        <VStack spacing={pitch - cell} padding={{ top: small ? 0 : 1, bottom: small ? 0 : 1 }}>
          {markers}
        </VStack>
      </HStack>
      <Spacer minLength={0} />
      {small ? <Refresh color={c.t.refresh} size={20} /> : null}
      {small ? <Spacer minLength={4} /> : null}
      <Dots c={c} small={small} />
    </VStack>
  )
}

// ---------- Робочий екран: сторінка світла ----------

// Коли графіка немає, малюнку нічого показувати: лишаються слова. В «Маяку» «↻» унизу, подалі від значків.
function TextOnly({ c, small = false }: { c: Ctx; small?: boolean }) {
  const rail = railOn(c)
  const room = c.contentW - 40
  const pill = rail && !small ? pillText(c, room) : null
  return (
    <VStack alignment="leading" spacing={4} padding={{ top: 14, leading: 14, bottom: 12, trailing: rail ? 4 : 12 }} frame={{ ...fill, alignment: "topLeading" }}>
      <HStack spacing={4}>
        <Label text={captionText(c.view)} size={11} color={c.t.muted} />
        <Spacer minLength={0} />
        {rail ? null : <Refresh color={c.t.refresh} />}
      </HStack>
      <Status c={c} pill={pill ? <Pill c={c} text={pill} /> : null} />
      <FactLine c={c} size={12} />
      <Spacer minLength={0} />
      {rail && !small ? (
        <HStack spacing={0}>
          <Spacer minLength={0} />
          <Refresh color={c.t.refresh} />
        </HStack>
      ) : null}
    </VStack>
  )
}

// Малий віджет: коли графік на завтра вже є, «завтра» і перше відключення над нижнім рядком.
function TomorrowLines({ c, size = 12 }: { c: Ctx; size?: number }) {
  const first = tomorrowFirst(c.view)
  if (!first) return null
  return (
    <VStack alignment="leading" spacing={0}>
      <Label text="завтра" size={size - 1} weight="semibold" color={c.t.brand} />
      <Label text={first} size={size} weight="medium" color={c.t.text} scale={0.6} />
    </VStack>
  )
}

function ChangeColumn({ c }: { c: Ctx }) {
  const { view, t } = c
  const rail = railOn(c)
  return (
    <VStack alignment="leading" spacing={0} frame={{ maxWidth: "infinity", maxHeight: "infinity", alignment: "topLeading" }}>
      {view.changeMin === null ? (
        <VStack alignment="leading" spacing={2}>
          <Label text={view.title} size={15} weight="bold" color={t.text} lines={2} scale={0.8} />
          <Label text={view.sub} size={12} weight="medium" color={t.muted} lines={3} scale={0.8} />
        </VStack>
      ) : (
        <VStack alignment="leading" spacing={0}>
          <Label text={changeVerb(view)} size={13} weight="medium" color={t.muted} lines={2} scale={0.75} />
          <Label text={view.short} size={25} weight="bold" rounded color={timeColor(c)} />
          {hasTimer(view, c.now) ? <Timer c={c} size={15} weight="semibold" color={t.timer} /> : null}
        </VStack>
      )}
      <Spacer minLength={3} />
      <TomorrowLines c={c} />
      <HStack spacing={2} padding={{ top: hasTomorrow(view) ? 2 : 0 }}>
        {view.place && view.fact ? <Footer c={c} /> : null}
        {view.fact ? <SensorDot c={c} /> : <Footer c={c} />}
        <Spacer minLength={0} />
        {rail ? null : <Refresh color={t.refresh} size={20} />}
      </HStack>
    </VStack>
  )
}

function SmallHouse({ c }: { c: Ctx }) {
  const rail = railOn(c)
  // Будинок вузький, але колонці з часом потрібно щонайменше половину ширини.
  const height = Math.min(136, c.height - 22, Math.round((c.contentW * (rail ? 0.4 : 0.47)) / 0.545))
  return (
    <HStack spacing={rail ? 5 : 6} padding={{ leading: rail ? 7 : 8, trailing: rail ? 2 : 8, top: 11, bottom: 11 }} frame={fill}>
      <House width={Math.round(height * 0.545)} height={height} runs={c.view.todayRuns} nowMin={c.view.nowMin} paint={homePaint("house", c.t)} />
      <ChangeColumn c={c} />
    </HStack>
  )
}

// Верхні два рядки малого віджета, коли малюнок займає нижню половину.
function Headline({ c }: { c: Ctx }) {
  const { view, t } = c
  const rail = railOn(c)
  if (view.changeMin === null) {
    return (
      <VStack alignment="leading" spacing={1}>
        <HStack spacing={2}>
          <Label text={view.title} size={rail ? 16 : 18} weight="bold" color={t.text} />
          <Spacer minLength={0} />
          <SensorDot c={c} />
          {rail ? null : <Refresh color={t.refresh} size={20} />}
        </HStack>
        <Label
          text={view.noticeShort || (view.place ? `${view.place}: ${view.sub}` : view.sub)}
          size={12}
          weight="medium"
          color={view.noticeShort ? t.warn : t.muted}
          lines={2}
          scale={0.8}
        />
      </VStack>
    )
  }
  return (
    <VStack alignment="leading" spacing={0}>
      <HStack spacing={2}>
        <Label text={changeVerb(view)} size={13} weight="medium" color={t.muted} />
        <Spacer minLength={2} />
        <Footer c={c} />
        <SensorDot c={c} />
        {rail ? null : <Refresh color={t.refresh} size={20} />}
      </HStack>
      <HStack alignment="lastTextBaseline" spacing={2}>
        <Label text={view.short} size={rail ? 25 : 29} weight="bold" rounded color={timeColor(c)} />
        <Spacer minLength={0} />
        {hasTimer(view, c.now) ? <Timer c={c} size={rail ? 13 : 14} weight="semibold" color={t.timer} align="trailing" width={rail ? 54 : 62} /> : null}
      </HStack>
    </VStack>
  )
}

function SmallDay({ c, look }: { c: Ctx; look: string }) {
  const rail = railOn(c)
  const first = tomorrowFirst(c.view)
  const width = c.contentW - (rail ? 14 : 26)
  return (
    <VStack alignment="leading" spacing={0} padding={{ top: 12, leading: rail ? 10 : 13, bottom: 10, trailing: rail ? 4 : 13 }} frame={{ ...fill, alignment: "topLeading" }}>
      <Headline c={c} />
      <Spacer minLength={3} />
      <Centered>
        <DayLook look={look} width={width} height={Math.round(width * (first ? 0.48 : 0.56))} runs={c.view.todayRuns} nowMin={c.view.nowMin} paint={homePaint(look, c.t)} />
      </Centered>
      {first ? (
        <HStack spacing={4} padding={{ top: 3 }}>
          <Label text="завтра" size={10} weight="semibold" color={c.t.brand} />
          <Label text={first} size={11} weight="medium" color={c.t.text} scale={0.6} />
        </HStack>
      ) : null}
    </VStack>
  )
}

function SmallBattery({ c }: { c: Ctx }) {
  const { view, t } = c
  const rail = railOn(c)
  const width = c.contentW - (rail ? 16 : 28)
  const first = tomorrowFirst(view)
  return (
    <VStack spacing={4} padding={{ leading: 8, trailing: rail ? 2 : 8 }} frame={fill}>
      <Spacer minLength={0} />
      <BatteryDial c={c} width={width} height={Math.round(width * (first ? 0.5 : 0.54))} />
      {view.changeMin !== null ? <Label text={`${changeVerb(view)} ${view.short}`} size={rail ? 14 : 15} weight="semibold" color={t.text} /> : null}
      {first ? <Label text={`завтра ${first}`} size={11} weight="medium" color={t.brand} scale={0.6} /> : null}
      <HStack spacing={4}>
        {view.place && view.fact ? <Footer c={c} /> : null}
        {view.fact ? <FactLine c={c} compact /> : <Footer c={c} />}
        {rail ? null : <Refresh color={t.refresh} size={20} />}
      </HStack>
      <Spacer minLength={0} />
    </VStack>
  )
}

function SmallRing({ c }: { c: Ctx }) {
  const rail = railOn(c)
  const size = Math.min(138, c.contentW - (rail ? 8 : 20), c.height - 14)
  const first = c.view.tomorrowWindows && c.view.tomorrowWindows.length ? `завтра з ${hm(c.view.tomorrowWindows[0].s)}` : null
  const ring = (
    <ZStack frame={fill}>
      <RingDial c={c} size={size} runs={c.view.todayRuns} nowMin={c.view.nowMin} center={<DialText c={c} unit={size / 138} withTimer below={first} />} />
    </ZStack>
  )
  return (
    <ZStack alignment="topTrailing" frame={fill}>
      {ring}
      <VStack spacing={2} padding={rail ? { top: 6, trailing: 2 } : undefined}>
        {rail ? null : <Refresh color={c.t.refresh} size={24} />}
        <SensorDot c={c} />
      </VStack>
    </ZStack>
  )
}

function Small({ c, look }: { c: Ctx; look: string }) {
  if (!c.view.todayRuns.length) return <TextOnly c={c} small />
  if (look === "house") return <SmallHouse c={c} />
  if (look === "battery") return <SmallBattery c={c} />
  if (look === "ring") return <SmallRing c={c} />
  return <SmallDay c={c} look={look} />
}

// Рядок дня: «Сьогодні  12:00–14:00, 18:00–20:30» — назва дня приглушеним жирним, години звичайним.
function DayRow({ c, label, text }: { c: Ctx; label: string; text: string }) {
  return (
    <HStack alignment="firstTextBaseline" spacing={5}>
      <Label text={label} size={11} weight="bold" color={c.t.muted} fixed />
      <Label text={text} size={13} weight="medium" color={c.t.text} scale={0.7} />
    </HStack>
  )
}

// Чи вміститься рядок дня в колонку room (з дозволеним зменшенням шрифту); ні — години коротко.
function rowFits(label: string, text: string, room: number): boolean {
  return (label.length * 11 * 0.6 + 5 + text.length * 13 * 0.55) * 0.8 <= room
}

// Сьогодні й завтра: коли графік на завтра вже є — двома рядками; інакше заголовок і години сьогодні.
function DayRows({ c, room }: { c: Ctx; room: number }) {
  const { view, t } = c
  const today = view.place ? `${view.place} · сьогодні` : "Сьогодні"
  if (hasTomorrow(view)) {
    const compact = !rowFits(today, todayRow(view), room) || !rowFits("Завтра", tomorrowRow(view), room)
    return (
      <VStack alignment="leading" spacing={1}>
        <DayRow c={c} label={today} text={todayRow(view, compact)} />
        <DayRow c={c} label="Завтра" text={tomorrowRow(view, compact)} />
      </VStack>
    )
  }
  return (
    <VStack alignment="leading" spacing={0}>
      <Label text={today} size={11} weight="semibold" color={t.muted} />
      <Label text={view.windowsLeft.length ? todayRow(view) : view.todayWindows.length ? "Більше немає" : "Без відключень"} size={13} weight="medium" color={t.text} lines={2} scale={0.75} />
    </VStack>
  )
}

// Малюнок середнього віджета. Зі стовпчиком значків менший, щоб рядкам з годинами лишилося місце.
const MEDIUM_RAIL: Record<string, [number, number]> = { house: [80, 132], tiles: [104, 80], garland: [108, 72], battery: [104, 58] }

function Medium({ c, look }: { c: Ctx; look: string }) {
  if (!c.view.todayRuns.length) return <TextOnly c={c} />
  const { view, t } = c
  const rail = railOn(c)
  let picture: VirtualNode
  let picW: number
  if (look === "ring") {
    picW = rail ? 112 : 134
    picture = <RingDial c={c} size={picW} runs={view.todayRuns} nowMin={view.nowMin} center={<DialText c={c} unit={picW / 130} withTimer={false} />} />
  } else if (look === "battery") {
    const [w, h] = rail ? MEDIUM_RAIL.battery : [140, 76]
    picW = w
    picture = <BatteryDial c={c} width={w} height={h} />
  } else {
    const [w, h] = rail ? MEDIUM_RAIL[look] : PICTURES.medium[look]
    picW = w
    picture = <DayLook look={look} width={w} height={h} runs={view.todayRuns} nowMin={view.nowMin} paint={homePaint(look, t)} />
  }
  const column = c.contentW - (rail ? 24 : 36) - picW
  const timerW = hasTimer(view, c.now) && look !== "battery" ? 13 * 0.62 * 7 + 8 : 0
  const pill = rail ? pillText(c, column - timerW) : null
  return (
    <HStack spacing={rail ? 10 : 12} padding={{ top: 10, leading: 12, bottom: 10, trailing: rail ? 2 : 12 }} frame={fill}>
      {picture}
      <VStack alignment="leading" spacing={0} frame={{ ...fill, alignment: "topLeading" }}>
        <Status c={c} withTimer={look !== "battery"} pill={pill ? <Pill c={c} text={pill} /> : null} />
        <Spacer minLength={5} />
        <DayRows c={c} room={column} />
        <Spacer minLength={3} />
        <HStack spacing={2}>
          {view.fact ? <FactLine c={c} /> : <Checked c={c} />}
          <Spacer minLength={0} />
          <Refresh color={t.refresh} />
        </HStack>
      </VStack>
    </HStack>
  )
}

function Windows({ c, heading, windows, emptyText }: { c: Ctx; heading: string; windows: Run[] | null; emptyText: string }) {
  const { t } = c
  const shown = (windows || []).slice(0, 4)
  const rest = (windows || []).length - shown.length
  return (
    <VStack alignment="leading" spacing={1}>
      <Label text={heading} size={11} weight="semibold" color={t.muted} />
      {shown.length ? (
        <Label text={shown.map(windowText).join("\n")} size={13} weight="medium" color={t.text} lines={4} />
      ) : (
        <Label text={emptyText} size={13} color={t.text} lines={2} />
      )}
      {rest > 0 ? <Label text={`ще ${rest}`} size={11} color={t.muted} /> : null}
    </VStack>
  )
}

const LARGE_RAIL: Record<string, [number, number]> = { house: [92, 134], tiles: [126, 96], garland: [126, 86] }

function LargeDay({ c, look, runs, nowMin, today }: { c: Ctx; look: string; runs: Run[]; nowMin: number | null; today: boolean }) {
  if (look === "battery") return null // батарея показує лише поточний відрізок, а не окремий день
  const rail = railOn(c)
  if (look === "ring") {
    const size = rail ? 124 : 140
    const center = today ? <DialText c={c} unit={size / 130} withTimer={false} /> : <TomorrowText c={c} unit={size / 130} />
    return <RingDial c={c} size={size} runs={runs} nowMin={nowMin} center={center} />
  }
  const [width, height] = rail ? LARGE_RAIL[look] : PICTURES.large[look]
  return <DayLook look={look} width={width} height={height} runs={runs} nowMin={nowMin} paint={homePaint(look, c.t)} />
}

function Large({ c, look }: { c: Ctx; look: string }) {
  if (!c.view.todayRuns.length) return <TextOnly c={c} />
  const { view, t } = c
  const rail = railOn(c)
  const timerW = hasTimer(view, c.now) && look !== "battery" ? 13 * 0.62 * 7 + 8 : 0
  const pill = rail ? pillText(c, c.contentW - 20 - timerW) : null
  return (
    <VStack alignment="leading" spacing={0} padding={{ top: 14, leading: 16, bottom: 12, trailing: rail ? 4 : 14 }} frame={{ ...fill, alignment: "topLeading" }}>
      <HStack spacing={4}>
        <Label text={captionText(view)} size={11} color={t.muted} />
        <Spacer minLength={0} />
        {rail ? null : <Refresh color={t.refresh} />}
      </HStack>
      <Status c={c} withTimer={look !== "battery"} pill={pill ? <Pill c={c} text={pill} /> : null} />
      <Spacer minLength={6} />
      {look === "battery" ? (
        <VStack spacing={0}>
          <Centered>
            <BatteryDial c={c} width={Math.min(280, c.contentW - 40)} height={84} />
          </Centered>
          <Spacer minLength={6} />
        </VStack>
      ) : null}
      <HStack alignment="top" spacing={8}>
        <VStack alignment="leading" spacing={6}>
          <LargeDay c={c} look={look} runs={view.todayRuns} nowMin={view.nowMin} today />
          <Windows c={c} heading="Сьогодні" windows={view.todayWindows} emptyText="Без відключень" />
        </VStack>
        <Spacer minLength={0} />
        <VStack alignment="leading" spacing={6}>
          <LargeDay c={c} look={look} runs={view.tomorrowRuns || []} nowMin={null} today={false} />
          <Windows c={c} heading="Завтра" windows={view.tomorrowWindows} emptyText={view.tomorrowRuns ? "Без відключень" : "Графіка ще немає"} />
        </VStack>
      </HStack>
      <Spacer minLength={4} />
      <HStack spacing={2}>
        {view.fact ? <FactLine c={c} size={12} /> : <Checked c={c} />}
        <Spacer minLength={0} />
        {rail ? <Refresh color={t.refresh} /> : null}
      </HStack>
    </VStack>
  )
}

// ---------- Робочий екран: сторінка тривоги ----------

// «Немає свіжих даних» уже каже час перевірки в подробицях.
function checkedLine(s: AlertStatus): string | null {
  if (!s.checked || s.kind === "nodata") return null
  return `${s.stale ? "дані за" : "перевірено"} ${s.checked}`
}

// Подробиці в один рядок: повні, якщо короткі, інакше лише «з 10:40».
function oneLine(s: AlertStatus, maxChars: number): string {
  return s.subShort && s.sub.length > maxChars ? s.subShort : s.sub
}

// Свіжі дописи каналу моніторингу дослівно, з часом: перший до двох рядків, наступні по рядку.
function Posts({ s, p, limit, size }: { s: AlertStatus; p: PageTok; limit: number; size: number }) {
  if (!s.posts.length || limit < 1) return null
  return (
    <VStack alignment="leading" spacing={1}>
      {s.posts.slice(0, limit).map((post, i) => (
        <Label text={post} size={size} weight="medium" color={i === 0 ? p.text : p.muted} lines={i === 0 ? 2 : 1} scale={0.85} truncate />
      ))}
    </VStack>
  )
}

// Інші тривоги в області: «Також тривога:» і назви по рядку, решта — «і ще N».
function Others({ s, p, max }: { s: AlertStatus; p: PageTok; max: number }) {
  const skip = s.kind === "nearby" ? 1 : 0 // перша вже в подробицях
  const items = s.others.slice(skip)
  if (!items.length || max < 2) return null
  const shown = items.length > max ? items.slice(0, max - 1) : items
  const head = s.kind === "alert" || s.kind === "nearby" ? "Також тривога:" : "В області тривога:"
  return (
    <VStack alignment="leading" spacing={1}>
      <Label text={head} size={11} weight="semibold" color={p.muted} />
      {shown.map((name) => <Label text={name} size={12} weight="medium" color={p.text} scale={0.8} />)}
      {items.length > shown.length ? <Label text={`і ще ${items.length - shown.length}`} size={12} color={p.muted} /> : null}
    </VStack>
  )
}

// Малий віджет: місце, назва, подробиці, останній допис каналу; унизу таймер тривоги чи час перевірки.
// «↻» у стовпчику значків.
function AlertSquare({ c, s, p }: { c: Ctx; s: AlertStatus; p: PageTok }) {
  const foot = s.timer ? null : checkedLine(s)
  return (
    <VStack alignment="leading" spacing={1} padding={{ top: 12, leading: 12, bottom: 10, trailing: 4 }} frame={{ ...fill, alignment: "topLeading" }}>
      <Label text={compactPlace(s.place) || "Повітряна тривога"} size={10.5} weight="medium" color={p.muted} scale={0.8} />
      <Label text={s.title} size={16} weight="bold" color={p.title} lines={2} scale={0.8} />
      <Label text={active(s) ? oneLine(s, 20) : s.sub} size={12} weight="medium" color={p.text} lines={active(s) ? 1 : 2} scale={0.8} />
      {s.posts.length ? (
        <VStack spacing={0} padding={{ top: 3 }}>
          <Posts s={s} p={p} limit={1} size={11} />
        </VStack>
      ) : null}
      <Spacer minLength={2} />
      {s.timer ? <AlertTimer s={s} size={15} color={p.title} /> : foot ? <Label text={foot} size={10} color={s.stale ? c.t.warn : p.muted} /> : null}
    </VStack>
  )
}

// Середній і великий: місце, назва, подробиці, де оголошено, дописи каналу й інші тривоги області;
// унизу таймер, час перевірки й «↻» (праворуч унизу, подалі від значків).
function AlertWide({ c, s, p, large }: { c: Ctx; s: AlertStatus; p: PageTok; large: boolean }) {
  const checked = checkedLine(s)
  const foot = checked ? (s.timer && !large ? checked : `${checked} · alerts.in.ua`) : "alerts.in.ua"
  const where = active(s) && s.where ? (s.where === "уся область" ? "на всю область" : `оголошено: ${s.where}`) : null
  return (
    <VStack alignment="leading" spacing={1} padding={{ top: 12, leading: 14, bottom: 10, trailing: 4 }} frame={{ ...fill, alignment: "topLeading" }}>
      <Label text={s.place || "Повітряна тривога"} size={11} weight="medium" color={p.muted} scale={0.8} />
      <Label text={s.title} size={large ? 22 : 19} weight="bold" color={p.title} scale={0.8} />
      <Label text={active(s) ? oneLine(s, 34) : s.sub} size={13} weight="medium" color={p.text} lines={active(s) ? 1 : 2} scale={0.8} />
      {where ? <Label text={where} size={12} weight="medium" color={p.muted} scale={0.8} /> : null}
      {s.posts.length ? (
        <VStack spacing={0} padding={{ top: 4 }}>
          <Posts s={s} p={p} limit={large ? 3 : 2} size={11.5} />
        </VStack>
      ) : null}
      {large || !s.posts.length ? (
        <VStack spacing={0} padding={{ top: 6 }}>
          <Others s={s} p={p} max={large ? (s.posts.length ? 4 : 7) : where ? 0 : 2} />
        </VStack>
      ) : null}
      <Spacer minLength={2} />
      <HStack spacing={6}>
        {s.timer ? <AlertTimer s={s} size={16} color={p.title} /> : null}
        <Spacer minLength={0} />
        <Label text={foot} size={10} color={s.stale ? c.t.warn : p.muted} scale={0.8} />
        <Refresh color={p.muted} />
      </HStack>
    </VStack>
  )
}

function AlertPageView({ c, family }: { c: Ctx; family: WidgetFamily }) {
  const s = c.alert as AlertStatus
  const p = alertPage(c.t, s.kind)
  if (family === "systemSmall") return <AlertSquare c={c} s={s} p={p} />
  return <AlertWide c={c} s={s} p={p} large={family !== "systemMedium"} />
}

// ---------- Екран блокування ----------
// iOS фарбує віджет сама, тож кольорів тексту не задаємо.

// Лампочка замість батареї: світиться, коли світло є, перекреслена, коли немає, контур, коли можливе відключення.
function Bulb({ view, size }: { view: View; size: number }) {
  const state = bulbState(view)
  const symbol = state === "on" ? "lightbulb.max.fill" : state === "off" ? "lightbulb.slash.fill" : "lightbulb"
  return <Image systemName={symbol} font={size} fontWeight="semibold" frame={{ width: Math.round(size * 1.2), height: Math.round(size * 1.2) }} />
}

function LockDetail({ c, timerSize, timerWeight = "regular" }: { c: Ctx; timerSize: number; timerWeight?: FontWeight }) {
  const { view } = c
  if (view.notice) return <Label text={view.notice} size={12} lines={2} />
  if (hasTimer(view, c.now)) return <Timer c={c} size={timerSize} weight={timerWeight} />
  return <Label text={lockLine(view)} size={12} lines={2} />
}

// Тривога чи загроза в обраному місці (модуль тривоги ввімкнено): сирена й «Тривога з 10:40» замість рядка датчика.
function LockAlert({ s, size = 11 }: { s: AlertStatus; size?: number }) {
  return (
    <HStack spacing={3}>
      <Image systemName={s.kind === "threat" ? "exclamationmark.triangle.fill" : "light.beacon.max.fill"} font={size * 0.9} fontWeight="bold" />
      <Label text={`${alertShortTitle(s)}${s.subShort ? ` ${s.subShort}` : ""}`} size={size} weight="bold" scale={0.75} />
    </HStack>
  )
}

function LockExtra({ c }: { c: Ctx }) {
  if (c.alert && active(c.alert)) return <LockAlert s={c.alert} />
  return <FactLine c={c} compact size={11} lock />
}

// Великий час окремим рядком вміщується поруч із вузьким малюнком.
function LockStacked({ c }: { c: Ctx }) {
  const { view } = c
  return (
    <VStack alignment="leading" spacing={0}>
      {view.changeMin === null ? (
        <Label text={view.title} size={14} weight="bold" scale={0.8} />
      ) : (
        <VStack alignment="leading" spacing={0}>
          <Label text={lockVerb(view)} size={13} weight="semibold" scale={0.8} />
          <Label text={view.short} size={18} weight="bold" rounded scale={0.8} />
        </VStack>
      )}
      <LockDetail c={c} timerSize={15} timerWeight="semibold" />
      <LockExtra c={c} />
    </VStack>
  )
}

function LockGarland({ c }: { c: Ctx }) {
  const { view } = c
  const width = Math.min(c.width, 160)
  const height = Math.round(Math.min(width * 0.3, c.height - 22))
  const alert = c.alert && active(c.alert) ? c.alert : null
  return (
    <VStack alignment="leading" spacing={3} frame={fill}>
      <HStack spacing={2}>
        <Label text={view.changeMin === null ? lockLine(view) : lockTitle(view)} size={13} weight="bold" scale={0.6} />
        <Spacer minLength={0} />
        {view.noticeShort ? (
          <Label text={view.noticeShort} size={11} />
        ) : hasTimer(view, c.now) ? (
          <Timer c={c} size={13} weight="semibold" align="trailing" width={58} />
        ) : null}
      </HStack>
      {alert ? <LockAlert s={alert} /> : <Garland width={width} height={height} runs={view.todayRuns} nowMin={view.nowMin} paint={LOCK_PAINT} />}
    </VStack>
  )
}

function Rectangular({ c, look }: { c: Ctx; look: string }) {
  const { view } = c
  const hasDay = view.todayRuns.length > 0
  if (look === "garland" && hasDay) return <LockGarland c={c} />
  let picture: VirtualNode | null = null
  if (look === "bulb") {
    picture = <Bulb view={view} size={38} />
  } else if (hasDay && look === "ring") {
    picture = (
      <ZStack frame={{ width: 52, height: 52 }}>
        <Ring size={52} lineWidth={5} runs={view.todayRuns} nowMin={view.nowMin} colors={LOCK_RING} />
        <Label text={view.group || ""} size={12} weight="bold" rounded />
      </ZStack>
    )
  } else if (hasDay) {
    const [width, height] = PICTURES.lock[look]
    picture =
      look === "battery" ? (
        <Battery width={width} height={height} view={view} paint={LOCK_PAINT} />
      ) : look === "house" ? (
        <House width={width} height={height} runs={view.todayRuns} nowMin={view.nowMin} paint={LOCK_PAINT} />
      ) : (
        <Tiles width={width} height={height} runs={view.todayRuns} nowMin={view.nowMin} paint={LOCK_PAINT} />
      )
  }
  const stacked = hasDay && (look === "house" || look === "tiles")
  return (
    <HStack spacing={look === "ring" ? 6 : 8} frame={fill}>
      {picture}
      {stacked ? (
        <LockStacked c={c} />
      ) : (
        <VStack alignment="leading" spacing={0}>
          <Label text={lockTitle(view)} size={14} weight="bold" scale={0.65} />
          <LockDetail c={c} timerSize={look === "bulb" ? 19 : 15} timerWeight={look === "bulb" ? "bold" : "regular"} />
          <LockExtra c={c} />
        </VStack>
      )}
      <Spacer minLength={0} />
    </HStack>
  )
}

// Круглий віджет: малюнок і час наступної зміни.
const CIRCULAR_BOX: Record<string, { x: number; y: number; w: number; h: number }> = {
  bulb: { x: 18, y: 6, w: 32, h: 32 },
  house: { x: 20, y: 6, w: 28, h: 37 },
  tiles: { x: 14, y: 15, w: 40, h: 26 },
  garland: { x: 5, y: 12, w: 58, h: 30 },
  battery: { x: 12, y: 16, w: 44, h: 24 },
}

function Circular({ c, look }: { c: Ctx; look: string }) {
  const { view } = c
  const size = 68
  const runs = view.todayRuns
  const nowMin = runs.length ? view.nowMin : null
  if (look === "ring") {
    return (
      <ZStack frame={{ width: size, height: size }}>
        <Ring size={size} lineWidth={6} runs={runs} nowMin={nowMin} colors={LOCK_RING} />
        <Label text={view.short} size={15} weight="bold" rounded />
      </ZStack>
    )
  }
  const box = CIRCULAR_BOX[look]
  let picture: VirtualNode
  if (look === "bulb") picture = <Bulb view={view} size={26} />
  else if (look === "battery") picture = <Battery width={box.w} height={box.h} view={view} paint={LOCK_PAINT} />
  else if (look === "house") picture = <House width={box.w} height={box.h} runs={runs} nowMin={nowMin} paint={LOCK_PAINT} />
  else if (look === "tiles") picture = <Tiles width={box.w} height={box.h} runs={runs} nowMin={nowMin} paint={LOCK_PAINT} />
  else picture = <Garland width={box.w} height={box.h} runs={runs} nowMin={nowMin} paint={LOCK_PAINT} />
  return (
    <ZStack alignment="topLeading" frame={{ width: size, height: size, alignment: "topLeading" }}>
      <ZStack alignment="topLeading" offset={{ x: box.x, y: box.y }}>
        {picture}
      </ZStack>
      <Text font={14} fontWeight="bold" fontDesign="rounded" lineLimit={1} minScaleFactor={0.7} frame={{ width: size, height: 18 }} offset={{ x: 0, y: 45 }}>
        {view.short}
      </Text>
    </ZStack>
  )
}

// «Світло до 23:30» лишається правдою й тоді, коли iOS перемальовує віджет із запізненням.
// Коли в обраному місці тривога, рядок каже про неї («Тривога з 10:40»).
function Inline({ c }: { c: Ctx }) {
  const s = c.alert
  if (s && active(s)) return <Text>{`${alertShortTitle(s)}${s.subShort ? ` ${s.subShort}` : ""}`}</Text>
  return <Text>{c.view.title}</Text>
}

// ---------- Вибір розкладки ----------

// backdrop: прозорість із налаштувань віджета Scripting ("none" — звичайний фон, "simulated" — шпалери намальовано
// під віджетом, "system" — фон малює iOS). «Напівпрозорий» тоді кладе поверх шпалер білий 85 %, решта фонів —
// нічого: текст світлий із тінню. alert: стан тривоги, коли модуль увімкнено (тоді є стовпчик значків), page — яку
// сторінку показати, pageKey — який це віджет (для кнопок у стовпчику).
// (Не «alert»: так у Scripting зветься модифікатор вікна-попередження.)
export function WidgetContent({
  view, now, date, family, width, height, backdrop = "none", alertState = null, pages = [LIGHT], page = LIGHT, pageKey = "",
}: {
  view: View; now: Now; date: Date; family: WidgetFamily; width: number; height: number; backdrop?: Backdrop
  alertState?: AlertStatus | null; pages?: string[]; page?: string; pageKey?: string
}) {
  const alert = alertState
  const t = tokensFor(view.style, backdrop)
  const alertsOn = !!alert && pages.includes(ALERT)
  const small = family === "systemSmall"
  const shown = alertsOn && page === ALERT ? ALERT : LIGHT
  const c: Ctx = {
    view, now, date, t, width, height, contentW: width - (alertsOn ? (small ? RAIL_SMALL : RAIL_WIDE) : 0),
    alert: alertsOn ? alert : null, pages: alertsOn ? pages : [LIGHT], page: shown, pageKey,
  }
  if (family === "accessoryInline") return <Inline c={c} />
  const lockLook = lockLookOf(view.lockLook)
  if (family === "accessoryCircular") return <Circular c={c} look={lockLook} />
  if (family === "accessoryRectangular") return <Rectangular c={c} look={lockLook} />
  const look = lookOf(view.look, DEFAULT_LOOK)
  let content: VirtualNode
  if (shown === ALERT) content = <AlertPageView c={c} family={family} />
  else if (small) content = <Small c={c} look={look} />
  else if (family === "systemMedium") content = <Medium c={c} look={look} />
  else content = <Large c={c} look={look} />
  if (alertsOn) {
    content = (
      <HStack spacing={0} frame={fill}>
        <ZStack frame={fill}>{content}</ZStack>
        <Rail c={c} small={small} />
      </HStack>
    )
  }
  // Фон: у сторінки тривоги свій (відтінок стану), у сторінки світла — фон віджета.
  const pageTok = shown === ALERT && c.alert ? alertPage(t, c.alert.kind) : null
  const bg0 = pageTok ? pageTok.bg0 : t.bg0
  const bg1 = pageTok ? pageTok.bg1 : t.bg1
  const alpha = pageTok ? pageTok.alpha : t.bgAlpha
  if (backdrop === "none") {
    // Без прозорого фону Scripting «Напівпрозорий» білий: крізь віджет iOS нічого не показує.
    const solid = backgroundFill(bg0, bg1, alpha > 0 ? 1 : 0, !!pageTok) ?? bg0
    return (
      <ZStack frame={fill} widgetBackground={solid}>
        {content}
      </ZStack>
    )
  }
  if (alpha > 0) {
    // «Напівпрозорий» поверх шпалер: білий (чи з відтінком тривоги) 85 %.
    return (
      <ZStack frame={fill}>
        <Rectangle fill={fade(bg0, alpha)} frame={fill} />
        {content}
      </ZStack>
    )
  }
  return (
    <ZStack frame={fill} shadow={{ color: "rgba(0,0,0,0.45)", radius: 2, y: 1 }}>
      {content}
    </ZStack>
  )
}
