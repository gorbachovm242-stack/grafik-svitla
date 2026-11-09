// Пʼять виглядів: будинок, плитки, гірлянда, батарея, кільце. Кожна клітинка, вікно чи лампочка
// це одна година; частину години зафарбовано точно за графіком. Розміри в точках екрана.
import { ZStack, RoundedRectangle, Circle, PathShape, Text, Path2D } from "scripting"
import type { Color, ShapeStyle, VirtualNode } from "scripting"
import type { Part, Run, View } from "./logic"
import { batteryLevel, currentHour, hourParts, isCharging } from "./logic"
import type { Cells, Paint } from "./theme"

export const HOUR_GUTTER = 16 // місце для підписів годин ліворуч

const H = (x: number) => Math.round(x * 100) / 100

// Частини години стоять поруч без накладання: на екрані блокування кольори прозорі.
function partsFill(parts: Part[], colors: Cells): ShapeStyle {
  if (parts.length === 1) return colors[parts[0].st]
  const stops: { color: Color; location: number }[] = []
  for (const part of parts) {
    const from = (part.from % 60) / 60
    const to = from + (part.to - part.from) / 60
    stops.push({ color: colors[part.st], location: H(from) }, { color: colors[part.st], location: H(to) })
  }
  return { stops, startPoint: "leading", endPoint: "trailing" }
}

function cellFill(parts: Part[], paint: Paint, vertical: boolean): ShapeStyle {
  if (parts.length === 1 && parts[0].st === "on" && !paint.lock) {
    return vertical
      ? { colors: [paint.lit[0], paint.lit[1]], startPoint: "top", endPoint: "bottom" }
      : { colors: [paint.lit[0], paint.lit[1]], startPoint: "topLeading", endPoint: "bottomTrailing" }
  }
  return partsFill(parts, paint.cells)
}

const hasLight = (parts: Part[]) => parts.some((part) => part.st === "on")

type Box = { x: number; y: number; w: number; h: number }

function Cell({ box, radius, fill, glow, opacity }: { box: Box; radius: number; fill: ShapeStyle; glow?: Color | null; opacity?: number }) {
  return (
    <RoundedRectangle
      cornerRadius={H(radius)}
      fill={fill}
      frame={{ width: H(box.w), height: H(box.h) }}
      offset={{ x: H(box.x), y: H(box.y) }}
      shadow={glow ? { color: glow, radius: 2.5 } : undefined}
      opacity={opacity}
    />
  )
}

function Mark({ box, radius, color }: { box: Box; radius: number; color: Color }) {
  return (
    <RoundedRectangle
      cornerRadius={H(radius + 1)}
      stroke={{ shapeStyle: color, strokeStyle: { lineWidth: 1.6 } }}
      frame={{ width: H(box.w + 2.4), height: H(box.h + 2.4) }}
      offset={{ x: H(box.x - 1.2), y: H(box.y - 1.2) }}
    />
  )
}

function HourLabel({ hour, y, height, color }: { hour: number; y: number; height: number; color: Color }) {
  return (
    <Text
      font={9}
      fontWeight="medium"
      foregroundStyle={color}
      lineLimit={1}
      frame={{ width: HOUR_GUTTER - 4, height: 12, alignment: "trailing" }}
      offset={{ x: 0, y: H(y + (height - 12) / 2) }}
    >
      {String(hour)}
    </Text>
  )
}

function Canvas({ width, height, children }: { width: number; height: number; children: (VirtualNode | null)[] }) {
  return (
    <ZStack alignment="topLeading" frame={{ width: H(width), height: H(height), alignment: "topLeading" }}>
      {children.filter(Boolean) as VirtualNode[]}
    </ZStack>
  )
}

type DayProps = { width: number; height: number; runs: Run[]; nowMin: number | null; paint: Paint }

// Шість поверхів по чотири вікна: день читається зверху вниз, як текст.
export function House({ width, height, runs, nowMin, paint }: DayProps) {
  const gutter = paint.label ? HOUR_GUTTER : 0
  const stair = paint.wall ? height * 0.05 : 0
  const x = gutter
  const y = stair
  const w = width - gutter
  const h = height - stair
  const items: (VirtualNode | null)[] = []
  if (paint.wall) {
    items.push(<Cell box={{ x: x + w * 0.2, y: 0, w: w * 0.26, h: stair * 2 }} radius={2} fill={paint.roof as Color} />)
    items.push(
      <Cell box={{ x, y, w, h }} radius={5} fill={{ colors: [paint.wall[0], paint.wall[1]], startPoint: "top", endPoint: "bottom" }} />
    )
  } else {
    items.push(
      <RoundedRectangle
        cornerRadius={4}
        stroke={{ shapeStyle: paint.line, strokeStyle: { lineWidth: 1.2 } }}
        frame={{ width: H(w - 1.2), height: H(h - 1.2) }}
        offset={{ x: H(x + 0.6), y: H(y + 0.6) }}
      />
    )
  }
  const padX = w * 0.09
  const padY = h * 0.055
  const gapX = w * 0.045
  const cellW = (w - 2 * padX - 3 * gapX) / 4
  const cellH = (h - 2 * padY) / (6 + 5 * 0.45)
  const radius = cellW * 0.2
  const current = currentHour(nowMin)
  for (let hour = 0; hour < 24; hour++) {
    const col = hour % 4
    const row = Math.floor(hour / 4)
    const box = { x: x + padX + col * (cellW + gapX), y: y + padY + row * cellH * 1.45, w: cellW, h: cellH }
    const parts = hourParts(runs, hour)
    items.push(<Cell box={box} radius={radius} fill={cellFill(parts, paint, true)} glow={paint.glow && hasLight(parts) ? paint.glow : null} />)
    if (hour === current) items.push(<Mark box={box} radius={radius} color={paint.mark} />)
    if (paint.label && col === 0) items.push(<HourLabel hour={hour} y={box.y} height={box.h} color={paint.label} />)
  }
  return <Canvas width={width} height={height}>{items}</Canvas>
}

// Чотири рядки по шість годин. Минулі години притишено, поточна в рамці.
export function Tiles({ width, height, runs, nowMin, paint }: DayProps) {
  const gutter = paint.label ? HOUR_GUTTER : 2 // рамка поточної години не повинна вийти за край
  const edge = 2
  const gap = Math.max(2, width * 0.02)
  const cellW = (width - gutter - edge - 5 * gap) / 6
  const cellH = (height - 2 * edge - 3 * gap) / 4
  const radius = Math.min(cellW, cellH) * 0.22
  const current = currentHour(nowMin)
  const items: (VirtualNode | null)[] = []
  for (let hour = 0; hour < 24; hour++) {
    const col = hour % 6
    const row = Math.floor(hour / 6)
    const box = { x: gutter + col * (cellW + gap), y: edge + row * (cellH + gap), w: cellW, h: cellH }
    const parts = hourParts(runs, hour)
    const past = paint.fadePast && hour < current
    items.push(<Cell box={box} radius={radius} fill={cellFill(parts, paint, false)} opacity={past ? 0.45 : undefined} />)
    if (hour === current) items.push(<Mark box={box} radius={radius} color={paint.mark} />)
    if (paint.label && col === 0) items.push(<HourLabel hour={hour} y={box.y} height={box.h} color={paint.label} />)
  }
  return <Canvas width={width} height={height}>{items}</Canvas>
}

// Два дроти по 12 лампочок: верхній від 0 до 12 години, нижній від 12 до 24.
export function Garland({ width, height, runs, nowMin, paint }: DayProps) {
  const spans = paint.glow ? 2 : 1
  const rowHeight = height / 2
  const spanWidth = width / spans
  const sag = rowHeight * (spans === 2 ? 0.2 : 0.16)
  const radius = Math.min((width / 12) * 0.36, rowHeight * 0.2)
  const margin = paint.glow ? radius * 1.75 : radius + 2.5 // ореол і рамка не повинні вийти за край
  const step = (width - 2 * margin) / 11
  const current = currentHour(nowMin)
  const items: (VirtualNode | null)[] = []
  for (let row = 0; row < 2; row++) {
    const top = row * rowHeight + 1
    const wire = new Path2D((path) => {
      path.move({ x: 0, y: H(top) })
      for (let span = 0; span < spans; span++) {
        path.addQuadCurve({ x: H((span + 1) * spanWidth), y: H(top) }, { x: H((span + 0.5) * spanWidth), y: H(top + 2 * sag) })
      }
    })
    items.push(
      <PathShape
        path={wire}
        stroke={{ shapeStyle: paint.wire, strokeStyle: { lineWidth: 1 } }}
        frame={{ width: H(width), height: H(height) }}
      />
    )
    for (let i = 0; i < 12; i++) {
      const hour = row * 12 + i
      const x = margin + i * step
      const along = (x % spanWidth) / spanWidth
      const y = top + 4 * sag * along * (1 - along) + radius + 1
      const parts = hourParts(runs, hour)
      if (paint.glow && hasLight(parts)) {
        const g = radius * 1.75
        items.push(
          <Circle fill={{ color: paint.glow, opacity: 0.3 }} frame={{ width: H(g * 2), height: H(g * 2) }} offset={{ x: H(x - g), y: H(y - g) }} />
        )
      }
      const lit = parts.length === 1 && parts[0].st === "on" && !paint.lock
      const fill: ShapeStyle = lit
        ? { colors: [paint.lit[0], paint.lit[1]], center: "center", startRadius: 0, endRadius: H(radius) }
        : partsFill(parts, paint.cells)
      items.push(<Circle fill={fill} frame={{ width: H(radius * 2), height: H(radius * 2) }} offset={{ x: H(x - radius), y: H(y - radius) }} />)
      if (hour === current) {
        const around = radius + 1.6
        items.push(
          <Circle
            stroke={{ shapeStyle: paint.mark, strokeStyle: { lineWidth: 1.4 } }}
            frame={{ width: H(around * 2), height: H(around * 2) }}
            offset={{ x: H(x - around), y: H(y - around) }}
          />
        )
      }
    }
  }
  return <Canvas width={width} height={height}>{items}</Canvas>
}

// Блискавка тієї ж форми, що й у версії для Scriptable.
function boltPath(box: Box): Path2D {
  const unit = box.h / 20
  const left = box.x + box.w - 11 * unit
  const shape = [[6, 0], [0, 11], [5, 11], [3, 20], [11, 8], [6, 8], [8, 0]]
  return new Path2D((path) => {
    path.addLines(shape.map(([px, py]) => ({ x: H(left + px * unit), y: H(box.y + py * unit) })))
    path.closeSubpath()
  })
}

// Зі світлом батарея розряджається до вимкнення, без нього заряджається до ввімкнення.
export function Battery({ width, height, view, paint }: { width: number; height: number; view: View; paint: Paint }) {
  const line = Math.max(1.5, height * 0.045)
  const nub = Math.max(2.5, width * 0.045)
  const body = { x: line / 2, y: line / 2, w: width - nub - line * 1.6, h: height - line }
  const radius = body.h * 0.25
  const inset = line / 2 + Math.max(2, height * 0.07)
  const inner = { x: body.x + inset, y: body.y + inset, w: body.w - 2 * inset, h: body.h - 2 * inset }
  const innerRadius = Math.max(2, radius - inset * 0.6)
  const level = batteryLevel(view)
  const charging = isCharging(view)
  const items: (VirtualNode | null)[] = [
    <RoundedRectangle
      cornerRadius={H(radius)}
      stroke={{ shapeStyle: paint.line, strokeStyle: { lineWidth: H(line) } }}
      frame={{ width: H(body.w), height: H(body.h) }}
      offset={{ x: H(body.x), y: H(body.y) }}
    />,
    <Cell box={{ x: width - nub, y: height * 0.3, w: nub, h: height * 0.4 }} radius={nub / 2} fill={paint.line} />,
  ]
  if (level > 0) {
    const fillWidth = Math.min(inner.w, Math.max(innerRadius * 2, inner.w * level))
    const colors = charging ? paint.charge : paint.batteryOn
    items.push(
      <Cell
        box={{ x: inner.x, y: inner.y, w: fillWidth, h: inner.h }}
        radius={innerRadius}
        fill={{ colors: [colors[0], colors[1]], startPoint: "top", endPoint: "bottom" }}
      />
    )
  }
  if (charging) {
    const boltH = inner.h * 0.6
    items.push(
      <PathShape
        path={boltPath({ x: inner.x, y: inner.y + (inner.h - boltH) / 2, w: inner.w - inner.h * 0.12, h: boltH })}
        fill={paint.line}
        frame={{ width: H(width), height: H(height) }}
      />
    )
  }
  return <Canvas width={width} height={height}>{items}</Canvas>
}

// ---------- Кільце доби ----------
// Північ угорі, час іде за годинниковою стрілкою, крапка показує, де ви зараз.

export type RingColors = Cells & { now: Color; edge: Color }

const opaque = (color: Color) => typeof color === "string" && color.startsWith("#")

function ringPoint(size: number, radius: number, minutes: number) {
  const angle = (minutes / 1440) * 2 * Math.PI
  return { x: size / 2 + radius * Math.sin(angle), y: size / 2 - radius * Math.cos(angle) }
}

export function Ring({
  size, lineWidth, runs, nowMin, colors, hoursColor,
}: { size: number; lineWidth: number; runs: Run[]; nowMin: number | null; colors: RingColors; hoursColor?: Color | null }) {
  const radius = size / 2 - lineWidth / 2 - 3
  const circumference = 2 * Math.PI * radius
  const list = runs.length ? runs : [{ s: 0, e: 1440, st: "unknown" as const }]
  const whole = list.length < 2
  const items: (VirtualNode | null)[] = []
  for (const run of list) {
    const color = colors[run.st]
    // Напівпрозорі кінці не заокруглюємо: накладання дало б темні плями.
    const rounded = !whole && opaque(color)
    const wanted = whole ? 0 : (rounded ? lineWidth / 2 + 1 : 1) / circumference
    const length = (run.e - run.s) / 1440
    const inset = Math.min(wanted, Math.max(length / 2 - 0.0003, 0))
    items.push(
      <Circle
        trim={{ from: H((run.s / 1440 + inset) * 10000) / 10000, to: H((run.e / 1440 - inset) * 10000) / 10000 }}
        stroke={{ shapeStyle: color, strokeStyle: { lineWidth, lineCap: rounded ? "round" : "butt" } }}
        rotationEffect={-90}
        frame={{ width: H(radius * 2), height: H(radius * 2) }}
        offset={{ x: H(size / 2 - radius), y: H(size / 2 - radius) }}
      />
    )
  }
  if (nowMin !== null) {
    const p = ringPoint(size, radius, nowMin)
    const outer = lineWidth + 4
    items.push(<Circle fill={colors.edge} frame={{ width: outer, height: outer }} offset={{ x: H(p.x - outer / 2), y: H(p.y - outer / 2) }} />)
    items.push(<Circle fill={colors.now} frame={{ width: lineWidth, height: lineWidth }} offset={{ x: H(p.x - lineWidth / 2), y: H(p.y - lineWidth / 2) }} />)
  }
  // Кільце показує 24 години, а без підписів його читають як звичайний 12-годинний циферблат.
  if (hoursColor) {
    const font = Math.max(8, size * 0.065)
    const inner = radius - lineWidth / 2 - font * 0.9
    for (const [minutes, label] of [[0, "0"], [360, "6"], [720, "12"], [1080, "18"]] as [number, string][]) {
      const p = ringPoint(size, inner, minutes)
      items.push(
        <Text
          font={H(font)}
          fontWeight="medium"
          foregroundStyle={hoursColor}
          lineLimit={1}
          frame={{ width: H(font * 3), height: H(font * 1.3) }}
          offset={{ x: H(p.x - font * 1.5), y: H(p.y - font * 0.65) }}
        >
          {label}
        </Text>
      )
    }
  }
  return <Canvas width={size} height={size}>{items}</Canvas>
}

// Ширина й висота малюнка в точках для кожного місця.
export const PICTURES: Record<string, Record<string, [number, number]>> = {
  medium: { house: [84, 136], tiles: [146, 110], garland: [150, 96], battery: [140, 76] },
  large: { house: [96, 140], tiles: [146, 110], garland: [146, 100] },
  lock: { house: [44, 68], tiles: [58, 52], battery: [52, 36] },
}

export function DayLook({ look, width, height, runs, nowMin, paint }: DayProps & { look: string }) {
  if (look === "house") return <House width={width} height={height} runs={runs} nowMin={nowMin} paint={paint} />
  if (look === "tiles") return <Tiles width={width} height={height} runs={runs} nowMin={nowMin} paint={paint} />
  return <Garland width={width} height={height} runs={runs} nowMin={nowMin} paint={paint} />
}
