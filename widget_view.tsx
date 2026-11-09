// Розкладки віджета для всіх розмірів. Таймер іде сам, навіть якщо iOS довго не оновлює віджет.
import { VStack, HStack, ZStack, Spacer, Text, Image, Button, TimerIntervalLabel, DateLabel } from "scripting"
import type { Color, FontWeight, TextAlignment, VirtualNode, WidgetFamily } from "scripting"
import type { Now, Run, View } from "./logic"
import {
  DEFAULT_LOCK_LOOK, DEFAULT_LOOK, captionText, changeDate, changeVerb, hasTimer, hm, isCharging, lockLine, lockTitle,
  lockVerb, lookOf, quietWords, windowText,
} from "./logic"
import { Battery, DayLook, Garland, House, PICTURES, Ring, Tiles } from "./looks"
import type { Theme } from "./theme"
import { CLEAR_THEME, LOCK_PAINT, LOCK_RING, homePaint, themeFor } from "./theme"
import { RefreshIntent } from "./app_intents"

export type Ctx = { view: View; now: Now; date: Date; theme: Theme; width: number; height: number }

// ---------- Елементи ----------

function Label({
  text, size, weight = "regular", color, lines = 1, scale = 0.7, rounded = false, align,
}: {
  text: string; size: number; weight?: FontWeight; color?: Color | null; lines?: number; scale?: number; rounded?: boolean; align?: TextAlignment
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
    >
      {text}
    </Text>
  )
}

function Timer({
  c, size, weight = "regular", color, align = "leading", width,
}: { c: Ctx; size: number; weight?: FontWeight; color?: Color | null; align?: TextAlignment; width?: number }) {
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

function Refresh({ color, size = 22 }: { color: Color; size?: number }) {
  return (
    <Button intent={RefreshIntent(undefined)} buttonStyle="plain">
      <Image systemName="arrow.clockwise" font={size * 0.52} fontWeight="semibold" foregroundStyle={color} frame={{ width: size, height: size }} />
    </Button>
  )
}

function statusColor(kind: string, theme: Theme): Color {
  if (kind === "on") return theme.accent
  if (kind === "off") return theme.muted
  return theme.warn
}

function statusSymbol(kind: string): string {
  if (kind === "on") return "bolt.fill"
  if (kind === "off") return "bolt.slash.fill"
  if (kind === "maybe" || kind === "check") return "exclamationmark.triangle.fill"
  return "questionmark.circle"
}

const timeColor = (c: Ctx) => (c.view.kind === "on" ? c.theme.text : c.theme.accent)

function footerText(view: View): string {
  return view.noticeShort || `черга ${view.group}`
}

function Footer({ c, size = 11 }: { c: Ctx; size?: number }) {
  return <Label text={footerText(c.view)} size={size} color={c.view.noticeShort ? c.theme.warn : c.theme.muted} />
}

function Checked({ c }: { c: Ctx }) {
  return c.view.checked !== null ? <Label text={`перевірено ${hm(c.view.checked)}`} size={10} color={c.theme.muted} /> : <Spacer />
}

// Датчик СвітлоБота: чи є світло насправді. Крапка зелена чи червона, без світла ще й живий таймер від вимкнення.
// На екрані блокування iOS фарбує все сама, тож lock: без кольорів.
function FactLine({ c, compact = false, size = 11, lock = false }: { c: Ctx; compact?: boolean; size?: number; lock?: boolean }) {
  const fact = c.view.fact
  if (!fact) return null
  const dot: Color = fact.kind === "on" ? "systemGreen" : fact.kind === "off" ? "systemRed" : "systemGray"
  // Поруч із живим таймером повний рядок не вміщується: «Немає з 11:53» і таймер.
  const withTimer = !compact && fact.timerFrom !== null
  const short = fact.short.charAt(0).toUpperCase() + fact.short.slice(1)
  const text = compact ? fact.short : withTimer ? short : `${fact.line}${fact.checked ? ` · ${fact.checked}` : ""}`
  const color = lock ? null : c.theme.text
  return (
    <HStack spacing={3}>
      <Image systemName={fact.kind === "on" || fact.kind === "off" ? "circle.fill" : "circle.dashed"} font={size * 0.62} foregroundStyle={lock ? undefined : dot} />
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

// У малих віджетах місця на рядок немає: лише крапка датчика поруч із «↻».
function FactDot({ c, size = 9 }: { c: Ctx; size?: number }) {
  const fact = c.view.fact
  if (!fact) return null
  const dot: Color = fact.kind === "on" ? "systemGreen" : fact.kind === "off" ? "systemRed" : "systemGray"
  return <Image systemName={fact.kind === "on" || fact.kind === "off" ? "circle.fill" : "circle.dashed"} font={size} foregroundStyle={dot} />
}

function Status({ c, withTimer = true }: { c: Ctx; withTimer?: boolean }) {
  const { view, theme } = c
  return (
    <VStack alignment="leading" spacing={1}>
      <HStack spacing={4}>
        <Image systemName={statusSymbol(view.kind)} font={15} fontWeight="semibold" foregroundStyle={statusColor(view.kind, theme)} />
        <Label text={view.title} size={18} weight="bold" color={theme.text} />
      </HStack>
      <Label text={view.sub} size={13} weight="medium" color={theme.text} lines={2} />
      {view.notice ? (
        <Label text={view.notice} size={12} weight="semibold" color={theme.warn} />
      ) : withTimer && hasTimer(view, c.now) ? (
        <Timer c={c} size={13} color={theme.muted} />
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
      <Battery width={width} height={height} view={c.view} paint={homePaint("battery", c.theme)} />
      <VStack spacing={0} frame={{ width, height }}>
        <VStack spacing={0} padding={{ leading: 8, trailing: charging ? Math.round(height * 0.62) : 14 }}>
          {hasTimer(c.view, c.now) ? (
            <Timer c={c} size={Math.round(height * 0.33)} weight="bold" color={c.theme.text} align="center" />
          ) : (
            <Label text={words} size={14} weight="semibold" color={c.theme.text} lines={2} align="center" />
          )}
        </VStack>
      </VStack>
    </ZStack>
  )
}

// Написи всередині кільця: дія, час і таймер або короткі слова.
function DialText({ c, unit, withTimer }: { c: Ctx; unit: number; withTimer: boolean }) {
  const { view, theme } = c
  const footer = view.noticeShort ? (
    <Label text={view.noticeShort} size={11 * unit} weight="medium" color={theme.warn} align="center" />
  ) : withTimer && hasTimer(view, c.now) ? (
    <Timer c={c} size={12 * unit} color={theme.muted} align="center" />
  ) : (
    <Label text={`черга ${view.group}`} size={11 * unit} weight="medium" color={theme.muted} align="center" />
  )
  if (view.changeMin === null) {
    return (
      <VStack spacing={2}>
        <Label text={quietWords(view)} size={13 * unit} weight="semibold" color={theme.text} lines={2} align="center" />
        {footer}
      </VStack>
    )
  }
  return (
    <VStack spacing={0}>
      <Label text={changeVerb(view)} size={11 * unit} weight="medium" color={theme.muted} align="center" />
      <Label text={view.short} size={26 * unit} weight="bold" rounded color={timeColor(c)} />
      {footer}
    </VStack>
  )
}

function TomorrowText({ c, unit }: { c: Ctx; unit: number }) {
  const { view, theme } = c
  const windows = view.tomorrowWindows || []
  if (!view.tomorrowRuns || !windows.length) {
    return (
      <Label text={view.tomorrowRuns ? "Без\nвідключень" : "Ще\nнемає"} size={13 * unit} weight="semibold" color={theme.text} lines={2} align="center" />
    )
  }
  return (
    <VStack spacing={0}>
      <Label text="перше" size={11 * unit} weight="medium" color={theme.muted} />
      <Label text={hm(windows[0].s)} size={25 * unit} weight="bold" rounded color={theme.text} />
    </VStack>
  )
}

function RingDial({ c, size, runs, nowMin, center }: { c: Ctx; size: number; runs: Run[]; nowMin: number | null; center: VirtualNode }) {
  return (
    <ZStack frame={{ width: size, height: size }}>
      <Ring size={size} lineWidth={9} runs={runs} nowMin={nowMin} colors={c.theme.ring} hoursColor={c.theme.muted} />
      {center}
    </ZStack>
  )
}

// ---------- Робочий екран ----------

const fill = { maxWidth: "infinity" as const, maxHeight: "infinity" as const }

// Коли графіка немає, малюнку нічого показувати: лишаються слова.
function TextOnly({ c }: { c: Ctx }) {
  return (
    <VStack alignment="leading" spacing={4} padding={{ top: 14, leading: 14, bottom: 12, trailing: 12 }} frame={{ ...fill, alignment: "topLeading" }}>
      <HStack spacing={4}>
        <Label text={captionText(c.view)} size={11} color={c.theme.muted} />
        <Spacer minLength={0} />
        <Refresh color={c.theme.muted} />
      </HStack>
      <Status c={c} />
      <FactLine c={c} size={12} />
      <Spacer minLength={0} />
    </VStack>
  )
}

function ChangeColumn({ c }: { c: Ctx }) {
  const { view, theme } = c
  return (
    <VStack alignment="leading" spacing={0}>
      {view.changeMin === null ? (
        <VStack alignment="leading" spacing={2}>
          <Label text={view.title} size={15} weight="bold" color={theme.text} lines={2} scale={0.8} />
          <Label text={view.sub} size={12} weight="medium" color={theme.muted} lines={3} scale={0.8} />
        </VStack>
      ) : (
        <VStack alignment="leading" spacing={0}>
          <Label text={changeVerb(view)} size={13} weight="medium" color={theme.muted} lines={2} scale={0.75} />
          <Label text={view.short} size={25} weight="bold" rounded color={timeColor(c)} />
          {hasTimer(view, c.now) ? <Timer c={c} size={15} weight="semibold" color={theme.text} /> : null}
        </VStack>
      )}
      <Spacer minLength={3} />
      <HStack spacing={2}>
        {view.fact ? <FactDot c={c} /> : <Footer c={c} />}
        <Spacer minLength={0} />
        <Refresh color={theme.muted} size={20} />
      </HStack>
    </VStack>
  )
}

function SmallHouse({ c }: { c: Ctx }) {
  const height = Math.min(136, c.height - 22)
  return (
    <HStack spacing={6} padding={{ leading: 8, trailing: 8, top: 11, bottom: 11 }} frame={fill}>
      <House width={Math.round(height * 0.545)} height={height} runs={c.view.todayRuns} nowMin={c.view.nowMin} paint={homePaint("house", c.theme)} />
      <ChangeColumn c={c} />
    </HStack>
  )
}

// Верхні два рядки малого віджета, коли малюнок займає нижню половину.
function Headline({ c }: { c: Ctx }) {
  const { view, theme } = c
  if (view.changeMin === null) {
    return (
      <VStack alignment="leading" spacing={1}>
        <HStack spacing={2}>
          <Label text={view.title} size={18} weight="bold" color={theme.text} />
          <Spacer minLength={0} />
          <FactDot c={c} />
          <Refresh color={theme.muted} size={20} />
        </HStack>
        <Label text={view.noticeShort || view.sub} size={12} weight="medium" color={view.noticeShort ? theme.warn : theme.muted} lines={2} scale={0.8} />
      </VStack>
    )
  }
  return (
    <VStack alignment="leading" spacing={0}>
      <HStack spacing={2}>
        <Label text={changeVerb(view)} size={13} weight="medium" color={theme.muted} />
        <Spacer minLength={2} />
        <Footer c={c} />
        <FactDot c={c} />
        <Refresh color={theme.muted} size={20} />
      </HStack>
      <HStack alignment="lastTextBaseline" spacing={2}>
        <Label text={view.short} size={29} weight="bold" rounded color={timeColor(c)} />
        <Spacer minLength={0} />
        {hasTimer(view, c.now) ? <Timer c={c} size={14} weight="semibold" color={theme.text} align="trailing" width={62} /> : null}
      </HStack>
    </VStack>
  )
}

function SmallDay({ c, look }: { c: Ctx; look: string }) {
  const width = c.width - 26
  return (
    <VStack alignment="leading" spacing={0} padding={{ top: 12, leading: 13, bottom: 10, trailing: 13 }} frame={{ ...fill, alignment: "topLeading" }}>
      <Headline c={c} />
      <Spacer minLength={4} />
      <Centered>
        <DayLook look={look} width={width} height={Math.round(width * 0.56)} runs={c.view.todayRuns} nowMin={c.view.nowMin} paint={homePaint(look, c.theme)} />
      </Centered>
    </VStack>
  )
}

function SmallBattery({ c }: { c: Ctx }) {
  const { view, theme } = c
  return (
    <VStack spacing={4} padding={{ leading: 8, trailing: 8 }} frame={fill}>
      <Spacer minLength={0} />
      <BatteryDial c={c} width={c.width - 28} height={Math.round((c.width - 28) * 0.54)} />
      {view.changeMin !== null ? <Label text={`${changeVerb(view)} ${view.short}`} size={15} weight="semibold" color={theme.text} /> : null}
      <HStack spacing={4}>
        {view.fact ? <FactLine c={c} compact /> : <Footer c={c} />}
        <Refresh color={theme.muted} size={20} />
      </HStack>
      <Spacer minLength={0} />
    </VStack>
  )
}

function SmallRing({ c }: { c: Ctx }) {
  const size = Math.min(138, c.width - 20)
  return (
    <ZStack alignment="topTrailing" frame={fill}>
      <ZStack frame={fill}>
        <RingDial c={c} size={size} runs={c.view.todayRuns} nowMin={c.view.nowMin} center={<DialText c={c} unit={size / 138} withTimer />} />
      </ZStack>
      <VStack spacing={2}>
        <Refresh color={c.theme.muted} size={24} />
        <FactDot c={c} />
      </VStack>
    </ZStack>
  )
}

function Small({ c, look }: { c: Ctx; look: string }) {
  if (!c.view.todayRuns.length) return <TextOnly c={c} />
  if (look === "house") return <SmallHouse c={c} />
  if (look === "battery") return <SmallBattery c={c} />
  if (look === "ring") return <SmallRing c={c} />
  return <SmallDay c={c} look={look} />
}

function windowsLine(view: View): { heading: string; text: string } {
  const showTomorrow = !view.windowsLeft.length && !!view.tomorrowWindows && view.tomorrowWindows.length > 0
  const windows = showTomorrow ? (view.tomorrowWindows as Run[]) : view.windowsLeft
  const empty = view.todayWindows.length ? "Більше немає" : "Без відключень"
  return {
    heading: showTomorrow ? "Завтра" : "Сьогодні",
    text: windows.length ? windows.slice(0, 4).map(windowText).join(", ") : empty,
  }
}

function Medium({ c, look }: { c: Ctx; look: string }) {
  if (!c.view.todayRuns.length) return <TextOnly c={c} />
  const { view, theme } = c
  const list = windowsLine(view)
  let picture: VirtualNode
  if (look === "ring") {
    picture = <RingDial c={c} size={134} runs={view.todayRuns} nowMin={view.nowMin} center={<DialText c={c} unit={134 / 130} withTimer={false} />} />
  } else if (look === "battery") {
    picture = <BatteryDial c={c} width={140} height={76} />
  } else {
    const [width, height] = PICTURES.medium[look]
    picture = <DayLook look={look} width={width} height={height} runs={view.todayRuns} nowMin={view.nowMin} paint={homePaint(look, theme)} />
  }
  return (
    <HStack spacing={12} padding={{ top: 10, leading: 12, bottom: 10, trailing: 12 }} frame={fill}>
      {picture}
      <VStack alignment="leading" spacing={0} frame={{ maxWidth: "infinity", alignment: "leading" }}>
        <Status c={c} withTimer={look !== "battery"} />
        <Spacer minLength={6} />
        <Label text={list.heading} size={11} weight="semibold" color={theme.muted} />
        <Label text={list.text} size={13} weight="medium" color={theme.text} lines={2} scale={0.75} />
        <Spacer minLength={3} />
        <HStack spacing={2}>
          {view.fact ? <FactLine c={c} /> : <Checked c={c} />}
          <Spacer minLength={0} />
          <Refresh color={theme.muted} />
        </HStack>
      </VStack>
    </HStack>
  )
}

function Windows({ c, heading, windows, emptyText }: { c: Ctx; heading: string; windows: Run[] | null; emptyText: string }) {
  const { theme } = c
  const shown = (windows || []).slice(0, 4)
  const rest = (windows || []).length - shown.length
  return (
    <VStack alignment="leading" spacing={1}>
      <Label text={heading} size={11} weight="semibold" color={theme.muted} />
      {shown.length ? (
        <Label text={shown.map(windowText).join("\n")} size={13} weight="medium" color={theme.text} lines={4} />
      ) : (
        <Label text={emptyText} size={13} color={theme.text} lines={2} />
      )}
      {rest > 0 ? <Label text={`ще ${rest}`} size={11} color={theme.muted} /> : null}
    </VStack>
  )
}

function LargeDay({ c, look, runs, nowMin, today }: { c: Ctx; look: string; runs: Run[]; nowMin: number | null; today: boolean }) {
  if (look === "battery") return null // батарея показує лише поточний відрізок, а не окремий день
  if (look === "ring") {
    const center = today ? <DialText c={c} unit={140 / 130} withTimer={false} /> : <TomorrowText c={c} unit={140 / 130} />
    return <RingDial c={c} size={140} runs={runs} nowMin={nowMin} center={center} />
  }
  const [width, height] = PICTURES.large[look]
  return <DayLook look={look} width={width} height={height} runs={runs} nowMin={nowMin} paint={homePaint(look, c.theme)} />
}

function Large({ c, look }: { c: Ctx; look: string }) {
  if (!c.view.todayRuns.length) return <TextOnly c={c} />
  const { view, theme } = c
  return (
    <VStack alignment="leading" spacing={0} padding={{ top: 14, leading: 16, bottom: 12, trailing: 14 }} frame={{ ...fill, alignment: "topLeading" }}>
      <HStack spacing={4}>
        <Label text={captionText(view)} size={11} color={theme.muted} />
        <Spacer minLength={0} />
        <Refresh color={theme.muted} />
      </HStack>
      <Status c={c} withTimer={look !== "battery"} />
      <Spacer minLength={6} />
      {look === "battery" ? (
        <VStack spacing={0}>
          <Centered>
            <BatteryDial c={c} width={Math.min(280, c.width - 40)} height={84} />
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
      {view.fact ? <FactLine c={c} size={12} /> : <Checked c={c} />}
    </VStack>
  )
}

// ---------- Екран блокування ----------
// iOS фарбує віджет сама, тож кольорів тексту не задаємо.

function LockDetail({ c, timerSize, timerWeight = "regular" }: { c: Ctx; timerSize: number; timerWeight?: FontWeight }) {
  const { view } = c
  if (view.notice) return <Label text={view.notice} size={12} lines={2} />
  if (hasTimer(view, c.now)) return <Timer c={c} size={timerSize} weight={timerWeight} />
  return <Label text={lockLine(view)} size={12} lines={2} />
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
      <FactLine c={c} compact size={11} lock />
    </VStack>
  )
}

function LockGarland({ c }: { c: Ctx }) {
  const { view } = c
  const width = Math.min(c.width, 160)
  const height = Math.round(Math.min(width * 0.3, c.height - 22))
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
      <Garland width={width} height={height} runs={view.todayRuns} nowMin={view.nowMin} paint={LOCK_PAINT} />
    </VStack>
  )
}

function Rectangular({ c, look }: { c: Ctx; look: string }) {
  const { view } = c
  const hasDay = view.todayRuns.length > 0
  if (look === "garland" && hasDay) return <LockGarland c={c} />
  let picture: VirtualNode | null = null
  if (hasDay && look === "ring") {
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
          <LockDetail c={c} timerSize={look === "battery" ? 19 : 15} timerWeight={look === "battery" ? "bold" : "regular"} />
          <FactLine c={c} compact size={11} lock />
        </VStack>
      )}
      <Spacer minLength={0} />
    </HStack>
  )
}

// Круглий віджет: малюнок і час наступної зміни.
const CIRCULAR_BOX: Record<string, { x: number; y: number; w: number; h: number }> = {
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
  if (look === "battery") picture = <Battery width={box.w} height={box.h} view={view} paint={LOCK_PAINT} />
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
function Inline({ view }: { view: View }) {
  return <Text>{view.title}</Text>
}

// ---------- Вибір розкладки ----------

// transparent: у налаштуваннях віджета ввімкнено прозорий фон (або це віджет із прозорим чи розмитим тлом).
// Тоді свого фону не малюємо зовсім, а текст світлий із тінню, щоб читався поверх шпалер.
export function WidgetContent({
  view, now, date, family, width, height, transparent = false,
}: { view: View; now: Now; date: Date; family: WidgetFamily; width: number; height: number; transparent?: boolean }) {
  const theme = transparent ? CLEAR_THEME : themeFor(view)
  const c: Ctx = { view, now, date, theme, width, height }
  if (family === "accessoryInline") return <Inline view={view} />
  const lockLook = lookOf(view.lockLook, DEFAULT_LOCK_LOOK)
  if (family === "accessoryCircular") return <Circular c={c} look={lockLook} />
  if (family === "accessoryRectangular") return <Rectangular c={c} look={lockLook} />
  const look = lookOf(view.look, DEFAULT_LOOK)
  let content: VirtualNode
  if (family === "systemSmall") content = <Small c={c} look={look} />
  else if (family === "systemMedium") content = <Medium c={c} look={look} />
  else content = <Large c={c} look={look} />
  if (transparent) {
    return (
      <ZStack frame={fill} shadow={{ color: "rgba(0,0,0,0.45)", radius: 2, y: 1 }}>
        {content}
      </ZStack>
    )
  }
  return (
    <ZStack
      frame={fill}
      widgetBackground={{ colors: [theme.background[0], theme.background[1]], startPoint: "topLeading", endPoint: "bottomTrailing" }}
    >
      {content}
    </ZStack>
  )
}
