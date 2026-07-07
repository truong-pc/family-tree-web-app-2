"use client"

/**
 * news-card.tsx
 * Thẻ bài trong feed công khai. Hai biến thể:
 * - featured: card lớn ngang (bài nổi bật đầu trang)
 * - mặc định: card dọc trong grid
 */

import Link from "next/link"
import { Users } from "lucide-react"
import type { NewsCardOut } from "@/lib/api/news"
import { coverGradient, tagStyle, formatNewsDate } from "./news-helpers"

function TagChips({ tags, max = 3 }: { tags?: string[]; max?: number }) {
  if (!tags || tags.length === 0) return null
  const shown = tags.slice(0, max)
  const extra = tags.length - shown.length
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {shown.map((t) => {
        const s = tagStyle(t)
        return (
          <span key={t} className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: s.bg, color: s.color }}>
            {t}
          </span>
        )
      })}
      {extra > 0 && (
        <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">+{extra}</span>
      )}
    </div>
  )
}

const glass = {
  background: "rgba(255,255,255,0.5)",
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.65)",
  boxShadow: "0 8px 30px rgba(15,23,42,0.07)",
}

export function NewsFeaturedCard({ post }: { post: NewsCardOut }) {
  const dateStr = formatNewsDate(post.publishedAt || post.createdAt)
  return (
    <Link href={`/news/${post.postId}`} className="block group">
      <div className="flex flex-col md:flex-row rounded-2xl overflow-hidden transition-transform hover:-translate-y-0.5" style={glass}>
        <div className="md:w-[42%] min-h-[180px] relative" style={{ background: coverGradient(post.postId) }}>
          {post.coverImageUrl && (
            <img src={post.coverImageUrl} alt={post.title} className="absolute inset-0 w-full h-full object-cover" />
          )}
          <span className="absolute top-3 left-3 text-[11px] px-2.5 py-1 rounded-full bg-white/90 text-indigo-700 font-semibold">
            Nổi bật
          </span>
        </div>
        <div className="flex-1 p-5 md:p-6 flex flex-col justify-center">
          <div className="mb-2.5"><TagChips tags={post.tags} /></div>
          <h3 className="text-lg md:text-xl font-semibold text-slate-800 leading-snug group-hover:text-indigo-700 transition-colors line-clamp-2">
            {post.title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-3 flex-wrap">
            <Users className="w-3.5 h-3.5" />
            <span className="text-slate-500">{post.chartName || "Gia phả"}</span>
            {post.authorName && (<><span>·</span><span>{post.authorName}</span></>)}
            {dateStr && (<><span>·</span><span>{dateStr}</span></>)}
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function NewsCard({ post }: { post: NewsCardOut }) {
  const dateStr = formatNewsDate(post.publishedAt || post.createdAt)
  return (
    <Link href={`/news/${post.postId}`} className="block group h-full">
      <div className="rounded-2xl overflow-hidden h-full flex flex-col transition-transform hover:-translate-y-0.5" style={glass}>
        <div className="h-28 relative" style={{ background: coverGradient(post.postId) }}>
          {post.coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.coverImageUrl} alt={post.title} className="absolute inset-0 w-full h-full object-cover" />
          )}
        </div>
        <div className="p-4 flex flex-col flex-1">
          <div className="mb-2"><TagChips tags={post.tags} max={2} /></div>
          <h3 className="text-[15px] font-semibold text-slate-800 leading-snug group-hover:text-indigo-700 transition-colors line-clamp-2">
            {post.title}
          </h3>
          <p className="text-xs text-slate-400 mt-auto pt-3">
            {post.chartName || "Gia phả"}
            {dateStr ? ` · ${dateStr}` : ""}
          </p>
        </div>
      </div>
    </Link>
  )
}
