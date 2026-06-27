import type { Sizing } from "./types"

// Card fill colours by relationship/gender. Kept identical to the previous
// implementation so the legend and people-list stay consistent.
export const COLORS = {
  male: "#DBEAFE", // blue
  female: "#FCE7F3", // pink
  other: "#E5E7EB", // gray
  isolated: "#FEF3C7", // amber — no relationships yet
  fallback: "#F3F4F6",
} as const

// Highlight colour for the focused person's card ring.
export const FOCUS_RING = "#f59e0b"

export const MARGIN = { top: 40, right: 40, bottom: 40, left: 40 }

// Derive all responsive geometry from the current chart width. Centralised here
// so the layout maths and the renderer agree on a single source of truth.
export function getSizing(width: number): Sizing {
  const isSm = width < 768
  const isMd = width < 1024
  const avatarSize = isMd ? 34 : 42
  const avatarY = isSm ? 10 : 12
  const nameY = avatarY + avatarSize + (isSm ? 16 : 20)
  return {
    baseNodeWidth: isMd ? 124 : 134,
    nodeHeight: isSm ? 92 : 104,
    avatarSize,
    minNodeSpacing: isSm ? 16 : 22,
    levelHeight: isSm ? 120 : 150,
    avatarY,
    fontSize: isSm ? "11px" : "12.5px",
    badgeFontSize: isSm ? "9px" : "10px",
    maxNameLength: isSm ? 14 : 18,
    nameY,
    badgeY: nameY + (isSm ? 15 : 17),
  }
}

// Spacing between a primary node and each merged spouse, in px.
export const SPOUSE_GAP = 10
