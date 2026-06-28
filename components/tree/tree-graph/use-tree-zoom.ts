import { useCallback, useMemo, useRef } from "react"
import * as d3 from "d3"
import type { LayoutResult, Sizing } from "./types"
import { MARGIN } from "./constants"
import { personOffsetX } from "./tree-render"

interface Dims {
  width: number
  height: number
}

// Encapsulates all zoom/pan + focus state for the chart. The transform refs are
// preserved across structural rebuilds so the view doesn't jump, and reset when
// switching to a different chart.
export function useTreeZoom(chartId?: string) {
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const savedTransformRef = useRef<d3.ZoomTransform | null>(null)
  const initialTransformRef = useRef<d3.ZoomTransform | null>(null)
  // Target transform of the latest focus zoom — restored verbatim if a rebuild
  // interrupts the transition (e.g. StrictMode double-invoke in dev).
  const focusTransformRef = useRef<d3.ZoomTransform | null>(null)
  // Person we last auto-zoomed to, so we only zoom when focus changes to someone
  // new (not on every redraw).
  const lastFocusedRef = useRef<string | null>(null)
  const lastChartIdRef = useRef<string | null>(null)

  // Reset saved view when switching trees (runs during render — pure ref writes).
  if (chartId && chartId !== lastChartIdRef.current) {
    savedTransformRef.current = null
    initialTransformRef.current = null
    focusTransformRef.current = null
    lastFocusedRef.current = null
    lastChartIdRef.current = chartId
  }

  // Default "fit the whole tree" transform.
  const fitTransform = useCallback((bounds: LayoutResult["bounds"], dims: Dims, sizing: Sizing) => {
    const { width, height } = dims
    const dx = bounds.maxX - bounds.minX + sizing.baseNodeWidth + 100
    const dy = bounds.maxY - bounds.minY + sizing.nodeHeight + 100
    const scale = Math.min(
      (width - MARGIN.left - MARGIN.right) / dx,
      (height - MARGIN.top - MARGIN.bottom) / dy,
      0.8,
    )
    const centerX = (bounds.minX + bounds.maxX) / 2
    return d3.zoomIdentity
      .translate(width / 2, MARGIN.top + sizing.nodeHeight / 2)
      .scale(scale)
      .translate(-centerX, -bounds.minY)
  }, [])

  // Install the zoom behaviour on a freshly built SVG and restore the best
  // available transform (focus → saved → default fit).
  const attachAndRestore = useCallback(
    (
      svgEl: SVGSVGElement,
      g: d3.Selection<SVGGElement, unknown, null, undefined>,
      layout: LayoutResult,
      dims: Dims,
      sizing: Sizing,
      focusedPerson: string | null,
    ) => {
      const svg = d3.select(svgEl)
      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 3])
        .on("zoom", (event) => {
          g.attr("transform", event.transform)
          savedTransformRef.current = event.transform
        })
      zoomRef.current = zoom
      svg.call(zoom)

      if (!layout.nodes.length) return

      const fit = fitTransform(layout.bounds, dims, sizing)
      if (!initialTransformRef.current) initialTransformRef.current = fit

      let target: d3.ZoomTransform
      if (focusedPerson && lastFocusedRef.current === focusedPerson && focusTransformRef.current) {
        target = focusTransformRef.current
      } else if (savedTransformRef.current) {
        target = savedTransformRef.current
      } else {
        target = fit
      }
      savedTransformRef.current = target
      svg.call(zoom.transform, target)
    },
    [fitTransform],
  )

  // Animate to a person — only when focus changes to someone new.
  const focusOn = useCallback(
    (svgEl: SVGSVGElement, layout: LayoutResult, focusedPerson: string | null, dims: Dims, sizing: Sizing) => {
      const zoom = zoomRef.current
      if (!zoom) return

      if (!focusedPerson) {
        lastFocusedRef.current = null
        focusTransformRef.current = null
        return
      }
      if (focusedPerson === lastFocusedRef.current) return

      const node = layout.nodes.find(
        (n) => n.data.id === focusedPerson || n.data.spouses.some((s: any) => s.id === focusedPerson),
      )
      if (!node) return

      lastFocusedRef.current = focusedPerson
      const people = [node.data, ...node.data.spouses]
      const pIndex = people.findIndex((p: any) => p.id === focusedPerson)
      const pOffsetX =
        pIndex >= 0 ? personOffsetX(pIndex, sizing) + sizing.baseNodeWidth / 2 - node.blockWidth / 2 : 0

      const transform = d3.zoomIdentity
        .translate(dims.width / 2, dims.height / 2)
        .scale(1.2)
        .translate(-(node.x + pOffsetX), -node.y)

      d3.select(svgEl).transition().duration(750).call(zoom.transform, transform)
      savedTransformRef.current = transform
      focusTransformRef.current = transform
    },
    [],
  )

  const reset = useCallback((svgEl: SVGSVGElement) => {
    const zoom = zoomRef.current
    if (!zoom || !initialTransformRef.current) return
    d3.select(svgEl).transition().duration(750).call(zoom.transform, initialTransformRef.current)
    savedTransformRef.current = initialTransformRef.current
  }, [])

  // Stable handle so effects depending on it don't re-run (and rebuild the
  // tree) on every render — the inner callbacks are already memoised.
  return useMemo(() => ({ attachAndRestore, focusOn, reset }), [attachAndRestore, focusOn, reset])
}
