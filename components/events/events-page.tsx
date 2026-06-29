"use client"

/**
 * events-page.tsx
 * Trang chính hiển thị danh sách sự kiện gia phả.
 * - Fetch dữ liệu lịch hôm nay + danh sách sự kiện + upcoming events
 * - Filter, sort, tìm kiếm sự kiện
 * - Quản lý CRUD: tạo, sửa, xóa (confirm), xem chi tiết
 * - Toast thông báo qua shadcn useToast (thay vì custom toast)
 * - Xóa dùng window.confirm() (thay vì DeleteModal)
 */

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { useAuthStore } from "@/lib/stores/auth-store"
import { useToast } from "@/hooks/use-toast"
import * as eventsApi from "@/lib/api/events"
import type { FamilyEvent, UpcomingEvent, CalendarToday } from "@/lib/api/events"

// Component con trong cùng thư mục
import LunarCalendarBanner from "./lunar-calendar-banner"
import UpcomingCard from "./upcoming-card"
import EventRow from "./event-row"
import EventGridCard from "./event-grid-card"
import ViewEventModal from "./view-event-modal"
import EventEditorModal, { type EventForm } from "./event-editor-modal"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ITEMS_PER_PAGE = 20

export default function EventsPageContent({ chartId }: { chartId: string }) {
  const { token } = useAuthStore()
  const { toast } = useToast()

  // --- State ---
  const [calendarData, setCalendarData] = useState<CalendarToday | null>(null)
  const [events, setEvents] = useState<FamilyEvent[]>([])
  const [upcoming, setUpcoming] = useState<UpcomingEvent[]>([])
  const [calendarLoading, setCalendarLoading] = useState(true)
  const [eventsLoading, setEventsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Bộ lọc & giao diện
  const [filterType, setFilterType] = useState<"all" | "birthday" | "death" | "custom">("all")
  const [query, setQuery] = useState("")
  const [sortBy, setSortBy] = useState<"date-asc" | "date-desc" | "title" | "type">("date-asc")
  const [view, setView] = useState<"list" | "grid">("list")
  const [upcomingDays, setUpcomingDays] = useState<7 | 30 | 90>(7)

  // Client-side infinite scroll
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Modal state — chỉ viewing + editing + creating (bỏ deleting)
  const [viewing, setViewing] = useState<FamilyEvent | null>(null)
  const [editing, setEditing] = useState<FamilyEvent | null>(null)
  const [creating, setCreating] = useState(false)

  // --- Fetch dữ liệu ---

  /** Lấy dữ liệu lịch âm dương hôm nay (không cần auth) */
  useEffect(() => {
    eventsApi.getCalendarToday()
      .then(setCalendarData)
      .catch((err) => console.error("Failed to fetch calendar today:", err))
      .finally(() => setCalendarLoading(false))
  }, [])

  /** Fetch danh sách events + upcoming events */
  const fetchEventsData = useCallback(() => {
    if (!token || !chartId) {
      setEventsLoading(false)
      setError("Không tìm thấy thông tin đăng nhập hoặc gia phả.")
      return
    }

    setEventsLoading(true)
    setError(null)

    Promise.all([
      eventsApi.getEvents(token, chartId),
      eventsApi.getUpcomingEvents(token, chartId, upcomingDays)
    ])
      .then(([evs, upcomingEvs]) => {
        setEvents(evs || [])
        setUpcoming(upcomingEvs || [])
        setError(null)
      })
      .catch((err: any) => {
        console.error("Failed to load events data:", err)
        const detail = err.response?.data?.detail
        const errorMessage =
          err.response?.data?.message ||
          (Array.isArray(detail) ? detail.map((d: any) => d.msg).join("; ") : detail) ||
          "Không thể tải danh sách sự kiện từ máy chủ."
        setError(errorMessage)
        toast({
          variant: "destructive",
          title: "Lỗi tải dữ liệu",
          description: errorMessage,
        })
      })
      .finally(() => setEventsLoading(false))
  }, [token, chartId, upcomingDays, toast])

  useEffect(() => {
    fetchEventsData()
  }, [fetchEventsData])

  // --- Thống kê & Filter ---

  /** Đếm số lượng sự kiện theo từng loại */
  const counts = useMemo(() => ({
    total: events.length,
    birthday: events.filter((e) => e.type === "birthday").length,
    death: events.filter((e) => e.type === "death").length,
    custom: events.filter((e) => e.type === "custom").length,
  }), [events])

  /** Lọc + sắp xếp danh sách sự kiện theo filter hiện tại */
  const filtered = useMemo(() => {
    let list = [...events]
    // Lọc theo loại
    if (filterType !== "all") list = list.filter((e) => e.type === filterType)
    // Tìm kiếm theo text
    const q = query.trim().toLowerCase()
    if (q) list = list.filter((e) =>
      e.title.toLowerCase().includes(q) ||
      (e.description || "").toLowerCase().includes(q) ||
      (e.branch || "").toLowerCase().includes(q)
    )
    // Sắp xếp
    if (sortBy === "date-asc") list.sort((a, b) => a.month * 100 + a.day - (b.month * 100 + b.day))
    if (sortBy === "date-desc") list.sort((a, b) => b.month * 100 + b.day - (a.month * 100 + a.day))
    if (sortBy === "title") list.sort((a, b) => a.title.localeCompare(b.title, "vi"))
    if (sortBy === "type") list.sort((a, b) => a.type.localeCompare(b.type))
    return list
  }, [events, filterType, query, sortBy])

  // Reset số lượng hiển thị khi bộ lọc thay đổi
  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE)
  }, [filterType, query, sortBy])

  // Phần hiển thị: chỉ lấy displayCount phần tử đầu tiên
  const displayedEvents = useMemo(() => filtered.slice(0, displayCount), [filtered, displayCount])
  const hasMore = displayCount < filtered.length

  // IntersectionObserver: khi sentinel xuất hiện → tải thêm
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setDisplayCount((prev) => Math.min(prev + ITEMS_PER_PAGE, filtered.length))
        }
      },
      { rootMargin: "200px" }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [filtered.length])

  // --- Handlers CRUD ---

  const handleViewEvent = useCallback((ev: FamilyEvent) => {
    setViewing(ev)
  }, [])

  /** Tạo sự kiện mới */
  const handleCreate = useCallback(async (form: EventForm) => {
    try {
      if (!token || !chartId) return
      await eventsApi.createEvent(token, chartId, form)
      setCreating(false)
      toast({ title: "Đã tạo sự kiện", description: form.title })
      // Response của createEvent thiếu sourceId/type → fetch lại danh sách
      // để lấy dữ liệu chuẩn từ server (tránh crash & nhận diện sai loại).
      // Refetch cả upcoming nếu event mới nằm trong khoảng.
      Promise.all([
        eventsApi.getEvents(token, chartId),
        eventsApi.getUpcomingEvents(token, chartId, upcomingDays),
      ])
        .then(([evs, upcomingEvs]) => {
          setEvents(evs || [])
          setUpcoming(upcomingEvs || [])
        })
        .catch(() => { })
    } catch (err: any) {
      console.error("Create event error:", err)
      const detail = err.response?.data?.detail
      const errorMessage =
        err.response?.data?.message ||
        (Array.isArray(detail) ? detail.map((d: any) => d.msg).join("; ") : detail) ||
        "Lỗi kết nối hoặc dữ liệu không hợp lệ."
      toast({ variant: "destructive", title: "Tạo sự kiện thất bại", description: errorMessage })
    }
  }, [token, chartId, upcomingDays, toast])

  /** Cập nhật sự kiện đang sửa */
  const handleUpdate = useCallback(async (form: EventForm) => {
    if (!editing) return
    try {
      if (!token || !chartId) return
      const updated = await eventsApi.updateEvent(token, chartId, editing.sourceId, form)
      // Giữ field gốc (sourceId, personId, branch…) + cập nhật từ API + hardcode type
      const merged = { ...editing, ...updated, type: "custom" as const }
      setEvents((es) => es.map((e) => e.sourceId === editing.sourceId ? merged : e))
      setEditing(null)
      toast({ title: "Đã lưu thay đổi", description: form.title })
      // Refetch upcoming
      eventsApi.getUpcomingEvents(token, chartId, upcomingDays)
        .then(setUpcoming)
        .catch(() => { })
    } catch (err: any) {
      console.error("Update event error:", err)
      const detail = err.response?.data?.detail
      const errorMessage =
        err.response?.data?.message ||
        (Array.isArray(detail) ? detail.map((d: any) => d.msg).join("; ") : detail) ||
        "Không thể cập nhật thông tin sự kiện."
      toast({ variant: "destructive", title: "Cập nhật thất bại", description: errorMessage })
    }
  }, [editing, token, chartId, upcomingDays, toast])

  /**
   * Xóa sự kiện — dùng window.confirm() thay vì DeleteModal.
   * Nhận trực tiếp event cần xóa (không cần state `deleting`).
   */
  const handleDelete = useCallback(async (ev: FamilyEvent) => {
    const confirmed = window.confirm(`Bạn có chắc muốn xóa sự kiện "${ev.title}"? Hành động này không thể hoàn tác.`)
    if (!confirmed) return

    try {
      if (!token || !chartId) return
      await eventsApi.deleteEvent(token, chartId, ev.sourceId)
      setEvents((es) => es.filter((e) => e.sourceId !== ev.sourceId))
      setUpcoming((es) => es.filter((e) => e.sourceId !== ev.sourceId))
      setViewing(null) // Đóng modal xem nếu đang mở
      toast({ variant: "destructive", title: "Đã xóa sự kiện", description: ev.title })
    } catch (err: any) {
      console.error("Delete event error:", err)
      const detail = err.response?.data?.detail
      const errorMessage =
        err.response?.data?.message ||
        (Array.isArray(detail) ? detail.map((d: any) => d.msg).join("; ") : detail) ||
        "Không thể xóa sự kiện này."
      toast({ variant: "destructive", title: "Xóa thất bại", description: errorMessage })
    }
  }, [token, chartId, toast])

  // --- Tab filters ---
  const tabs = [
    { id: "all" as const, label: "Tất cả", count: counts.total },
    { id: "birthday" as const, label: "Sinh nhật", count: counts.birthday },
    { id: "death" as const, label: "Giỗ", count: counts.death },
    { id: "custom" as const, label: "Tự tạo", count: counts.custom },
  ]

  // --- Render ---
  return (
    <div className="relative min-h-screen pb-16 overflow-x-hidden" style={{ background: "radial-gradient(1200px 700px at -10% -10%, rgba(59,130,246,.08), transparent 60%), radial-gradient(900px 600px at 110% 10%, rgba(245,158,11,.08), transparent 60%), linear-gradient(180deg, #fbfdff 0%, #fff8ef 100%)" }}>
      {/* Background blobs trang trí */}
      <div className="absolute w-[520px] h-[520px] rounded-full pointer-events-none -z-10" style={{ background: "rgba(59,130,246,.30)", filter: "blur(60px)", top: -180, left: -160 }} />
      <div className="absolute w-[440px] h-[440px] rounded-full pointer-events-none -z-10" style={{ background: "rgba(245,158,11,.30)", filter: "blur(60px)", top: 200, right: -160 }} />

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10">

        {/* ====== Lunar Calendar Banner ====== */}
        {calendarLoading ? (
          <div className="rounded-3xl h-48 animate-pulse bg-teal-900/20" />
        ) : calendarData ? (
          <LunarCalendarBanner data={calendarData} />
        ) : (
          <div className="rounded-3xl p-6 text-center text-slate-500 text-sm bg-slate-50 border border-slate-100">
            Không thể tải dữ liệu lịch âm dương hôm nay.
          </div>
        )}

        {/* ====== Page Title + Nút tạo mới ====== */}
        <div className="flex items-end justify-between flex-wrap gap-6">
          <div>
            <div className="text-[11px] uppercase tracking-[.18em] font-bold text-amber-600/90">Sự kiện gia phả</div>
            <h1 className="font-bold text-4xl lg:text-5xl mt-2 text-slate-900">Sinh nhật · Giỗ chạp · Lễ tộc</h1>
            <p className="text-slate-600 mt-3 max-w-2xl">Theo dõi và tổ chức các sự kiện quan trọng của dòng họ. Sinh nhật và ngày giỗ tự động lấy từ phả hệ; các sự kiện khác bạn có thể tự tạo.</p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="px-5 py-3 rounded-xl text-white font-semibold shadow-md inline-flex items-center gap-2 transition-all hover:-translate-y-0.5 hover:shadow-lg"
            style={{ background: "linear-gradient(135deg,#1d4ed8,#2563eb)", boxShadow: "0 4px 12px -2px rgba(29,78,216,.30)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4"><path d="M12 5v14M5 12h14" /></svg>
            Tạo sự kiện mới
          </button>
        </div>

        {/* ====== Error block khi API lỗi ====== */}
        {error ? (
          <div className="rounded-2xl p-10 text-center border-2 border-dashed border-red-200 bg-red-50/50" style={{ backdropFilter: "blur(12px)" }}>
            <div className="w-14 h-14 mx-auto rounded-full bg-red-100 border border-red-200 grid place-items-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5"><path d="m10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></svg>
            </div>
            <h3 className="font-bold text-xl text-red-950 mb-2">Đã xảy ra lỗi kết nối</h3>
            <p className="text-sm text-red-700 max-w-md mx-auto mb-6">{error}</p>
            <button
              onClick={fetchEventsData}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md active:scale-95"
            >
              Thử lại
            </button>
          </div>
        ) : (
          <>
            {/* ====== Upcoming Events ====== */}
            <section>
              <div className="flex items-end justify-between mb-5">
                <div>
                  <div className="text-[11px] uppercase tracking-[.18em] font-bold text-amber-600/90">Sắp tới</div>
                  <h2 className="font-bold text-2xl mt-1 text-slate-900">Sự kiện gần</h2>
                </div>
                {/* Toggle khoảng thời gian upcoming */}
                <div className="flex items-center gap-1 p-1 rounded-full text-xs font-semibold" style={{ background: "#f1f5f9" }}>
                  {([7, 30, 90] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setUpcomingDays(d)}
                      className={`px-3 py-1.5 rounded-full transition-all ${upcomingDays === d ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      {d} ngày
                    </button>
                  ))}
                </div>
              </div>

              {eventsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-2xl h-40 animate-pulse bg-slate-100" />
                  ))}
                </div>
              ) : upcoming.length === 0 ? (
                <div className="rounded-2xl p-8 text-center text-slate-500 text-sm" style={{ background: "rgba(255,255,255,.60)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,.60)" }}>
                  Không có sự kiện trong {upcomingDays} ngày tới.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {upcoming.map((ev, idx) => (
                    <UpcomingCard key={`${ev.sourceId || ev.type}-${idx}`} ev={ev} onClick={() => handleViewEvent(ev)} />
                  ))}
                </div>
              )}
            </section>

            {/* ====== All Events ====== */}
            <section>
              <div className="mb-5">
                <div className="text-[11px] uppercase tracking-[.18em] font-bold text-amber-600/90">Tất cả sự kiện</div>
                <h2 className="font-bold text-2xl mt-1 text-slate-900">Danh sách đầy đủ</h2>
              </div>

              {/* Filter Bar */}
              <div className="rounded-2xl p-3 md:p-4 mb-5" style={{ background: "rgba(255,255,255,.60)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,.60)" }}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  {/* Tab lọc theo loại */}
                  <div className="flex items-center gap-1 p-1 rounded-full text-sm font-semibold overflow-x-auto max-w-full" style={{ background: "rgba(241,245,249,.70)" }}>
                    {tabs.map((t) => {
                      const active = filterType === t.id
                      return (
                        <button
                          key={t.id}
                          onClick={() => setFilterType(t.id)}
                          className={`px-3.5 py-1.5 rounded-full whitespace-nowrap inline-flex items-center gap-2 transition-all ${active ? "bg-white shadow-sm text-slate-900" : "text-slate-600 hover:text-slate-900"}`}
                        >
                          {t.label}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${active ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"}`}>{t.count}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Thanh công cụ bên phải: tìm kiếm, sắp xếp, chế độ xem */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Search input */}
                    <div className="relative">
                      <svg className="absolute left-3 top-2.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Tìm sự kiện…"
                        className="pl-9 pr-3 py-2 w-48 md:w-56 rounded-lg bg-white/80 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    {/* Sort select */}
                    <Select
                      value={sortBy}
                      onValueChange={(value: typeof sortBy) => setSortBy(value)}
                    >
                      <SelectTrigger className="h-[38px] px-3 py-2 rounded-lg bg-white/80 border border-slate-200 text-sm font-medium w-[185px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date-asc">Sắp xếp: ngày tăng</SelectItem>
                        <SelectItem value="date-desc">Sắp xếp: ngày giảm</SelectItem>
                        <SelectItem value="title">Sắp xếp: tên</SelectItem>
                        <SelectItem value="type">Sắp xếp: loại</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* View toggle: list / grid */}
                    <div className="flex p-0.5 rounded-lg bg-slate-100 border border-slate-200">
                      <button onClick={() => setView("list")} className={`px-2 py-1.5 rounded grid place-items-center transition-all ${view === "list" ? "bg-white shadow-sm" : ""}`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
                      </button>
                      <button onClick={() => setView("grid")} className={`px-2 py-1.5 rounded grid place-items-center transition-all ${view === "grid" ? "bg-white shadow-sm" : ""}`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ====== Event List / Grid ====== */}
              {eventsLoading ? (
                <div className={view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-2.5"}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={`rounded-2xl animate-pulse bg-slate-100 ${view === "grid" ? "h-48" : "h-24"}`} />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-2xl py-16 text-center shadow-sm" style={{ background: "rgba(255,255,255,.60)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,.60)" }}>
                  <div className="w-16 h-16 mx-auto rounded-2xl grid place-items-center mb-4" style={{ background: "linear-gradient(135deg, #3b82f6 0%, #f59e0b 100%)" }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                  </div>
                  <h3 className="font-bold text-lg text-slate-900">Không tìm thấy sự kiện</h3>
                  <p className="text-sm text-slate-500 mt-1.5 max-w-xs mx-auto">Thử đổi bộ lọc hoặc tạo sự kiện mới cho dòng họ của bạn.</p>
                </div>
              ) : view === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayedEvents.map((ev, idx) => (
                    <EventGridCard
                      key={`${ev.sourceId || ev.type}-${idx}`} ev={ev}
                      onView={() => handleViewEvent(ev)}
                      onEdit={() => setEditing(ev)}
                      onDelete={() => handleDelete(ev)}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {displayedEvents.map((ev, idx) => (
                    <EventRow
                      key={`${ev.sourceId || ev.type}-${idx}`} ev={ev}
                      onView={() => handleViewEvent(ev)}
                      onEdit={() => setEditing(ev)}
                      onDelete={() => handleDelete(ev)}
                    />
                  ))}
                </div>
              )}

              {/* Sentinel + thông tin số lượng */}
              {hasMore && (
                <div ref={sentinelRef} className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
                  </svg>
                  Đang tải thêm… ({displayedEvents.length}/{filtered.length})
                </div>
              )}
              {/* {!hasMore && filtered.length > ITEMS_PER_PAGE && (
                <div className="text-center py-6 text-xs text-slate-400">
                  Hiển thị tất cả {filtered.length} sự kiện
                </div>
              )} */}
            </section>
          </>
        )}
      </div>

      {/* ====== Modals ====== */}
      {/* Modal xem chi tiết sự kiện */}
      <ViewEventModal
        ev={viewing}
        chartId={chartId}
        onClose={() => setViewing(null)}
        onEdit={() => { setEditing(viewing!); setViewing(null) }}
        onDelete={() => { if (viewing) handleDelete(viewing) }}
      />

      {/* Modal tạo sự kiện mới */}
      <EventEditorModal
        open={creating}
        ev={null}
        onClose={() => setCreating(false)}
        onSave={handleCreate}
      />

      {/* Modal sửa sự kiện */}
      <EventEditorModal
        open={!!editing}
        ev={editing}
        onClose={() => setEditing(null)}
        onSave={handleUpdate}
      />
    </div>
  )
}
