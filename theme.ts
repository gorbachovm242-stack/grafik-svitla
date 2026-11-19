// Фони й кольори віджета: палітра «Ранковий туман» (та сама, що в «Маяку» для Android, android/design/PALETTE.md).
// Фон обирають у налаштуваннях: «Світлий» (типовий), «Нічний», «Напівпрозорий» (білий 85 % поверх шпалер, коли
// в налаштуваннях віджета Scripting увімкнено прозорий фон) і «Як система» (світлий удень, нічний у темній темі iPhone).
// Зеленого немає: у кожного стану свій знак, тож колір ніколи не єдиний носій.
import type { Color, DynamicShapeStyle, KeywordPoint, ShapeStyle } from "scripting"
import type { Status } from "./logic"

// Колір або пара кольорів для світлої й темної теми iPhone («Як система»): iOS сама обирає потрібний.
export type Ink = Color | { light: Color; dark: Color }
export type Fill = ShapeStyle | DynamicShapeStyle

// Значок стану: коло (заливка, обідок чи кільце, пунктир — немає даних), знак усередині, світіння, ярлик.
export type IconTok = { fill: Ink; glyph: Ink; rim?: Ink; ring?: Ink; dashed?: boolean; glow?: Color; pillBg?: Ink; pillText?: Ink }

// Сторінка тривоги: фон і текст свого стану. alpha < 1: напівпрозора («Напівпрозорий»), 0: без фону (прозорий фон Scripting).
export type PageTok = { bg0: Ink; bg1: Ink; title: Ink; text: Ink; muted: Ink; alpha: number }

export type Mode = "light" | "night" | "glass" | "auto" | "clear"

export type Tokens = {
  mode: Mode
  bg0: Ink
  bg1: Ink
  bgAlpha: number // 1 — суцільний фон, 0.85 — «Напівпрозорий», 0 — без фону
  shadow: boolean // текст із тінню поверх шпалер
  text: Ink
  muted: Ink
  timer: Ink
  brand: Ink // дрібний акцентний текст: місце, «Завтра»
  titleBolt: Ink // блискавка біля заголовка, великий час без світла
  refresh: Ink
  warn: Ink // попередження в тексті (графік змінився, старі дані)
  // Будинок та інші вигляди
  wall0: Ink
  wall1: Ink
  roof: Ink
  lit0: Ink
  lit1: Ink
  litGlow: Color
  dark: Ink // вікно без світла
  maybe: Ink
  now: Ink // рамка «зараз» у будинку
  label: Ink // підписи годин
  ringOn: Ink
  ringOff: Ink
  ringUnknown: Ink
  tileOff: Ink
  charge: Ink
  // Значки модулів
  icons: Record<"on" | "off" | "maybe" | "unknown" | "alert" | "threat" | "nearby" | "quiet" | "stale" | "idle", IconTok>
  // Стовпчик значків
  track: Ink // мʼяка доріжка під значками
  halo: Ink // відступ навколо значка
  marker: Ink // смужка відкритої сторінки
  dotOn: Ink
  dotOff: Ink
  // Датчик СвітлоБота: крапка біля «↻» і в рядку факту
  sensor: Record<"on" | "off" | "silent", IconTok>
  // Сторінки тривоги
  pages: Record<"alert" | "threat" | "nearby" | "quiet" | "neutral", PageTok>
}

// ---------- «Світлий» ----------

export function lightTokens(): Tokens {
  const t: Tokens = {
    mode: "light",
    bg0: "#FCFCFF", bg1: "#E6E8F3", bgAlpha: 1, shadow: false,
    text: "#1C1F33", muted: "#565B76", timer: "#3B4060", brand: "#4347B5", titleBolt: "#A26A00", refresh: "#565B76", warn: "#8A3E00",
    wall0: "#868CB1", wall1: "#686E9A", roof: "#5A6089", lit0: "#FFD660", lit1: "#FFB52A", litGlow: "#FFC233", dark: "#3E4470",
    maybe: "#E4CF98", now: "#FFFFFF", label: "#565B76", ringOn: "#FFB52A", ringOff: "#BCC1DA", ringUnknown: "#E2E4EE",
    tileOff: "#D0D4E6", charge: "#9FA4E0",
    icons: {
      on: { fill: "#FFC83F", glyph: "#342300", rim: "#9E6900" },
      off: { fill: "#3E4378", glyph: "#FFFFFF" },
      maybe: { fill: "#FFF2CF", glyph: "#7A5400", ring: "#A06C00" },
      unknown: { fill: "#EEF0F7", glyph: "#4E536C", ring: "#6F748E", dashed: true },
      alert: { fill: "#D6335C", glyph: "#FFFFFF", glow: "#E0406A", pillBg: "#D6335C", pillText: "#FFFFFF" },
      threat: { fill: "#F07A1C", glyph: "#331600", rim: "#A3520A", pillBg: "#F07A1C", pillText: "#2E1300" },
      nearby: { fill: "#FFF1E6", glyph: "#A54A05", ring: "#C55A10", pillBg: "#FFE6D2", pillText: "#7A3700" },
      quiet: { fill: "#666DAE", glyph: "#FFFFFF" },
      stale: { fill: "#EEF0F7", glyph: "#4E536C", ring: "#6F748E", dashed: true, pillBg: "#E3E6F1", pillText: "#43475F" },
      idle: { fill: "#707590", glyph: "#FFFFFF" },
    },
    track: "#DDE0EE", halo: "#FCFCFF", marker: "#4347B5", dotOn: "#4347B5", dotOff: "#6F758F",
    sensor: {
      on: { fill: "#FFC83F", glyph: "clear", rim: "#9E6900" },
      off: { fill: "#3E4378", glyph: "clear" },
      silent: { fill: "clear", glyph: "clear", ring: "#6F748E", dashed: true },
    },
    pages: {
      alert: { bg0: "#FFF6F8", bg1: "#F9DCE4", title: "#A2163F", text: "#33141F", muted: "#7A3D52", alpha: 1 },
      threat: { bg0: "#FFF6EC", bg1: "#FFDDBF", title: "#7A3700", text: "#3A1F0A", muted: "#6C4325", alpha: 1 },
      nearby: { bg0: "#FFFAF4", bg1: "#FFE8D6", title: "#7A3700", text: "#3A1F0A", muted: "#6C4325", alpha: 1 },
      quiet: { bg0: "#F6F6FE", bg1: "#E2E4F7", title: "#3E4378", text: "#1C1F33", muted: "#50556F", alpha: 1 },
      neutral: { bg0: "#FCFCFF", bg1: "#E6E8F3", title: "#1C1F33", text: "#1C1F33", muted: "#565B76", alpha: 1 },
    },
  }
  return t
}

// ---------- «Нічний»: темно-синє тло, лише явним вибором (або в темній темі для «Як система») ----------

export function nightTokens(): Tokens {
  const t = lightTokens()
  return {
    ...t,
    mode: "night",
    bg0: "#232741", bg1: "#14172A",
    text: "#F3F4FF", muted: "#B5B9D6", timer: "#DDE0F7", brand: "#C7CAFF", titleBolt: "#FFC83F", refresh: "#B5B9D6", warn: "#FFB27A",
    wall0: "#55598A", wall1: "#43477A", roof: "#383C66", dark: "#2A2D50", maybe: "#8F7F55", label: "#B5B9D6",
    ringOff: "#41466C", ringUnknown: "#2F3352", tileOff: "#3A3F63", charge: "#6F74C0",
    icons: {
      ...t.icons,
      off: { fill: "#232741", glyph: "#D3D5F2", ring: "#9599CC" },
      quiet: { fill: "#9DA3E6", glyph: "#1B1E38" },
      unknown: { fill: "#2D3150", glyph: "#D3D5F2", ring: "#8A8EB5", dashed: true },
      stale: { fill: "#2D3150", glyph: "#D3D5F2", ring: "#8A8EB5", dashed: true, pillBg: "#33375A", pillText: "#DDE0F7" },
      maybe: { fill: "#3A3550", glyph: "#FFC83F", ring: "#FFC83F" },
      nearby: { fill: "#3A2C3A", glyph: "#FFB07A", ring: "#FF9A55", pillBg: "#4A3036", pillText: "#FFD3B5" },
      alert: { fill: "#E5486E", glyph: "#FFFFFF", glow: "#E5486E", pillBg: "#C23258", pillText: "#FFFFFF" },
      idle: { fill: "#9A9EC8", glyph: "#1B1E38" },
    },
    track: "#2E3252", halo: "#232741", marker: "#C7CAFF", dotOn: "#C7CAFF", dotOff: "#8A8EB5",
    sensor: {
      on: { fill: "#FFC83F", glyph: "clear", rim: "#FFC83F" },
      off: { fill: "clear", glyph: "clear", ring: "#9599CC" }, // на темному фоні «немає світла» кільцем
      silent: { fill: "clear", glyph: "clear", ring: "#8A8EB5", dashed: true },
    },
    pages: {
      alert: { bg0: "#3B1B2C", bg1: "#2A1220", title: "#FF9DB8", text: "#F7E8EE", muted: "#D7AFC1", alpha: 1 },
      threat: { bg0: "#3A2614", bg1: "#29190C", title: "#FFB872", text: "#F8EEE4", muted: "#D9BFA6", alpha: 1 },
      nearby: { bg0: "#33261C", bg1: "#231910", title: "#FFB872", text: "#F8EEE4", muted: "#D9BFA6", alpha: 1 },
      quiet: { bg0: "#232741", bg1: "#14172A", title: "#C7CAFF", text: "#F3F4FF", muted: "#B5B9D6", alpha: 1 },
      neutral: { bg0: "#232741", bg1: "#14172A", title: "#F3F4FF", text: "#F3F4FF", muted: "#B5B9D6", alpha: 1 },
    },
  }
}

// ---------- «Напівпрозорий»: біле тло 85 % поверх шпалер ----------
// Рахуємо найгірше: чорні шпалери під віджетом (тло тоді #D9D9D9). Тому приглушений текст і дрібні знаки темніші.

export const GLASS = 0.85

export function glassTokens(): Tokens {
  const t = lightTokens()
  return {
    ...t,
    mode: "glass",
    bg0: "#FFFFFF", bg1: "#FFFFFF", bgAlpha: GLASS,
    muted: "#40445E", timer: "#1C1F33", brand: "#2F3290", titleBolt: "#6F4600", refresh: "#40445E", warn: "#6E3100", label: "#40445E",
    halo: "#FFFFFF", track: "rgba(255,255,255,0.92)", dotOff: "#40445E",
    sensor: { ...t.sensor, on: { ...t.sensor.on, rim: "#6F4600" }, silent: { ...t.sensor.silent, ring: "#40445E" } },
    // Сторінки тривоги теж напівпрозорі, але з відтінком свого стану, щоб тривогу було видно й на цьому фоні.
    pages: {
      alert: { bg0: "#FCE8EE", bg1: "#FCE8EE", title: "#8E1236", text: "#2A0F19", muted: "#6A3044", alpha: GLASS },
      threat: { bg0: "#FFEEDD", bg1: "#FFEEDD", title: "#6A2F00", text: "#2E1806", muted: "#5C3819", alpha: GLASS },
      nearby: { bg0: "#FFF3E8", bg1: "#FFF3E8", title: "#6A2F00", text: "#2E1806", muted: "#5C3819", alpha: GLASS },
      quiet: { bg0: "#FFFFFF", bg1: "#FFFFFF", title: "#2F3290", text: "#1C1F33", muted: "#40445E", alpha: GLASS },
      neutral: { bg0: "#FFFFFF", bg1: "#FFFFFF", title: "#1C1F33", text: "#1C1F33", muted: "#40445E", alpha: GLASS },
    },
  }
}

// ---------- Прозорий фон Scripting без «Напівпрозорого»: свого фону немає, під віджетом шпалери ----------
// Світлий текст із тінню, напівпрозорі малюнки. Кольори значків і заголовків тривоги з «Нічного».

export function clearTokens(): Tokens {
  const t = nightTokens()
  const page = (title: Color): PageTok => ({ bg0: "clear", bg1: "clear", title, text: "#FFFFFF", muted: "rgba(255,255,255,0.85)", alpha: 0 })
  return {
    ...t,
    mode: "clear",
    bg0: "clear", bg1: "clear", bgAlpha: 0, shadow: true,
    text: "#FFFFFF", muted: "rgba(255,255,255,0.85)", timer: "#FFFFFF", brand: "#FFFFFF", titleBolt: "#FFD66B",
    refresh: "rgba(255,255,255,0.85)", warn: "#FFC27A", label: "rgba(255,255,255,0.8)",
    wall0: "rgba(255,255,255,0.3)", wall1: "rgba(255,255,255,0.16)", roof: "rgba(255,255,255,0.4)", dark: "rgba(0,0,0,0.38)",
    maybe: "rgba(255,255,255,0.62)", ringOn: "#FFD66B", ringOff: "rgba(255,255,255,0.38)", ringUnknown: "rgba(255,255,255,0.2)",
    tileOff: "rgba(255,255,255,0.28)", charge: "rgba(255,255,255,0.5)",
    track: "rgba(255,255,255,0.2)", halo: "clear", marker: "#FFFFFF", dotOn: "#FFFFFF", dotOff: "rgba(255,255,255,0.6)",
    pages: { alert: page("#FF9DB8"), threat: page("#FFB872"), nearby: page("#FFB872"), quiet: page("#FFFFFF"), neutral: page("#FFFFFF") },
  }
}

// ---------- «Як система»: світлий удень, нічний у темній темі iPhone ----------
// Кожен колір стає парою { light, dark }, і iOS сама обирає, навіть коли тема змінюється між оновленнями віджета.

function isColorKey(key: string): boolean {
  return !["mode", "bgAlpha", "shadow", "dashed", "alpha", "litGlow", "glow"].includes(key)
}

function mixValue(key: string, a: any, b: any): any {
  if (!isColorKey(key)) return a !== undefined ? a : b
  if (a && typeof a === "object") {
    const out: any = {}
    for (const k of new Set([...Object.keys(a), ...Object.keys(b || {})])) out[k] = mixValue(k, a[k], b ? b[k] : undefined)
    return out
  }
  if (a === undefined && b === undefined) return undefined
  const light = a === undefined ? "clear" : a
  const dark = b === undefined ? "clear" : b
  return light === dark ? light : { light, dark }
}

export function autoTokens(): Tokens {
  const out = mixValue("root", lightTokens(), nightTokens()) as Tokens
  out.mode = "auto"
  return out
}

// ---------- Вибір фону ----------

export const STYLE_IDS = ["light", "night", "glass", "auto"]
export const STYLE_NAMES: Record<string, string> = { light: "Світлий", night: "Нічний", glass: "Напівпрозорий", auto: "Як система" }
export const DEFAULT_STYLE = "light"

// Старі фони (до 2.0) переходять на найближчий новий: «Індиго» на «Нічний», «Світанок» і «Колір за станом» на «Світлий».
export function styleOf(id: string | null | undefined): string {
  if (id && STYLE_IDS.includes(id)) return id
  return id === "indigo" ? "night" : DEFAULT_STYLE
}

// Прозорість, яку задали в налаштуваннях віджета Scripting:
// "simulated" — шпалери намальовано під віджетом (Widget.isTransparentBackground), "system" — фон малює сама iOS
// (віджет із прозорим чи розмитим тлом: тоді вміст має лишатися цілком прозорим), "none" — звичайний віджет.
export type Backdrop = "none" | "simulated" | "system"

export function tokensFor(style: string | null | undefined, backdrop: Backdrop = "none"): Tokens {
  const id = styleOf(style)
  if (backdrop === "system") return clearTokens()
  if (backdrop === "simulated") return id === "glass" ? glassTokens() : clearTokens()
  if (id === "night") return nightTokens()
  if (id === "glass") return glassTokens()
  if (id === "auto") return autoTokens()
  return lightTokens()
}

// ---------- Колір із темою iPhone ----------

export function isDyn(c: Ink | null | undefined): c is { light: Color; dark: Color } {
  return !!c && typeof c === "object" && "light" in c
}

export const lightOf = (c: Ink): Color => (isDyn(c) ? c.light : c)
export const darkOf = (c: Ink): Color => (isDyn(c) ? c.dark : c)

// Лінійний градієнт із кольорів, які можуть залежати від теми iPhone.
export function gradient(colors: Ink[], startPoint: KeywordPoint, endPoint: KeywordPoint): Fill {
  const build = (pick: (c: Ink) => Color): ShapeStyle => ({ colors: colors.map(pick), startPoint, endPoint })
  return colors.some(isDyn) ? { light: build(lightOf), dark: build(darkOf) } : build(lightOf)
}

// Різкі переходи всередині години (частину години зафарбовано за графіком).
export function stopsGradient(stops: { color: Ink; location: number }[], startPoint: KeywordPoint, endPoint: KeywordPoint): Fill {
  const build = (pick: (c: Ink) => Color): ShapeStyle => ({ stops: stops.map((s) => ({ color: pick(s.color), location: s.location })), startPoint, endPoint })
  return stops.some((s) => isDyn(s.color)) ? { light: build(lightOf), dark: build(darkOf) } : build(lightOf)
}

export function radial(colors: Ink[], endRadius: number): Fill {
  const build = (pick: (c: Ink) => Color): ShapeStyle => ({ colors: colors.map(pick), center: "center", startRadius: 0, endRadius })
  return colors.some(isDyn) ? { light: build(lightOf), dark: build(darkOf) } : build(lightOf)
}

// Колір із прозорістю.
export function fade(c: Ink, opacity: number): Fill {
  return isDyn(c) ? { light: { color: c.light, opacity }, dark: { color: c.dark, opacity } } : { color: c, opacity }
}

// Чи колір суцільний (кінці дуг кільця заокруглюємо лише в суцільних, інакше накладання дає темні плями).
export function opaque(c: Ink): boolean {
  const l = lightOf(c)
  return typeof l === "string" && l.startsWith("#")
}

// Фон віджета чи сторінки тривоги: діагональний градієнт, у «Напівпрозорому» білий 85 %.
export function backgroundFill(bg0: Ink, bg1: Ink, alpha: number, vertical = false): Fill | null {
  if (alpha <= 0) return null
  if (alpha < 1) return fade(bg0, alpha)
  return gradient([bg0, bg1], vertical ? "top" : "topLeading", vertical ? "bottom" : "bottomTrailing")
}

// ---------- Стан → значок і сторінка ----------

// Модуль світла: світло є, немає, можливе відключення; решта (зараз стан невідомий) — пунктирне коло.
export function lightIcon(t: Tokens, kind: string | null | undefined): IconTok {
  if (kind === "on") return t.icons.on
  if (kind === "off") return t.icons.off
  if (kind === "maybe" || kind === "check") return t.icons.maybe
  return t.icons.unknown
}

// Модуль тривоги: тривога, загроза, поруч, тихо, немає даних; не налаштовано — сірий.
export function alertIcon(t: Tokens, kind: string | null | undefined): IconTok {
  switch (kind) {
    case "alert": return t.icons.alert
    case "threat": return t.icons.threat
    case "nearby": return t.icons.nearby
    case "quiet": return t.icons.quiet
    case "nodata": return t.icons.stale
    default: return t.icons.idle
  }
}

export function alertPage(t: Tokens, kind: string | null | undefined): PageTok {
  switch (kind) {
    case "alert": return t.pages.alert
    case "threat": return t.pages.threat
    case "nearby": return t.pages.nearby
    case "quiet": return t.pages.quiet
    default: return t.pages.neutral
  }
}

// Знаки значків: SF Symbols.
export function lightGlyph(kind: string | null | undefined): string {
  return kind === "off" ? "bolt.slash.fill" : "bolt.fill"
}

export function alertGlyph(kind: string | null | undefined): string {
  switch (kind) {
    case "threat": return "exclamationmark"
    case "quiet": return "checkmark"
    case "setup": return "mappin"
    default: return "light.beacon.max.fill"
  }
}

// ---------- Вигляди світла ----------

export type Cells = Record<Status, Ink>

// Чим малювати вигляд. На екрані блокування iOS фарбує віджет сама, тож важить лише прозорість.
export type Paint = {
  lock: boolean
  cells: Cells
  lit: [Ink, Ink] // градієнт світлого вікна чи лампочки
  wall: [Ink, Ink] | null
  roof: Ink | null
  mark: Ink // рамка поточної години
  label: Ink | null // підписи годин
  line: Ink // контур батареї, будинку, текст поруч
  wire: Ink
  glow: Color | null
  batteryOn: [Ink, Ink]
  charge: [Ink, Ink]
  fadePast: boolean
}

export function homePaint(look: string, t: Tokens): Paint {
  const house = look === "house"
  let cells: Cells = { on: t.ringOn, off: t.ringOff, maybe: t.maybe, unknown: t.ringUnknown }
  if (house) cells = { on: t.lit0, off: t.dark, maybe: t.maybe, unknown: t.roof }
  else if (look === "tiles") cells = { on: t.icons.on.fill, off: t.tileOff, maybe: t.maybe, unknown: t.ringUnknown }
  return {
    lock: false,
    cells,
    lit: [house ? t.lit0 : cells.on, t.lit1],
    wall: [t.wall0, t.wall1],
    roof: t.roof,
    mark: house ? t.now : t.text,
    label: t.label,
    line: t.text,
    wire: t.muted,
    glow: t.litGlow,
    batteryOn: [t.icons.on.fill, t.lit1],
    charge: [t.charge, t.charge],
    fadePast: true,
  }
}

export type RingColors = Cells & { now: Ink; edge: Ink }

export function ringColors(t: Tokens): RingColors {
  return {
    on: t.ringOn, off: t.ringOff, maybe: t.maybe, unknown: t.ringUnknown, now: t.text,
    edge: t.bgAlpha <= 0 ? "rgba(0,0,0,0.45)" : t.bgAlpha < 1 ? "#FFFFFF" : t.bg0,
  }
}

export const LOCK_TEXT: Color = "#FFFFFF"

export const LOCK_PAINT: Paint = {
  lock: true,
  cells: { on: "#FFFFFF", off: "rgba(255,255,255,0.24)", maybe: "rgba(255,255,255,0.55)", unknown: "rgba(255,255,255,0.12)" },
  lit: ["#FFFFFF", "#FFFFFF"],
  wall: null,
  roof: null,
  mark: "#FFFFFF",
  label: null,
  line: "#FFFFFF",
  wire: "rgba(255,255,255,0.72)",
  glow: null,
  batteryOn: ["#FFFFFF", "#FFFFFF"],
  charge: ["rgba(255,255,255,0.55)", "rgba(255,255,255,0.55)"],
  fadePast: false,
}

// Кільце на екрані блокування: прозорість показує стан.
export const LOCK_RING: RingColors = {
  on: "rgba(255,255,255,0.32)", off: "#FFFFFF", maybe: "rgba(255,255,255,0.62)", unknown: "rgba(255,255,255,0.16)",
  now: "#FFFFFF", edge: "#000000",
}

// ---------- Контраст WCAG (для перевірок на ПК) ----------

function rgb(c: string): [number, number, number] {
  const n = parseInt(c.slice(1, 7), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function luminance(c: string): number {
  const v = rgb(c).map((ch) => {
    const x = ch / 255
    return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
}

export function contrast(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

// Колір fg із прозорістю alpha поверх bg.
export function over(fg: string, alpha: number, bg: string): string {
  const f = rgb(fg)
  const b = rgb(bg)
  return "#" + f.map((x, i) => Math.round(x * alpha + b[i] * (1 - alpha)).toString(16).padStart(2, "0")).join("").toUpperCase()
}
