"use client"

/**
 * news-row.tsx
 * Một dòng bài trong khu quản lý. Badge Công khai/Nội bộ + nút xem/sửa/xoá.
 * Quyền sửa/xoá: owner (mọi bài) hoặc editor (chỉ bài của mình) → canModify.
 */

import { Eye, Pencil, Trash2, Globe, Lock } from "lucide-react"
import type { NewsCardOut } from "@/lib/api/news"
import { coverGradient, formatNewsDate, tagStyle } from "./news-helpers"

interface NewsRowProps {
  post: NewsCardOut
  canModify: boolean
  onView: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function NewsRow({ post, canModify, onView, onEdit, onDelete }: NewsRowProps) {
  const dateStr = formatNewsDate(post.publishedAt || post.createdAt)
  const tags = post.tags ?? []

  return (
    <div
      className="flex items-center gap-3.5 rounded-2xl px-3.5 py-3"
      style={{ background: "rgba(255,255,255,0.62)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.7)", boxShadow: "0 4px 16px rgba(15,23,42,0.05)" }}
    >
      {/* Thumbnail */}
      <div className="w-[60px] h-[46px] rounded-lg shrink-0 relative overflow-hidden" style={{ background: coverGradient(post.postId) }}>
        {post.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        {!post.public && (
          <Lock className="absolute top-1 right-1 w-3 h-3 text-white/90" />
        )}
      </div>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{post.title}</p>
        <p className="text-xs text-slate-400 mt-0.5 truncate">
          {post.authorName || "—"}
          {dateStr ? ` · ${dateStr}` : ""}
          {!canModify && <span className="text-slate-300"> · không phải bài của bạn</span>}
        </p>
        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mt-1.5">
            {tags.slice(0, 4).map((t) => {
              const s = tagStyle(t)
              return (
                <span
                  key={t}
                  className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: s.bg, color: s.color }}
                >
                  {t}
                </span>
              )
            })}
            {tags.length > 4 && (
              <span className="text-[11px] text-slate-400">+{tags.length - 4}</span>
            )}
          </div>
        )}
      </div>

      {/* Trạng thái */}
      {post.public ? (
        <span className="inline-flex items-center gap-1.5 text-xs px-2 sm:px-2.5 py-1.5 rounded-full shrink-0" style={{ background: "rgba(16,185,129,0.12)", color: "#047857" }}>
          <Globe className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Công khai</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-xs px-2 sm:px-2.5 py-1.5 rounded-full shrink-0" style={{ background: "rgba(100,116,139,0.14)", color: "#475569" }}>
          <Lock className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Nội bộ</span>
        </span>
      )}

      {/* Hành động */}
      <div className="flex gap-1.5 shrink-0">
        <button
          onClick={onView}
          title="Xem trước"
          className="w-8 h-8 rounded-lg grid place-items-center text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          onClick={onEdit}
          disabled={!canModify}
          title={canModify ? "Sửa" : "Bạn không có quyền sửa bài này"}
          className="w-8 h-8 rounded-lg grid place-items-center transition-colors border disabled:cursor-not-allowed disabled:text-slate-300 disabled:bg-slate-50 disabled:border-slate-100 text-indigo-600 bg-white border-slate-200 hover:bg-indigo-50"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          disabled={!canModify}
          title={canModify ? "Xóa" : "Bạn không có quyền xóa bài này"}
          className="w-8 h-8 rounded-lg grid place-items-center transition-colors border disabled:cursor-not-allowed disabled:text-slate-300 disabled:bg-slate-50 disabled:border-slate-100 text-red-600 bg-white border-slate-200 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
