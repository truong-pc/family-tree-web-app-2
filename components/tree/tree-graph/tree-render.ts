import * as d3 from "d3"
import type { LayoutResult, Sizing, TreeNode } from "./types"
import { COLORS, FOCUS_RING, MARGIN, SPOUSE_GAP } from "./constants"

// Truncate long names from the front (keeps the given name / last word visible).
function truncateName(name: string, max: number): string {
  if (!name) return "Unknown"
  return name.length > max ? "..." + name.substring(name.length - (max - 3)) : name
}

// Horizontal offset of person `pIndex` within its family block.
export function personOffsetX(pIndex: number, sizing: Sizing): number {
  return pIndex * (sizing.baseNodeWidth + SPOUSE_GAP)
}

interface RenderHandlers {
  onNodeClick: (personId: string) => void
}

// ── Structure pass ───────────────────────────────────────────────────
// Builds the full SVG once per layout/size change. Geometry only — colours,
// names, photos and the focus ring are applied separately by applyAppearance so
// that cosmetic/focus changes never trigger a structural rebuild.
//
// Returns the inner <g> (the zoom/pan container) so the caller can attach zoom.
export function renderStructure(
  svgEl: SVGSVGElement,
  layout: LayoutResult,
  sizing: Sizing,
  handlers: RenderHandlers,
): d3.Selection<SVGGElement, unknown, null, undefined> {
  const svg = d3.select(svgEl)
  svg.selectAll("*").remove()

  const { nodeHeight, baseNodeWidth, avatarSize, avatarY, fontSize, badgeFontSize, nameY, badgeY } = sizing

  // defs: arrow marker, circular avatar clip, soft card shadow.
  const defs = svg.append("defs")

  defs
    .append("marker")
    .attr("id", "arrowhead")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 10)
    .attr("refY", 0)
    .attr("markerWidth", 5)
    .attr("markerHeight", 5)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("fill", "#000000")

  defs
    .append("clipPath")
    .attr("id", "avatar-clip")
    .attr("clipPathUnits", "objectBoundingBox")
    .append("circle")
    .attr("cx", 0.5)
    .attr("cy", 0.5)
    .attr("r", 0.5)

  const shadow = defs
    .append("filter")
    .attr("id", "card-shadow")
    .attr("x", "-20%")
    .attr("y", "-20%")
    .attr("width", "140%")
    .attr("height", "140%")
  shadow
    .append("feDropShadow")
    .attr("dx", 0)
    .attr("dy", 2)
    .attr("stdDeviation", 3)
    .attr("flood-color", "#0f172a")
    .attr("flood-opacity", 0.12)

  const g = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`)

  // Links (stepped parent → child paths).
  g.append("g")
    .selectAll("path")
    .data(layout.links)
    .enter()
    .append("path")
    .attr("stroke", "#000000")
    .attr("stroke-width", 1.5)
    .attr("fill", "none")
    .attr("marker-end", "url(#arrowhead)")
    .attr("d", (d: any) => {
      const sx = d.source.x
      const sy = d.source.y + nodeHeight / 2
      const tx = d.target.x
      const ty = d.target.y - nodeHeight / 2
      const midY = sy + (ty - sy) / 2
      return `M${sx},${sy} L${sx},${midY} L${tx},${midY} L${tx},${ty}`
    })

  // Node groups (one per family block).
  const nodeGroups = g
    .append("g")
    .selectAll("g")
    .data(layout.nodes)
    .enter()
    .append("g")
    .attr("transform", (d: TreeNode) => `translate(${d.x - d.blockWidth / 2}, ${d.y - nodeHeight / 2})`)

  // Faint block backdrop to visually group spouses.
  nodeGroups
    .append("rect")
    .attr("width", (d: TreeNode) => d.blockWidth)
    .attr("height", nodeHeight)
    .attr("rx", 16)
    .attr("ry", 16)
    .attr("fill", "#f8fafc")
    .attr("stroke", "#e2e8f0")
    .attr("stroke-width", 1)
    .style("pointer-events", "none")

  nodeGroups.each(function (d: TreeNode) {
    const group = d3.select(this)
    const people = [d.data, ...d.data.spouses]

    people.forEach((person: any, pIndex: number) => {
      const pX = personOffsetX(pIndex, sizing)

      // Person card — fill/stroke set later by applyAppearance.
      group
        .append("rect")
        .attr("x", pX)
        .attr("y", 0)
        .attr("width", baseNodeWidth)
        .attr("height", nodeHeight)
        .attr("rx", 14)
        .attr("ry", 14)
        .attr("data-id", person.id)
        .attr("class", "person-card")
        .attr("filter", "url(#card-shadow)")
        .style("cursor", "pointer")
        .on("click", (event: any) => {
          event.stopPropagation()
          handlers.onNodeClick(person.id)
        })

      // Avatar ring.
      group
        .append("circle")
        .attr("cx", pX + baseNodeWidth / 2)
        .attr("cy", avatarY + avatarSize / 2)
        .attr("r", avatarSize / 2 + 2)
        .attr("fill", "#fff")
        .attr("stroke", "#e5e7eb")
        .attr("stroke-width", 2)
        .style("pointer-events", "none")

      // Avatar image — href set later by applyAppearance.
      group
        .append("image")
        .attr("x", pX + baseNodeWidth / 2 - avatarSize / 2)
        .attr("y", avatarY)
        .attr("width", avatarSize)
        .attr("height", avatarSize)
        .attr("data-id", person.id)
        .attr("class", "person-avatar")
        .attr("clip-path", "url(#avatar-clip)")
        .attr("preserveAspectRatio", "xMidYMid slice")
        .style("pointer-events", "none")
        .on("error", function () {
          d3.select(this).attr("href", "/placeholder-user.jpg")
        })

      // Name — text set later by applyAppearance.
      group
        .append("text")
        .attr("x", pX + baseNodeWidth / 2)
        .attr("y", nameY)
        .attr("data-id", person.id)
        .attr("class", "person-name")
        .attr("font-size", fontSize)
        .attr("text-anchor", "middle")
        .attr("fill", "#1f2937")
        .style("font-weight", "600")
        .style("pointer-events", "none")

      // Level badge — text set later by applyAppearance.
      group
        .append("text")
        .attr("x", pX + baseNodeWidth / 2)
        .attr("y", badgeY)
        .attr("data-id", person.id)
        .attr("class", "person-level")
        .attr("font-size", badgeFontSize)
        .attr("text-anchor", "middle")
        .attr("fill", "#64748b")
        .style("pointer-events", "none")
    })
  })

  return g
}

interface AppearanceOptions {
  getPersonColor: (id: string) => string
  focusedPerson: string | null
  // id → display info, used to update text/photo in place.
  info: Map<string, { name: string; photoUrl: string | null; level: number | null }>
  sizing: Sizing
}

// ── Appearance pass (cheap, in-place) ────────────────────────────────
// Updates fill, focus ring, name text, level badge and avatar href on the
// existing DOM without rebuilding it. Called after a structural render and
// whenever colour/focus/name/photo changes.
export function applyAppearance(svgEl: SVGSVGElement, opts: AppearanceOptions): void {
  const svg = d3.select(svgEl)
  const { getPersonColor, focusedPerson, info, sizing } = opts

  svg.selectAll<SVGRectElement, unknown>(".person-card").each(function () {
    const el = d3.select(this)
    const id = el.attr("data-id")
    const focused = focusedPerson === id
    el.attr("fill", getPersonColor(id))
      .attr("stroke", focused ? FOCUS_RING : "#ffffff")
      .attr("stroke-width", focused ? 3.5 : 1.5)
  })

  svg.selectAll<SVGImageElement, unknown>(".person-avatar").each(function () {
    const el = d3.select(this)
    const id = el.attr("data-id")
    el.attr("href", info.get(id)?.photoUrl || "/placeholder-user.jpg")
  })

  svg.selectAll<SVGTextElement, unknown>(".person-name").each(function () {
    const el = d3.select(this)
    const id = el.attr("data-id")
    el.text(truncateName(info.get(id)?.name || "Unknown", sizing.maxNameLength))
  })

  svg.selectAll<SVGTextElement, unknown>(".person-level").each(function () {
    const el = d3.select(this)
    const id = el.attr("data-id")
    const lvl = info.get(id)?.level
    el.text(lvl != null ? `Đời ${lvl}` : "")
  })
}

// Legend colour swatches (re-used by the chart's footer legend in the view).
export const LEGEND = [
  { label: "Nam", color: COLORS.male },
  { label: "Nữ", color: COLORS.female },
  { label: "Chưa có quan hệ", color: COLORS.isolated },
]
