"use client"

/**
 * news-manage-page.tsx
 * Khu quản lý tin tức theo gia phả (owner/editor).
 * - Liệt kê tất cả bài (cả nháp), tab lọc Tất cả/Của tôi/Công khai/Nội bộ, tìm kiếm.
 * - CRUD qua modal soạn bài + modal xem trước. Xóa dùng window.confirm.
 * - Quyền: owner sửa/xoá mọi bài; editor chỉ bài của mình (authorId === user.id).
 */

import { useState, useMemo, useEffect, useCallback } from "react"
import { Plus, Search, Newspaper, AlertTriangle } from "lucide-react"
import { useAuthStore } from "@/lib/stores/auth-store"
import { useToast } from "@/hooks/use-toast"
import * as newsApi from "@/lib/api/news"
import { getMyChart } from "@/lib/api/chart"
import type { NewsCardOut, NewsOut } from "@/lib/api/news"
import { extractApiError } from "./news-helpers"
import NewsRow from "./news-row"
import NewsEditorModal, { type NewsFormPayload } from "./news-editor-modal"
import NewsViewModal from "./news-view-modal"

type Tab = "all" | "mine" | "public" | "internal"

export default function NewsManagePage({ chartId }: { chartId: string }) {
  const { token, user } = useAuthStore()
  const { toast } = useToast()

  const [posts, setPosts] = useState<NewsCardOut[]>([])
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [tab, setTab] = useState<Tab>("all")
  const [query, setQuery] = useState("")

  // Modal state
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<NewsOut | null>(null)
  const [viewing, setViewing] = useState<NewsCardOut | null>(null)
  const [saving, setSaving] = useState(false)

  /** Quyền sửa/xoá 1 bài. */
  const canModify = useCallback(
    (post: { authorId: string }) => isOwner || post.authorId === user?.id,
    [isOwner, user?.id]
  )

  // --- Fetch ---
  const fetchPosts = useCallback(() => {
    if (!token || !chartId) {
      setLoading(false)
      setError("Không tìm thấy thông tin đăng nhập hoặc gia phả.")
      return
    }
    setLoading(true)
    setError(null)
    Promise.all([
      newsApi.getChartNews(token, chartId),
      getMyChart(token).catch(() => null),
    ])
      .then(([list, myChart]) => {
        setPosts(list || [])
        setIsOwner(!!myChart && myChart._id === chartId)
      })
      .catch((err: any) => {
        const msg = extractApiError(err, "Không thể tải danh sách bài viết.")
        setError(msg)
        toast({ variant: "destructive", title: "Lỗi tải dữ liệu", description: msg })
      })
      .finally(() => setLoading(false))
  }, [token, chartId, toast])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  // --- Counts & filter ---
  const counts = useMemo(() => ({
    all: posts.length,
    mine: posts.filter((p) => p.authorId === user?.id).length,
    public: posts.filter((p) => p.public).length,
    internal: posts.filter((p) => !p.public).length,
  }), [posts, user?.id])

  const filtered = useMemo(() => {
    let list = posts
    if (tab === "mine") list = list.filter((p) => p.authorId === user?.id)
    else if (tab === "public") list = list.filter((p) => p.public)
    else if (tab === "internal") list = list.filter((p) => !p.public)
    const q = query.trim().toLowerCase()
    if (q) list = list.filter((p) =>
      p.title.toLowerCase().includes(q) ||
      (p.tags || []).some((t) => t.toLowerCase().includes(q))
    )
    return list
  }, [posts, tab, query, user?.id])

  const tabs: { id: Tab; label: string; count: number; color?: string }[] = [
    { id: "all", label: "Tất cả", count: counts.all },
    { id: "mine", label: "Của tôi", count: counts.mine },
    { id: "public", label: "Công khai", count: counts.public, color: "#047857" },
    { id: "internal", label: "Nội bộ", count: counts.internal },
  ]

  // --- CRUD ---
  const handleCreate = useCallback(async (payload: NewsFormPayload) => {
    if (!token || !chartId) return
    setSaving(true)
    try {
      const created = await newsApi.createNews(token, chartId, payload)
      // Bổ sung tên cho card (API tạo trả NewsOut không có chartName/authorName).
      const card: NewsCardOut = {
        ...created,
        chartName: null,
        authorName: user?.fullName || user?.email || null,
      }
      setPosts((prev) => [card, ...prev])
      setCreating(false)
      toast({ title: payload.public ? "Đã đăng bài" : "Đã lưu nháp", description: payload.title })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Lưu thất bại", description: extractApiError(err, "Không thể lưu bài viết.") })
    } finally {
      setSaving(false)
    }
  }, [token, chartId, user, toast])

  const handleUpdate = useCallback(async (payload: NewsFormPayload) => {
    if (!token || !chartId || !editing) return
    setSaving(true)
    try {
      const updated = await newsApi.updateNews(token, chartId, editing.postId, payload)
      setPosts((prev) => prev.map((p) =>
        p.postId === editing.postId
          ? { ...p, ...updated, chartName: p.chartName, authorName: p.authorName }
          : p
      ))
      setEditing(null)
      toast({ title: "Đã lưu thay đổi", description: payload.title })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Cập nhật thất bại", description: extractApiError(err, "Không thể cập nhật bài viết.") })
    } finally {
      setSaving(false)
    }
  }, [token, chartId, editing, toast])

  const handleDelete = useCallback(async (post: NewsCardOut) => {
    if (!token || !chartId) return
    if (!window.confirm(`Xóa bài "${post.title}"? Hành động này không thể hoàn tác.`)) return
    try {
      await newsApi.deleteNews(token, chartId, post.postId)
      setPosts((prev) => prev.filter((p) => p.postId !== post.postId))
      setViewing(null)
      toast({ variant: "destructive", title: "Đã xóa bài viết", description: post.title })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Xóa thất bại", description: extractApiError(err, "Không thể xóa bài viết.") })
    }
  }, [token, chartId, toast])

  /** Mở modal sửa: cần full NewsOut (có contentHtml) → fetch chi tiết. */
  const openEdit = useCallback(async (post: NewsCardOut) => {
    if (!token) return
    try {
      const detail = await newsApi.getChartNewsPost(token, chartId, post.postId)
      setViewing(null)
      setEditing(detail)
    } catch (err: any) {
      toast({ variant: "destructive", title: "Không mở được bài viết", description: extractApiError(err, "Lỗi tải nội dung bài.") })
    }
  }, [token, chartId, toast])

  return (
    <div
      className="relative min-h-screen"
      style={{
        background:
          "radial-gradient(at 18% 12%, rgba(129,140,248,0.22), transparent 50%), radial-gradient(at 88% 16%, rgba(56,189,248,0.18), transparent 52%), #eef0fb",
      }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[12px] font-semibold tracking-[0.12em] text-amber-600 uppercase mb-2">Quản lý tin tức</p>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Quản lý bài viết</h1>
            <p className="text-sm text-slate-500 mt-2">Soạn, chỉnh sửa và chọn phạm vi công khai cho tin tức của gia phả này.</p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
            style={{ background: "linear-gradient(135deg,#4338CA,#4F46E5)" }}
          >
            <Plus className="w-5 h-5" /> Tạo bài viết
          </button>
        </div>

        {error ? (
          <div className="rounded-2xl p-10 text-center border-2 border-dashed border-red-200 bg-red-50/60">
            <AlertTriangle className="w-7 h-7 text-red-600 mx-auto mb-3" />
            <p className="text-sm text-red-700 mb-5">{error}</p>
            <button onClick={fetchPosts} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-all active:scale-95">
              Thử lại
            </button>
          </div>
        ) : (
          <>
            {/* Filter bar */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-1 p-1 rounded-xl border border-slate-200" style={{ background: "rgba(255,255,255,0.6)" }}>
                {tabs.map((t) => {
                  const active = tab === t.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`text-[13px] px-3 py-1.5 rounded-lg font-medium transition-colors ${active ? "bg-indigo-600 text-white" : "hover:bg-white"}`}
                      style={!active && t.color ? { color: t.color } : !active ? { color: "#475569" } : undefined}
                    >
                      {t.label} · {t.count}
                    </button>
                  )
                })}
              </div>
              <div className="ml-auto flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm bài viết…"
                  className="text-sm bg-transparent focus:outline-none w-full placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* List */}
            {loading ? (
              <div className="space-y-2.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-2xl h-[72px] animate-pulse bg-white/50" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl py-16 text-center" style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.7)" }}>
                <div className="w-16 h-16 mx-auto rounded-2xl grid place-items-center mb-4" style={{ background: "linear-gradient(135deg,#818CF8,#38BDF8)" }}>
                  <Newspaper className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-lg text-slate-900">
                  {posts.length === 0 ? "Chưa có bài viết nào" : "Không tìm thấy bài viết"}
                </h3>
                <p className="text-sm text-slate-500 mt-1.5 max-w-xs mx-auto">
                  {posts.length === 0 ? "Bấm \"Tạo bài viết\" để soạn tin tức đầu tiên cho dòng họ." : "Thử đổi bộ lọc hoặc từ khóa tìm kiếm."}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filtered.map((p) => (
                  <NewsRow
                    key={p.postId}
                    post={p}
                    canModify={canModify(p)}
                    onView={() => setViewing(p)}
                    onEdit={() => openEdit(p)}
                    onDelete={() => handleDelete(p)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <NewsEditorModal
        open={creating}
        post={null}
        saving={saving}
        onClose={() => setCreating(false)}
        onSave={handleCreate}
      />
      <NewsEditorModal
        open={!!editing}
        post={editing}
        saving={saving}
        onClose={() => setEditing(null)}
        onSave={handleUpdate}
      />
      <NewsViewModal
        post={viewing}
        chartId={chartId}
        token={token}
        canModify={viewing ? canModify(viewing) : false}
        onClose={() => setViewing(null)}
        onEdit={() => { if (viewing) openEdit(viewing) }}
        onDelete={() => { if (viewing) handleDelete(viewing) }}
      />
    </div>
  )
}
