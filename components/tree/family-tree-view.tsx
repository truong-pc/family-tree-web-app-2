"use client"

import React, { useEffect, useRef, useCallback, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Search, Plus, X, Users, Download, RefreshCw, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import FamilyTreeChart, { type FamilyTreeChartHandle } from "./family-tree-graph"
import PersonSidebar from "@/components/sidebar/person-sidebar"
import AddPersonModal from "./add-person-modal"
import AddRelationshipModal from "./add-relationship-modal"
import DelRelationshipModal from "./del-relationship-modal"
import { useFamilyTreeStore } from "@/lib/stores/family-tree-store"
import type { Person } from "@/lib/stores/family-tree-store"

// Re-export types for backward compatibility
export type { Person, FamilyTreeData } from "@/lib/stores/family-tree-store"

interface FamilyTreeViewProps {
  chartId: string
  readOnly?: boolean
}

export default function FamilyTreeView({ chartId, readOnly = false }: FamilyTreeViewProps) {
  const {
    people,
    familyTreeData,
    searchTerm,
    searchResults,
    selectedPerson,
    sidebarOpen,
    focusedPerson,
    loading,
    error,
    levelFilter,
    showAddPersonModal,
    showAddRelationshipModal,
    showDelRelationshipModal,
    fetchData,
    handleSearch,
    clearSearch,
    selectPerson,
    openSidebar,
    closeSidebar,
    confirmDiscardChanges,
    toggleModal,
    setFocusedPerson,
    setLevelFilter,
    reset,
  } = useFamilyTreeStore()

  const sidebarRef = useRef<HTMLDivElement>(null)
  // Ref to the tree chart for triggering imperative actions (export, reset zoom)
  const chartRef = useRef<FamilyTreeChartHandle>(null)
  // Track image export so we can show a spinner and block double-clicks. The
  // export work lives in the chart; we own the UI state here next to the button.
  const [isExporting, setIsExporting] = useState(false)

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

  // Khi điều hướng từ nơi khác kèm ?focus=<personId> (vd: modal sự kiện), ta tự
  // zoom vào node người đó. Việc set focus được gắn vào lúc fetchData của LẦN MOUNT
  // này resolve (xem effect fetch bên dưới) — KHÔNG dựa vào people.length, vì store
  // là global nên lần vào thứ 2 nó vẫn còn data cũ -> effect sẽ bắn quá sớm rồi bị
  // reset() quét mất focus. Dùng ref để effect fetch đọc focusId mới nhất.
  const searchParams = useSearchParams()
  const router = useRouter()
  const focusId = searchParams.get("focus")
  const focusIdRef = useRef(focusId)
  focusIdRef.current = focusId

  // Handle click outside sidebar to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        // Check if click is on a tree node (SVG rect)
        const target = event.target as Element
        if (target.tagName === 'rect' || target.closest('svg')) {
          // Don't close sidebar when clicking on tree nodes
          return
        }

        // Check if any portal content is open or being clicked (DatePicker, Select, etc.)
        const isPortalOpen = 
          document.querySelector('[data-slot*="content"][data-state="open"]') ||
          document.querySelector('[role="menu"][data-state="open"]') ||
          document.querySelector('[role="dialog"][data-state="open"]')
        
        // Also check if the click target itself is inside a portal.
        // Lưu ý: chỉ khớp popper content của Radix (luôn có [data-state]),
        // tránh khớp nhầm "card-content" của shadcn Card (không có data-state),
        // nếu không click vào vùng trống trong Card sẽ bị coi là click trong portal.
        const isInsidePortal = target.closest('[data-radix-portal]') ||
                              target.closest('[data-slot*="content"][data-state]')
        
        if (isPortalOpen || isInsidePortal) {
          return
        }

        // Cảnh báo nếu đang sửa và có thay đổi chưa lưu.
        if (!confirmDiscardChanges()) return
        closeSidebar()
      }
    }

    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
  }, [sidebarOpen, closeSidebar, confirmDiscardChanges])

  // Handle node click event from the FamilyTreeChart
  const handleNodeClick = (personIdStr: string) => {
    const person = people.find((p) => String(p.personId) === personIdStr)
    if (person) {
      if (!confirmDiscardChanges()) return
      setFocusedPerson(null) // Bỏ highlight khi người dùng chuyển sang chọn node
      selectPerson(person) // Set the selected person in global store
      openSidebar() // Open the details sidebar
    }
  }

  // Click một kết quả tìm kiếm: zoom + highlight người đó, rồi xóa ô tìm kiếm
  // (giữ nguyên highlight). Nút X mới là chỗ tắt highlight.
  const handleSearchResultClick = (person: Person) => {
    setFocusedPerson(String(person.personId))
    handleSearch("")
  }

  // Get background color for person card based on relationships and gender
  const getPersonColor = useCallback((person: Person) => {
    const pidStr = String(person.personId)
    // Check if the person is connected to any other node
    const hasRelationships = familyTreeData.links.some(
      (link) => link.source === pidStr || link.target === pidStr
    )

    // Isolated nodes get a distinct yellow color, others are colored by gender
    if (!hasRelationships) return "#FEF3C7" // light yellow
    return person.gender === "M" ? "#DBEAFE" : person.gender === "F" ? "#FCE7F3" : "#E5E7EB" // blue, pink, or gray
  }, [familyTreeData.links])

  // Memoized color lookup by id string, passed to FamilyTreeChart
  const getPersonColorById = useCallback((idStr: string) => {
    const person = people.find((p) => String(p.personId) === idStr)
    return person ? getPersonColor(person) : "#F3F4F6"
  }, [people, getPersonColor])

  const lastFetchedRef = useRef<{ chartId: string; readOnly: boolean } | null>(null)

  // Fetch family tree data when component mounts or chartId changes
  useEffect(() => {
    const hasChanged = !lastFetchedRef.current || 
                       lastFetchedRef.current.chartId !== chartId || 
                       lastFetchedRef.current.readOnly !== readOnly

    if (hasChanged) {
      reset()
      lastFetchedRef.current = { chartId, readOnly }
      // Sau khi data MỚI của lần mount này tải xong mới zoom vào ?focus (nếu có)
      // rồi dọn param. Đặt ở đây để focus không bị reset() phía trên quét mất.
      fetchData(chartId, readOnly).then(() => {
        const fid = focusIdRef.current
        if (fid) {
          setFocusedPerson(fid)
          router.replace(`/dashboard/${chartId}/tree`, { scroll: false })
        }
      })
    }
  }, [chartId, readOnly, fetchData, reset, setFocusedPerson, router])

  const isInitialLoad = loading && people.length === 0

  if (isInitialLoad) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải sơ đồ...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <Users className="h-16 w-16 mx-auto mb-4" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Lỗi kết nối</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => fetchData(chartId, readOnly)}>Thử lại</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toolbar */}
      {!readOnly && (
        <div className="bg-gray-100 border-b">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center py-3 sm:py-4 space-y-3 sm:space-y-0">
              <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
                <Button onClick={() => toggleModal("addPerson", true)} className="flex-1 sm:flex-none">
                  <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Thêm người</span>
                  <span className="sm:hidden">Thêm</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => toggleModal("addRelationship", true)}
                  className="flex-1 sm:flex-none"
                >
                  <span className="hidden sm:inline">Thêm quan hệ</span>
                  <span className="sm:hidden">Quan hệ</span>
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => toggleModal("delRelationship", true)}
                  className="flex-1 sm:flex-none"
                >
                  <span className="hidden sm:inline">Xóa quan hệ</span>
                  <span className="sm:hidden">Xóa</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Main Content */}
        <div className="flex-1">
          <div className="max-w-7xl mx-auto px-1 sm:px-4 lg:px-8 py-2 sm:py-8">
            {/* Family Tree Visualization */}
            <Card className="mb-2 sm:mb-8 gap-2">
              <CardHeader className="pb-1 sm:pb-3 px-2 sm:px-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CardTitle className=" bg-gradient-to-r from-blue-700 to-amber-600 bg-clip-text text-lg font-bold text-transparent dark:from-blue-400 dark:to-amber-300 sm:text-xl ">Sơ đồ phả hệ</CardTitle>
                    {loading && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleExportImage}
                      disabled={isExporting}
                      className="text-gray-500 hover:text-gray-700"
                      title={isExporting ? "Đang tạo ảnh..." : "Tải ảnh gia phả"}
                    >
                      {isExporting ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Download className="h-5 w-5" />
                      )}
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
                {/* Search Bar for Tree Visualization */}
                <div className="relative w-full sm:w-96">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Tìm kiếm để zoom đến người đó"
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10 pr-10 w-full"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSearch}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-200"
                    >
                      <X className="h-4 w-4 text-gray-400" />
                    </Button>
                  )}
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border rounded-md shadow-lg z-10 mt-1 max-h-64 overflow-y-auto">
                      {searchResults.map((person) => (
                        <div
                          key={person.personId}
                          className="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 flex items-center"
                          onClick={() => handleSearchResultClick(person)}
                        >
                          <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 bg-gray-100 mr-3 flex-shrink-0">
                            <Image
                              src={person.photoUrl || "/placeholder-user.jpg"}
                              alt={person.name || "Avatar"}
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{person.name}</div>
                            <div className="text-sm text-gray-500 flex justify-between">
                              <span>{person.gender === "M" ? "Nam" : person.gender === "F" ? "Nữ" : "Khác"}</span>
                              <span className="text-gray-400">Đời {person.level}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-1 px-1 pb-1 sm:pt-2 sm:px-6 sm:pb-6">
                <FamilyTreeChart
                  ref={chartRef}
                  data={familyTreeData}
                  onNodeClick={handleNodeClick}
                  focusedPerson={focusedPerson}
                  getPersonColor={getPersonColorById}
                  onBackgroundClick={() => setFocusedPerson(null)}
                  chartId={chartId}
                />
              </CardContent>
            </Card>

            {/* People List */}
            <Card>
              <CardHeader className="pb-2 sm:pb-6 px-2 sm:px-6">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg sm:text-xl">
                      <span className="bg-gradient-to-r from-blue-700 to-amber-600 bg-clip-text text-transparent font-bold dark:from-blue-400 dark:to-amber-300">
                        Thành viên gia đình
                      </span>{" "}
                      <span className="text-sm text-gray-900 dark:text-gray-100">({people.length})</span>
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600">Số đời:</label>
                      <div className="relative">
                        <Input
                          type="text"
                          placeholder="Nhập số đời"
                          value={levelFilter}
                          onChange={(e) => setLevelFilter(e.target.value)}
                          className="w-32 h-9 pr-8"
                        />
                        {levelFilter && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLevelFilter("")}
                            className="absolute right-0 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                          >
                            <X className="h-4 w-4 text-gray-400" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-2 sm:p-6">
                {/* Group members by generation level, one row per level */}
                <div className="space-y-4 sm:space-y-6">
                  {Object.entries(
                    [...people]
                      .filter((person) => {
                        if (!levelFilter) return true
                        const filterLevel = parseInt(levelFilter)
                        return person.level === filterLevel
                      })
                      .reduce((groups, person) => {
                        const lvl = person.level ?? 0
                        ;(groups[lvl] ||= []).push(person)
                        return groups
                      }, {} as Record<number, Person[]>)
                  )
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([level, members]) => (
                      <div key={level}>
                        {/* Level header */}
                        <div className="flex items-center mb-2 sm:mb-3">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs sm:text-sm font-semibold">
                            Đời {level}
                          </span>
                          <span className="ml-2 text-xs sm:text-sm text-gray-400">
                            {members.length} thành viên
                          </span>
                          <div className="flex-1 ml-3 border-t border-gray-200" />
                        </div>
                        {/* Members in this level wrap to new lines when overflowing / on small screens */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3">
                          {members.map((person) => (
                            <div
                              key={person.personId}
                              className="p-3 sm:p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow flex"
                              style={{ backgroundColor: getPersonColor(person) }}
                              onClick={() => {
                                if (!confirmDiscardChanges()) return
                                selectPerson(person)
                                openSidebar()
                              }}
                            >
                              {/* Avatar - 3/10 width */}
                              <div className="w-3/10 flex-shrink-0 mr-1 sm:mr-2">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-white bg-gray-200">
                                  <Image
                                    src={person.photoUrl || "/placeholder-user.jpg"}
                                    alt={person.name || "Avatar"}
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              </div>
                              {/* Info - 7/10 width */}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm sm:text-base truncate" style={{ direction: 'rtl', textAlign: 'left' }}>{person.name}</div>
                                <div className="text-xs sm:text-sm text-gray-600 flex justify-between">
                                  <span>{person.gender === "M" ? "Nam" : person.gender === "F" ? "Nữ" : "Khác"}</span>
                                  <span className="text-gray-500">Đời {person.level}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>

                {/* Empty state */}
                {people.filter((person) => {
                  if (!levelFilter ) return true
                  const filterLevel = parseInt(levelFilter)
                  return person.level === filterLevel
                }).length === 0 && (
                  <div className="text-center py-8 sm:py-12">
                    <Users className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {levelFilter ? `Không có thành viên ở đời ${levelFilter}` : "Chưa có thành viên nào"}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {levelFilter ? "Thử nhập số đời khác hoặc xóa bộ lọc." : "Bắt đầu xây dựng cây phả hệ bằng cách thêm người đầu tiên."}
                    </p>
                    {!readOnly && !levelFilter && (
                      <Button onClick={() => toggleModal("addPerson", true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Thêm người đầu tiên
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Person Details Sidebar */}
        {!readOnly && (
          <div ref={sidebarRef}>
            <PersonSidebar
              chartId={chartId}
            />
          </div>
        )}
      </div>

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
