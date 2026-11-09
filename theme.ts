// Фони й кольори. У віджеті фон обирають у налаштуваннях, а не за темною темою iPhone.
import type { Color } from "scripting"
import type { Status, View } from "./logic"

export type Cells = Record<Status, Color>

export type Theme = {
  background: [Color, Color]
  text: Color
  muted: Color
  warn: Color
  accent: Color
  ring: Cells & { now: Color; edge: Color }
  look: {
    wall: Color
    wallLow: Color
    roof: Color
    lit: Color
    litLow: Color
    dark: Color
    tileOn: Color
    tileOff: Color
    batteryOn: Color
    charge: Color
  }
}

type Style = { name: string; theme: Theme; night?: Theme }

export const STYLES: Record<string, Style> = {
  light: {
    name: "Світлий",
    theme: {
      background: ["#FFFFFF", "#FFF3DC"], text: "#2A2622", muted: "#6B6258", warn: "#B45309", accent: "#B97A00",
      ring: { on: "#FFB81C", off: "#C4C8D2", maybe: "#E8CE93", unknown: "#E7E3DB", now: "#2A2622", edge: "#FFFFFF" },
      look: {
        wall: "#959CB0", wallLow: "#7D849A", roof: "#6E7590", lit: "#FFD24A", litLow: "#FFB020", dark: "#5B6178",
        tileOn: "#FFCB52", tileOff: "#D6D9E2", batteryOn: "#FFCB52", charge: "#B9B4EC",
      },
    },
  },
  dawn: {
    name: "Світанок",
    theme: {
      background: ["#FFE3CC", "#E3D6FF"], text: "#33284A", muted: "#5E5070", warn: "#A23B1E", accent: "#C2570C",
      ring: { on: "#FF9A2E", off: "#8F7FC7", maybe: "#C9BDE8", unknown: "#F3E6F0", now: "#33284A", edge: "#FFFFFF" },
      look: {
        wall: "#8676BA", wallLow: "#6C5BA0", roof: "#5C4C92", lit: "#FFD24A", litLow: "#FFA12E", dark: "#4E4080",
        tileOn: "#FFB04D", tileOff: "#BDB0E6", batteryOn: "#FFB04D", charge: "#B39BEF",
      },
    },
  },
  state: {
    name: "Колір за станом",
    theme: {
      background: ["#FFD66B", "#FFA726"], text: "#3B2500", muted: "#6A4A12", warn: "#7A2E00", accent: "#3B2500",
      ring: { on: "#FFF3D1", off: "#5A3D10", maybe: "#B98A3A", unknown: "#FFDF9E", now: "#3B2500", edge: "#FFE3A0" },
      look: {
        wall: "#A66E1A", wallLow: "#84540F", roof: "#73480C", lit: "#FFF3D1", litLow: "#FFE08A", dark: "#5A3D10",
        tileOn: "#FFF3D1", tileOff: "#C98A2E", batteryOn: "#FFF3D1", charge: "#C98A2E",
      },
    },
    night: {
      background: ["#2B3A63", "#0F1526"], text: "#EAF0FF", muted: "#B4C0DC", warn: "#FFC27A", accent: "#FFD66B",
      ring: { on: "#FFD66B", off: "#46547C", maybe: "#7886AD", unknown: "#2F3C60", now: "#FFFFFF", edge: "#18213B" },
      look: {
        wall: "#4C5A84", wallLow: "#3A4769", roof: "#323E5E", lit: "#FFD66B", litLow: "#F2B33D", dark: "#232E50",
        tileOn: "#FFD66B", tileOff: "#46547C", batteryOn: "#C28A1E", charge: "#5568A8",
      },
    },
  },
  indigo: {
    name: "Індиго",
    theme: {
      background: ["#4A47B8", "#201D5C"], text: "#F5F3FF", muted: "#CFCBF5", warn: "#FFC27A", accent: "#FFD66B",
      ring: { on: "#FFC83D", off: "#6663C4", maybe: "#9592DC", unknown: "#4744A0", now: "#FFFFFF", edge: "#2C2977" },
      look: {
        wall: "#6C69C9", wallLow: "#5754B4", roof: "#4B48A6", lit: "#FFC83D", litLow: "#F29F1F", dark: "#38358F",
        tileOn: "#FFC83D", tileOff: "#6663C4", batteryOn: "#C28A1E", charge: "#6F6CD6",
      },
    },
  },
}

export const DEFAULT_STYLE = "light"

// Прозорий фон у налаштуваннях віджета Scripting: під віджетом шпалери, тож світлий текст і напівпрозорі малюнки.
export const CLEAR_THEME: Theme = {
  background: ["rgba(0,0,0,0)", "rgba(0,0,0,0)"], text: "#FFFFFF", muted: "rgba(255,255,255,0.8)", warn: "#FFC27A", accent: "#FFD66B",
  ring: {
    on: "#FFD66B", off: "rgba(255,255,255,0.38)", maybe: "rgba(255,255,255,0.62)", unknown: "rgba(255,255,255,0.2)",
    now: "#FFFFFF", edge: "rgba(0,0,0,0.45)",
  },
  look: {
    wall: "rgba(255,255,255,0.3)", wallLow: "rgba(255,255,255,0.16)", roof: "rgba(255,255,255,0.4)", lit: "#FFD66B", litLow: "#F2B33D",
    dark: "rgba(0,0,0,0.38)", tileOn: "#FFD66B", tileOff: "rgba(255,255,255,0.28)", batteryOn: "#FFD66B", charge: "rgba(255,255,255,0.5)",
  },
}

export function styleOf(id: string | null | undefined): string {
  return id && STYLES[id] ? id : DEFAULT_STYLE
}

// «Колір за станом»: сонячний зі світлом і нічний без нього.
export function themeFor(view: View): Theme {
  const style = STYLES[styleOf(view.style)]
  return style.night && view.kind !== "on" ? style.night : style.theme
}

// Чим малювати вигляд. На екрані блокування iOS фарбує віджет сама, тож важить лише прозорість.
export type Paint = {
  lock: boolean
  cells: Cells
  lit: [Color, Color] // градієнт світлого вікна чи лампочки
  wall: [Color, Color] | null
  roof: Color | null
  mark: Color // рамка поточної години
  label: Color | null // підписи годин
  line: Color // контур батареї, будинку, текст поруч
  wire: Color
  glow: Color | null
  batteryOn: [Color, Color]
  charge: [Color, Color]
  fadePast: boolean
}

export function homePaint(look: string, theme: Theme): Paint {
  const c = theme.look
  const house = look === "house"
  let cells: Cells = { on: theme.ring.on, off: theme.ring.off, maybe: theme.ring.maybe, unknown: theme.ring.unknown }
  if (house) cells = { on: c.lit, off: c.dark, maybe: theme.ring.maybe, unknown: c.roof }
  else if (look === "tiles") cells = { on: c.tileOn, off: c.tileOff, maybe: theme.ring.maybe, unknown: theme.ring.unknown }
  return {
    lock: false,
    cells,
    lit: [house ? c.lit : cells.on, c.litLow],
    wall: [c.wall, c.wallLow],
    roof: c.roof,
    mark: house ? "#FFFFFF" : theme.ring.now,
    label: theme.muted,
    line: theme.text,
    wire: theme.muted,
    glow: c.lit,
    batteryOn: [c.batteryOn, c.litLow],
    charge: [c.charge, c.charge],
    fadePast: true,
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
export const LOCK_RING: Cells & { now: Color; edge: Color } = {
  on: "rgba(255,255,255,0.32)", off: "#FFFFFF", maybe: "rgba(255,255,255,0.62)", unknown: "rgba(255,255,255,0.16)",
  now: "#FFFFFF", edge: "#000000",
}
