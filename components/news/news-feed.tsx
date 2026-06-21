"use client"

/**
 * news-feed.tsx
 * Feed tin tức công khai (không cần đăng nhập).
 * - Phân trang cursor vô hạn (GET /api/v1/news), nối các trang, IntersectionObserver tải thêm.
 * - Lọc theo tag (chip). Bài đầu hiển thị dạng "Nổi bật".
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, Newspaper, AlertTriangle, Tag } from "lucide-react"
import * as newsApi from "@/lib/api/news"
import type { NewsCardOut } from "@/lib/api/news"
import { SUGGESTED_TAGS, extractApiError } from "./news-helpers"
import NewsCard, { NewsFeaturedCard } from "./news-card"

const PAGE_SIZE = 12

export default function NewsFeed() {
  const [items, setItems] = useState<NewsCardOut[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTag, setActiveTag] = useState<string | null>(null)

  const sentinelRef = useRef<HTMLDivElement>(null)
  // Token để bỏ qua kết quả của lần fetch cũ khi đổi bộ lọc.
  const reqIdRef = useRef(0)

  /** Tải trang đầu (reset) khi đổi tag. */
  const loadFirst = useCallback(async (tag: string | null) => {
    const reqId = ++reqIdRef.current
    setLoading(true)
    setError(null)
    setItems([])
    setCursor(null)
    setHasMore(true)
    try {
      const res = await newsApi.getNewsFeed({ limit: PAGE_SIZE, tag: tag || undefined })
      if (reqId !== reqIdRef.current) return // đã có request mới hơn
      setItems(res.items || [])
      setCursor(res.nextCursor)
      setHasMore(!!res.nextCursor)
    } catch (err: any) {
      if (reqId !== reqIdRef.current) return
      setError(extractApiError(err, "Không thể tải tin tức từ máy chủ."))
    } finally {
      if (reqId === reqIdRef.current) setLoading(false)
    }
  }, [])

  /** Tải trang kế theo cursor. */
  const loadMore = useCallback(async () => {
    if (loadingMore || loading || !hasMore || !cursor) return
    const reqId = reqIdRef.current
    setLoadingMore(true)
    try {
      const res = await newsApi.getNewsFeed({ limit: PAGE_SIZE, cursor, tag: activeTag || undefined })
      if (reqId !== reqIdRef.current) return
      setItems((prev) => [...prev, ...(res.items || [])])
      setCursor(res.nextCursor)
      setHasMore(!!res.nextCursor)
    } catch (err: any) {
      if (reqId !== reqIdRef.current) return
      setError(extractApiError(err, "Không thể tải thêm tin tức."))
      setHasMore(false)
    } finally {
      if (reqId === reqIdRef.current) setLoadingMore(false)
    }
  }, [loadingMore, loading, hasMore, cursor, activeTag])

  useEffect(() => {
    loadFirst(activeTag)
  }, [activeTag, loadFirst])

  // IntersectionObserver: khi sentinel xuất hiện → tải thêm.
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore() },
      { rootMargin: "300px" }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [loadMore])

  const [featured, ...rest] = items

  return (
    <div
      className="relative min-h-screen"
      style={{
        background:
          "radial-gradient(at 18% 12%, rgba(129,140,248,0.28), transparent 48%), radial-gradient(at 85% 18%, rgba(56,189,248,0.24), transparent 50%), radial-gradient(at 60% 95%, rgba(167,139,250,0.18), transparent 52%), #eef0fb",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div>
          <p className="text-[12px] font-semibold tracking-[0.14em] text-amber-600 uppercase mb-2">Tin tức gia phả</p>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">Tin tức dòng họ</h1>
          <p className="text-slate-500 mt-3 max-w-2xl">
            Sự kiện, thông báo và phả ký được cập nhật từ các gia phả của bạn và toàn hệ thống.
          </p>
        </div>

        {/* Tag filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTag(null)}
            className={`text-xs px-3.5 py-1.5 rounded-full border transition-colors ${activeTag === null ? "bg-indigo-600 text-white border-indigo-600" : "bg-white/70 text-slate-600 border-slate-200 hover:border-indigo-300"}`}
          >
            Tất cả
          </button>
          {SUGGESTED_TAGS.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTag(t)}
              className={`text-xs px-3.5 py-1.5 rounded-full border transition-colors inline-flex items-center gap-1 ${activeTag === t ? "bg-indigo-600 text-white border-indigo-600" : "bg-white/70 text-slate-600 border-slate-200 hover:border-indigo-300"}`}
            >
              {activeTag === t && <Tag className="w-3 h-3" />}
              {t}
            </button>
          ))}
        </div>

        {/* States */}
        {loading ? (
          <div className="space-y-5">
            <div className="rounded-2xl h-44 animate-pulse bg-white/50" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl h-52 animate-pulse bg-white/50" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl p-10 text-center border-2 border-dashed border-red-200 bg-red-50/60">
            <div className="w-14 h-14 mx-auto rounded-full bg-red-100 border border-red-200 grid place-items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="font-bold text-xl text-red-950 mb-2">Đã xảy ra lỗi</h3>
            <p className="text-sm text-red-700 max-w-md mx-auto mb-6">{error}</p>
            <button
              onClick={() => loadFirst(activeTag)}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-all active:scale-95"
            >
              Thử lại
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl py-16 text-center" style={{ background: "rgba(255,255,255,0.55)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.65)" }}>
            <div className="w-16 h-16 mx-auto rounded-2xl grid place-items-center mb-4" style={{ background: "linear-gradient(135deg,#818CF8,#38BDF8)" }}>
              <Newspaper className="w-7 h-7 text-white" />
            </div>
            <h3 className="font-bold text-lg text-slate-900">Chưa có tin tức</h3>
            <p className="text-sm text-slate-500 mt-1.5 max-w-xs mx-auto">
              {activeTag ? `Không có bài nào với thẻ "${activeTag}".` : "Hiện chưa có bài viết công khai nào."}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {featured && <NewsFeaturedCard post={featured} />}
            {rest.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {rest.map((p) => (
                  <NewsCard key={p.postId} post={p} />
                ))}
              </div>
            )}

            {/* Sentinel / trạng thái tải thêm */}
            {hasMore && (
              <div ref={sentinelRef} className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                Đang tải thêm…
              </div>
            )}
            {!hasMore && items.length > PAGE_SIZE && (
              <div className="text-center py-6 text-xs text-slate-400">Đã hiển thị tất cả tin tức</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
