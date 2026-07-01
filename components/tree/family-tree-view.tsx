"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Download, Loader2, Network, Plus, RefreshCw, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import FamilyTreeChart, { type FamilyTreeChartHandle } from "./tree-graph/family-tree-graph"
import TreeSearchBox from "./tree-graph/tree-search-box"
import PeopleList from "./people-list/people-list"
import PersonSidebar from "@/components/sidebar/person-sidebar"
import AddPersonModal from "./add-person-modal"
import AddRelationshipModal from "./add-relationship-modal"
import DelRelationshipModal from "./del-relationship-modal"
import { useFamilyTreeStore } from "@/lib/stores/family-tree-store"
import { useTreeRealtime } from "@/hooks/useTreeRealtime"
import { getPersonColor } from "./person-color"

// Re-export types for backward compatibility.
export type { Person, FamilyTreeData } from "@/lib/stores/family-tree-store"

interface FamilyTreeViewProps {
  chartId: string
  readOnly?: boolean
}

export default function FamilyTreeView({ chartId, readOnly = false }: FamilyTreeViewProps) {
  const {
    people,
    familyTreeData,
    sidebarOpen,
    focusedPerson,
    loading,
    error,
    fetchData,
    selectPerson,
    openSidebar,
    closeSidebar,
    confirmDiscardChanges,
    setFocusedPerson,
    toggleModal,
    reset,
  } = useFamilyTreeStore()

  // Realtime: đồng bộ cây khi owner/editor khác thay đổi. Chỉ bật ở chế độ editor
  // (trang published/read-only không mở WebSocket).
  useTreeRealtime(chartId, !readOnly)

  const sidebarRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<FamilyTreeChartHandle>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [activeTab, setActiveTab] = useState<"graph" | "list">("graph")

  const handleExportImage = useCallback(async () => {
    if (isExporting) return
    setIsExporting(true)
    try {
      await chartRef.current?.exportImage()
    } catch (err) {
      console.error("Export image failed:", err)
    } finally {
      setIsExporting(false)
    }
  }, [isExporting])

  // Colour lookup by id string, passed to the chart.
  const getPersonColorById = useCallback(
    (idStr: string) => {
      const person = people.find((p) => String(p.personId) === idStr)
      return person ? getPersonColor(person, familyTreeData.links) : "#F3F4F6"
    },
    [people, familyTreeData.links],
  )

  // Node click → open the (existing) sidebar for that person.
  const handleNodeClick = useCallback(
    (idStr: string) => {
      const person = people.find((p) => String(p.personId) === idStr)
      if (!person) return
      if (!confirmDiscardChanges()) return
      setFocusedPerson(null) // drop highlight when selecting a node
      selectPerson(person)
      openSidebar()
    },
    [people, confirmDiscardChanges, setFocusedPerson, selectPerson, openSidebar],
  )

  // ── Close sidebar on outside click (guards portals / tree nodes) ──────
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!sidebarOpen || !sidebarRef.current || sidebarRef.current.contains(event.target as Node)) return
      const target = event.target as Element

      // Don't close when clicking a person card — either a tree node (SVG rect
      // .person-card) or a people-list card ([data-person-card]) — since that's
      // a select/switch. Clicking empty canvas / list space still closes.
      if (target.closest(".person-card, [data-person-card]")) return

      // Don't close when interacting with Radix popper content (DatePicker, Select…).
      const isPortalOpen =
        document.querySelector('[data-slot*="content"][data-state="open"]') ||
        document.querySelector('[role="menu"][data-state="open"]') ||
        document.querySelector('[role="dialog"][data-state="open"]')
      // Only treat OPEN Radix poppers (Select/Popover/DatePicker → data-state
      // "open") as portals. NOT tabs-content, which also has data-slot*="content"
      // but data-state="active"/"inactive" — matching it kept the sidebar from
      // closing on clicks inside the people-list tab.
      const isInsidePortal =
        target.closest("[data-radix-portal]") || target.closest('[data-slot*="content"][data-state="open"]')
      if (isPortalOpen || isInsidePortal) return

      if (!confirmDiscardChanges()) return
      closeSidebar()
    }
    document.addEventListener("pointerdown", handleClickOutside)
    return () => document.removeEventListener("pointerdown", handleClickOutside)
  }, [sidebarOpen, closeSidebar, confirmDiscardChanges])

  // ── Fetch + handle ?focus=<id> (from the events page redirect) ────────
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const focusIdRef = useRef<string | null>(null)
  focusIdRef.current = searchParams.get("focus")
  const lastFetchedRef = useRef<{ chartId: string; readOnly: boolean } | null>(null)

  useEffect(() => {
    const changed =
      !lastFetchedRef.current ||
      lastFetchedRef.current.chartId !== chartId ||
      lastFetchedRef.current.readOnly !== readOnly
    if (!changed) return

    reset()
    lastFetchedRef.current = { chartId, readOnly }
    // Apply ?focus only after THIS mount's data resolves, so reset() above
    // doesn't wipe it; then strip the param from the URL.
    fetchData(chartId, readOnly).then(() => {
      const fid = focusIdRef.current
      if (fid) {
        setFocusedPerson(fid)
        setActiveTab("graph")
        router.replace(pathname, { scroll: false })
      }
    })
  }, [chartId, readOnly, fetchData, reset, setFocusedPerson, router, pathname])

  const isInitialLoad = loading && people.length === 0

  if (isInitialLoad) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-gray-600">Đang tải sơ đồ...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md text-center">
          <Users className="mx-auto mb-4 h-16 w-16 text-red-500" />
          <h2 className="mb-2 text-xl font-bold text-gray-900">Lỗi kết nối</h2>
          <p className="mb-4 text-gray-600">{error}</p>
          <Button onClick={() => fetchData(chartId, readOnly)}>Thử lại</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-transparent via-blue-50/40 to-amber-50/40 dark:via-blue-950/10 dark:to-amber-950/10">
      {/* Decorative gradient blobs */}
      <div className="pointer-events-none absolute -left-24 -top-24 -z-10 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl dark:bg-blue-600/10" />
      <div className="pointer-events-none absolute -right-24 top-40 -z-10 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl dark:bg-amber-600/10" />

      <div className="mx-auto max-w-7xl px-2 py-4 sm:px-4 sm:py-6 lg:px-8">
        {/* Action toolbar (editing only) */}
        {!readOnly && (
          <div className="mb-4 flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <Button onClick={() => toggleModal("addPerson", true)}>
              <Plus className="mr-1 h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Thêm người</span>
              <span className="sm:hidden">Thêm</span>
            </Button>
            <Button variant="outline" onClick={() => toggleModal("addRelationship", true)}>
              <span className="hidden sm:inline">Thêm quan hệ</span>
              <span className="sm:hidden">Quan hệ</span>
            </Button>
            <Button variant="destructive" onClick={() => toggleModal("delRelationship", true)}>
              <span className="hidden sm:inline">Xóa quan hệ</span>
              <span className="sm:hidden">Xóa</span>
            </Button>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "graph" | "list")}>
          <TabsList className="mb-4 bg-white/60 backdrop-blur-md dark:bg-black/30">
            <TabsTrigger value="graph">
              <Network className="mr-1.5 h-4 w-4" />
              Sơ đồ phả hệ
            </TabsTrigger>
            <TabsTrigger value="list">
              <Users className="mr-1.5 h-4 w-4" />
              Danh sách ({people.length})
            </TabsTrigger>
          </TabsList>

          {/* Graph — kept mounted (forceMount) so switching tabs never rebuilds it */}
          <TabsContent value="graph" forceMount className="mt-0 data-[state=inactive]:hidden">
            <div className="rounded-2xl border border-white/50 bg-white/60 p-3 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-black/30 sm:p-5">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="bg-gradient-to-r from-blue-700 to-amber-600 bg-clip-text text-lg font-bold text-transparent dark:from-blue-400 dark:to-amber-300 sm:text-xl">
                    Sơ đồ phả hệ
                  </h2>
                  {loading && <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600" />}
                </div>
                <div className="flex items-center gap-2">
                  <TreeSearchBox />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExportImage}
                    disabled={isExporting}
                    className="text-gray-500 hover:text-gray-700"
                    title={isExporting ? "Đang tạo ảnh..." : "Tải ảnh gia phả"}
                  >
                    {isExporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => chartRef.current?.resetZoom()}
                    className="text-gray-500 hover:text-gray-700"
                    title="Reset zoom"
                  >
                    <RefreshCw className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <FamilyTreeChart
                ref={chartRef}
                data={familyTreeData}
                onNodeClick={handleNodeClick}
                focusedPerson={focusedPerson}
                getPersonColor={getPersonColorById}
                onBackgroundClick={() => setFocusedPerson(null)}
                chartId={chartId}
              />
            </div>
          </TabsContent>

          {/* People list */}
          <TabsContent value="list" className="mt-0">
            <PeopleList readOnly={readOnly} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Sidebar (existing implementation, unchanged) */}
      {!readOnly && (
        <div ref={sidebarRef}>
          <PersonSidebar chartId={chartId} />
        </div>
      )}

      {/* Modals */}
      {!readOnly && (
        <>
          <AddPersonModal chartId={chartId} />
          <AddRelationshipModal chartId={chartId} />
          <DelRelationshipModal chartId={chartId} />
        </>
      )}
    </div>
  )
}
