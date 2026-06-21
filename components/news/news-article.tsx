"use client"

/**
 * news-article.tsx
 * Trang đọc 1 bài công khai. Nội dung HTML đã được backend sanitize → render trực tiếp.
 */

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Users, Calendar, AlertTriangle, Loader2 } from "lucide-react"
import * as newsApi from "@/lib/api/news"
import type { NewsOut } from "@/lib/api/news"
import { coverGradient, tagStyle, formatNewsDate, extractApiError } from "./news-helpers"

export default function NewsArticle({ postId }: { postId: string }) {
  const [post, setPost] = useState<NewsOut | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    setNotFound(false)
    newsApi
      .getNewsPost(postId)
      .then((p) => { if (alive) setPost(p) })
      .catch((err: any) => {
        if (!alive) return
        if (err?.response?.status === 404) setNotFound(true)
        else setError(extractApiError(err, "Không thể tải bài viết."))
      })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [postId])

  const dateStr = post ? formatNewsDate(post.publishedAt || post.createdAt) : ""

  return (
    <div
      className="relative min-h-screen"
      style={{
        background:
          "radial-gradient(at 18% 12%, rgba(129,140,248,0.22), transparent 48%), radial-gradient(at 85% 14%, rgba(56,189,248,0.18), transparent 50%), #f3f4fb",
      }}
    >
      <div className="w-full md:w-[85%] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/news" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-700 transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Quay lại tin tức
        </Link>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : notFound ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.7)" }}>
            <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 grid place-items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-slate-500" />
            </div>
            <h2 className="font-bold text-xl text-slate-900 mb-2">Không tìm thấy bài viết</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Bài viết không tồn tại hoặc đang ở chế độ nội bộ (chưa công khai).
            </p>
          </div>
        ) : error ? (
          <div className="rounded-2xl p-12 text-center border-2 border-dashed border-red-200 bg-red-50/60">
            <AlertTriangle className="w-7 h-7 text-red-600 mx-auto mb-3" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        ) : post ? (
          <article
            className="rounded-3xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,0.7)", boxShadow: "0 8px 30px rgba(15,23,42,0.07)" }}
          >
            {/* Ảnh bìa */}
            <div className="h-48 sm:h-64 relative" style={{ background: coverGradient(post.postId) }}>
              {post.coverImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.coverImageUrl} alt={post.title} className="absolute inset-0 w-full h-full object-cover" />
              )}
            </div>

            <div className="p-6 sm:p-8">
              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
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

              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">{post.title}</h1>

              {/* Meta */}
              <div className="flex items-center gap-3 text-sm text-slate-400 mt-4 pb-6 mb-6 border-b border-slate-100 flex-wrap">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> {post.authorId ? "Tác giả" : ""}
                </span>
                {dateStr && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" /> {dateStr}
                  </span>
                )}
              </div>

              {/* Nội dung đã sanitize */}
              <div className="news-content" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
            </div>
          </article>
        ) : null}
      </div>
    </div>
  )
}
