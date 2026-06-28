"use client"

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react"
import * as d3 from "d3"
import { computeTreeLayout, structuralSignature } from "./tree-layout"
import { applyAppearance, LEGEND, renderStructure } from "./tree-render"
import { exportTreeToPng } from "./tree-export"
import { useTreeZoom } from "./use-tree-zoom"
import { getSizing } from "./constants"
import type { FamilyTreeChartHandle, FamilyTreeData } from "./types"

export type { FamilyTreeChartHandle } from "./types"

interface Props {
  data: FamilyTreeData
  onNodeClick: (personId: string) => void
  focusedPerson: string | null
  getPersonColor: (id: string) => string
  chartId?: string
  // Click on empty canvas → clear highlight/focus.
  onBackgroundClick?: () => void
}

const FamilyTreeChart = forwardRef<FamilyTreeChartHandle, Props>(function FamilyTreeChart(
  { data, onNodeClick, focusedPerson, getPersonColor, chartId, onBackgroundClick },
  ref,
) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const zoom = useTreeZoom(chartId)

  // Latest props read by effects that must NOT re-run on these changes.
  const onNodeClickRef = useRef(onNodeClick)
  const onBackgroundClickRef = useRef(onBackgroundClick)
  const focusedRef = useRef(focusedPerson)
  const getColorRef = useRef(getPersonColor)
  onNodeClickRef.current = onNodeClick
  onBackgroundClickRef.current = onBackgroundClick
  focusedRef.current = focusedPerson
  getColorRef.current = getPersonColor

  // ── Responsive dimensions (ResizeObserver also handles tab show/hide) ──
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => {
      const w = el.offsetWidth
      if (w === 0) return // hidden tab — keep last known size
      const isPortrait = window.innerHeight > window.innerWidth
      const height = isPortrait ? 360 : Math.round(window.innerHeight * 0.7)
      const width = Math.max(300, w - 20)
      setDimensions((d) => (d.width === width && d.height === height ? d : { width, height }))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener("resize", update)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", update)
    }
  }, [])

  const sizing = useMemo(() => getSizing(dimensions.width), [dimensions.width])

  // Layout recomputes only on structural change (ids/links) or sizing change —
  // cosmetic edits (name/photo/color) keep the same memoised layout.
  const structuralKey = useMemo(() => structuralSignature(data), [data])
  const layout = useMemo(
    () => computeTreeLayout(data, sizing),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [structuralKey, sizing],
  )

  // id → display info for the in-place appearance pass.
  const info = useMemo(() => {
    const m = new Map<string, { name: string; photoUrl: string | null; level: number | null }>()
    data.nodes.forEach((n: any) => m.set(n.id, { name: n.name, photoUrl: n.photoUrl ?? null, level: n.level ?? null }))
    return m
  }, [data])
  const infoRef = useRef(info)
  infoRef.current = info

  // ── Layer 1: structure (rebuilds only on layout/size change) ──────────
  useEffect(() => {
    const svgEl = svgRef.current
    if (!svgEl) return
    const svg = d3.select(svgEl)
    svg.attr("width", dimensions.width).attr("height", dimensions.height)

    if (!layout.nodes.length) {
      svg.selectAll("*").remove()
      return
    }

    const g = renderStructure(svgEl, layout, sizing, {
      onNodeClick: (id) => onNodeClickRef.current(id),
    })
    svg.on("click", () => {
      if (focusedRef.current) onBackgroundClickRef.current?.()
    })

    zoom.attachAndRestore(svgEl, g, layout, dimensions, sizing, focusedRef.current)

    // Paint appearance immediately so a structural rebuild isn't blank when
    // colour/focus haven't changed (the appearance effect wouldn't re-run).
    applyAppearance(svgEl, {
      getPersonColor: getColorRef.current,
      focusedPerson: focusedRef.current,
      info: infoRef.current,
      sizing,
    })
  }, [layout, dimensions, sizing, zoom])

  // ── Layer 2: appearance (cheap, in-place) ─────────────────────────────
  useEffect(() => {
    const svgEl = svgRef.current
    if (!svgEl || !layout.nodes.length) return
    applyAppearance(svgEl, { getPersonColor, focusedPerson, info, sizing })
  }, [getPersonColor, focusedPerson, info, sizing, layout])

  // ── Layer 3: focus zoom (animates only when focus changes) ────────────
  useEffect(() => {
    const svgEl = svgRef.current
    if (!svgEl || !layout.nodes.length) return
    zoom.focusOn(svgEl, layout, focusedPerson, dimensions, sizing)
  }, [focusedPerson, layout, dimensions, sizing, zoom])

  // ── Imperative actions for toolbar buttons ────────────────────────────
  const isExportingRef = useRef(false)
  const handleExport = useCallback(async () => {
    if (!svgRef.current || isExportingRef.current) return
    isExportingRef.current = true
    try {
      await exportTreeToPng(svgRef.current)
    } finally {
      isExportingRef.current = false
    }
  }, [])
  const handleReset = useCallback(() => {
    if (svgRef.current) zoom.reset(svgRef.current)
  }, [zoom])

  useImperativeHandle(ref, () => ({ exportImage: handleExport, resetZoom: handleReset }), [handleExport, handleReset])

  return (
    <div ref={containerRef} className="w-full overflow-hidden">
      <svg ref={svgRef} className="w-full rounded-xl bg-white/40" />
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-600 sm:text-sm">
        {LEGEND.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded" style={{ backgroundColor: item.color }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
})

export default FamilyTreeChart
