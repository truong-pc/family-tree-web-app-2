"use client"

/**
 * news-view-modal.tsx
 * Xem trước 1 bài trong khu quản lý (đọc cả bài nháp qua endpoint quản lý).
 */

import { useEffect, useState } from "react"
import { X, Pencil, Trash2, Globe, Lock, Loader2, Calendar } from "lucide-react"
import * as newsApi from "@/lib/api/news"
import type { NewsOut, NewsCardOut } from "@/lib/api/news"
import { coverGradient, tagStyle, formatNewsDate, extractApiError } from "./news-helpers"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"

interface NewsViewModalProps {
  post: NewsCardOut | null // null = đóng
  chartId: string
  token: string | null
  canModify: boolean
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function NewsViewModal({
  post,
  chartId,
  token,
  canModify,
  onClose,
  onEdit,
  onDelete,
}: NewsViewModalProps) {
  const [detail, setDetail] = useState<NewsOut | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!post || !token) return
    let alive = true
    setDetail(null)
    setError(null)
    setLoading(true)
    newsApi
      .getChartNewsPost(token, chartId, post.postId)
      .then((d) => { if (alive) setDetail(d) })
      .catch((err: any) => { if (alive) setError(extractApiError(err, "Không thể tải nội dung bài viết.")) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [post, token, chartId])

  const open = !!post
  const dateStr = detail ? formatNewsDate(detail.publishedAt || detail.createdAt) : ""

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent
        className="overflow-hidden p-0 rounded-3xl max-w-[1400px] w-[80vw] border border-white/60 sm:!max-w-[1400px]"
        showCloseButton={false}
        style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(14px)" }}
      >
        <DialogTitle className="sr-only">Xem bài viết</DialogTitle>
        <DialogDescription className="sr-only">Xem trước nội dung bài tin tức</DialogDescription>

        {post && (
          <div className="overflow-y-auto max-h-[88vh]">
            {/* Ảnh bìa */}
            <div className="h-40 relative" style={{ background: coverGradient(post.postId) }}>
              {(detail?.coverImageUrl || post.coverImageUrl) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={detail?.coverImageUrl || post.coverImageUrl || ""} alt={post.title} className="absolute inset-0 w-full h-full object-cover" />
              )}
              <button onClick={onClose} className="absolute top-3 right-3 w-9 h-9 rounded-lg bg-white/90 backdrop-blur grid place-items-center hover:bg-white transition-colors">
                <X className="w-4 h-4 text-slate-700" />
              </button>
              <span
                className="absolute top-3 left-3 inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full bg-white/90 backdrop-blur"
                style={{ color: post.public ? "#047857" : "#475569" }}
              >
                {post.public ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                {post.public ? "Công khai" : "Nội bộ"}
              </span>
            </div>

            <div className="p-6 sm:p-7">
              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {post.tags.map((t) => {
                    const s = tagStyle(t)
                    return (
                      <span key={t} className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: s.bg, color: s.color }}>
                        {t}
                      </span>
                    )
                  })}
                </div>
              )}

              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">{post.title}</h2>
              <div className="flex items-center gap-3 text-sm text-slate-400 mt-3 pb-5 mb-5 border-b border-slate-100 flex-wrap">
                <span>{post.authorName || "—"}</span>
                {dateStr && (<span className="inline-flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {dateStr}</span>)}
              </div>

              {/* Nội dung */}
              {loading ? (
                <div className="flex items-center justify-center py-12 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : error ? (
                <p className="text-sm text-red-600 py-6 text-center">{error}</p>
              ) : detail ? (
                <div className="news-content text-[1rem]" dangerouslySetInnerHTML={{ __html: detail.contentHtml }} />
              ) : null}
            </div>

            {/* Footer actions */}
            <div className="px-6 sm:px-7 py-4 border-t border-slate-100 bg-slate-50/60 flex gap-2 justify-end">
              {canModify && (
                <>
                  <button onClick={onDelete} className="px-4 py-2.5 rounded-lg font-semibold border border-red-200 bg-white text-red-600 hover:bg-red-50 transition-colors inline-flex items-center gap-2">
                    <Trash2 className="w-4 h-4" /> Xóa
                  </button>
                  <button onClick={onEdit} className="px-4 py-2.5 rounded-lg font-semibold text-white shadow-md inline-flex items-center gap-2 transition-all hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg,#4338CA,#4F46E5)" }}>
                    <Pencil className="w-4 h-4" /> Sửa
                  </button>
                </>
              )}
              {!canModify && (
                <button onClick={onClose} className="px-4 py-2.5 rounded-lg font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors">
                  Đóng
                </button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
