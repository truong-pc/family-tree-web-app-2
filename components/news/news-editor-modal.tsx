"use client"

/**
 * news-editor-modal.tsx
 * Modal soạn / sửa bài tin tức.
 * - shadcn Dialog (overflow-hidden p-0 + form cuộn bên trong) — mẫu event-editor-modal.
 * - Trường: tiêu đề (≤200), ảnh bìa (upload Cloudinary), tags (chip + gợi ý), nội dung (HugeRTE).
 * - Footer: Lưu nháp (public:false) / Đăng công khai (public:true).
 *   Khi sửa: có switch giữ nguyên trạng thái public hiện tại.
 */

import { useState, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import { X, ImagePlus, Loader2, Trash2, Globe, Lock, Plus } from "lucide-react"
import type { NewsOut } from "@/lib/api/news"
import { uploadImage, validateImageFile } from "@/lib/services/cloudinary"
import { SUGGESTED_TAGS, tagStyle } from "./news-helpers"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"

// HugeRTE đụng window/document → nạp client-only, tránh SSR.
const NewsEditor = dynamic(() => import("./news-editor"), {
  ssr: false,
  loading: () => (
    <div className="h-[560px] rounded-lg border border-slate-200 bg-slate-50 grid place-items-center text-sm text-slate-400">
      <span className="inline-flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Đang tải trình soạn thảo…
      </span>
    </div>
  ),
})

/** Payload modal trả về cho parent. `makePublic` quyết định nút nào được bấm. */
export interface NewsFormPayload {
  title: string
  contentHtml: string
  coverImageUrl: string | null
  tags: string[]
  public: boolean
  /** URL ảnh đã upload/gỡ trong phiên soạn → backend dọn ảnh mồ côi. */
  draftPhotoUrls: string[]
}

interface NewsEditorModalProps {
  open: boolean
  post: NewsOut | null // null = tạo mới
  saving?: boolean
  onClose: () => void
  onSave: (payload: NewsFormPayload) => void
}

export default function NewsEditorModal({
  open,
  post,
  saving = false,
  onClose,
  onSave,
}: NewsEditorModalProps) {
  const isEdit = !!post

  const [title, setTitle] = useState("")
  const [contentHtml, setContentHtml] = useState("")
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fileRef = useRef<HTMLInputElement>(null)
  /**
   * Gom mọi URL ảnh đã upload trong phiên (ảnh bìa + ảnh trong bài) CỘNG các
   * URL ảnh cũ bị người dùng gỡ/đổi trong khi sửa. Gửi xuống `draftPhotoUrls`
   * để backend giữ ảnh còn dùng và dọn phần dư trên Cloudinary (xem news-api.md
   * mục 3.5/3.7 — backend KHÔNG tự suy ra ảnh cũ bị gỡ, phải liệt kê tường minh).
   */
  const draftPhotos = useRef<Set<string>>(new Set())

  /** Khởi tạo / reset form khi mở modal. */
  useEffect(() => {
    if (!open) return
    if (post) {
      setTitle(post.title)
      setContentHtml(post.contentHtml)
      setCoverImageUrl(post.coverImageUrl ?? null)
      setTags(post.tags ?? [])
      setIsPublic(post.public)
    } else {
      setTitle("")
      setContentHtml("")
      setCoverImageUrl(null)
      setTags([])
      setIsPublic(false)
    }
    setTagInput("")
    setErrors({})
    draftPhotos.current = new Set()
  }, [open, post])

  /** Upload + ghi lại URL để backend dọn ảnh mồ côi sau này. */
  const trackedUpload = async (file: File): Promise<string> => {
    const url = await uploadImage(file)
    draftPhotos.current.add(url)
    return url
  }

  /**
   * HugeRTE render các menu/hộp thoại (toolbar "…", chèn ảnh/liên kết) vào
   * `.tox-silver-sink` ở cấp <body> — NẰM NGOÀI nội dung Radix Dialog. Focus
   * trap của Dialog "giật" focus về lại modal, khiến không bấm/gõ được vào popup.
   *
   * Radix FocusScope chặn cả `focusin` LẪN `focusout`:
   *  - focusin: field HugeRTE nhận focus → Radix thấy target ngoài container → kéo về.
   *  - focusout: bấm sang field khác trong hộp thoại (vd URL → "Text to display"),
   *    field cũ bắn focusout với relatedTarget = field mới (cũng ngoài container)
   *    → Radix refocus về field cũ. Đây là lý do chỉ field đầu (được autofocus)
   *    gõ được, các field sau bấm/gõ không ăn.
   * Phải chặn CẢ HAI sự kiện khi target HOẶC relatedTarget nằm trong vùng HugeRTE.
   */
  useEffect(() => {
    if (!open) return
    const inHugeRTE = (el: EventTarget | null) =>
      !!(el as HTMLElement | null)?.closest?.(
        ".tox-silver-sink, .tox-hugerte-aux, .tox-tinymce-aux",
      )
    const guard = (e: FocusEvent) => {
      if (inHugeRTE(e.target) || inHugeRTE(e.relatedTarget)) {
        e.stopImmediatePropagation()
      }
    }
    document.addEventListener("focusin", guard, true)
    document.addEventListener("focusout", guard, true)
    return () => {
      document.removeEventListener("focusin", guard, true)
      document.removeEventListener("focusout", guard, true)
    }
  }, [open])

  /** True nếu pointer/interaction xảy ra bên trong popup của HugeRTE. */
  const isHugeRTETarget = (target: EventTarget | null) =>
    !!(target as HTMLElement | null)?.closest?.(
      ".tox-silver-sink, .tox-hugerte-aux, .tox-tinymce-aux, .tox-dialog, .tox-dialog-wrap, .tox-menu, .tox-collection, .tox-pop",
    )

  const addTag = (raw: string) => {
    const t = raw.trim()
    if (!t) return
    if (t.length > 50) return
    if (tags.length >= 20) return
    if (tags.some((x) => x.toLowerCase() === t.toLowerCase())) return
    setTags((prev) => [...prev, t])
    setTagInput("")
  }

  const removeTag = (t: string) => setTags((prev) => prev.filter((x) => x !== t))

  const handlePickCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = "" // cho phép chọn lại cùng file
    if (!file) return
    const err = validateImageFile(file)
    if (err) {
      setErrors((p) => ({ ...p, cover: err }))
      return
    }
    setErrors((p) => ({ ...p, cover: "" }))
    setUploading(true)
    try {
      // Ảnh bìa cũ (nếu có) thành ứng viên dọn rác khi đổi sang ảnh mới.
      if (coverImageUrl) draftPhotos.current.add(coverImageUrl)
      const url = await trackedUpload(file)
      setCoverImageUrl(url)
    } catch {
      setErrors((p) => ({ ...p, cover: "Tải ảnh bìa thất bại" }))
    } finally {
      setUploading(false)
    }
  }

  /** Xóa ảnh bìa: ghi URL cũ vào draftPhotos để backend dọn nếu không còn dùng. */
  const handleRemoveCover = () => {
    if (coverImageUrl) draftPhotos.current.add(coverImageUrl)
    setCoverImageUrl(null)
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = "Bắt buộc nhập tiêu đề"
    if (title.length > 200) e.title = "Tối đa 200 ký tự"
    // Bỏ qua các thẻ rỗng để kiểm tra nội dung thực sự.
    const textOnly = contentHtml.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim()
    if (!textOnly) e.content = "Bắt buộc nhập nội dung bài viết"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = (makePublic: boolean) => {
    if (!validate()) return
    onSave({
      title: title.trim(),
      contentHtml,
      coverImageUrl: coverImageUrl || null,
      tags,
      public: makePublic,
      draftPhotoUrls: [...draftPhotos.current],
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) onClose() }}>
      <DialogContent
        className="overflow-hidden p-0 rounded-3xl max-w-[1400px] w-[80vw] border border-white/60 sm:!max-w-[1400px]"
        showCloseButton={false}
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(14px)" }}
        onPointerDownOutside={(e) => { if (isHugeRTETarget(e.target)) e.preventDefault() }}
        onInteractOutside={(e) => { if (isHugeRTETarget(e.target)) e.preventDefault() }}
        onFocusOutside={(e) => { if (isHugeRTETarget(e.target)) e.preventDefault() }}
      >
        <DialogTitle className="sr-only">{isEdit ? "Sửa bài viết" : "Tạo bài viết"}</DialogTitle>
        <DialogDescription className="sr-only">Form soạn bài tin tức gia phả</DialogDescription>

        <div className="overflow-y-auto max-h-[88vh]">
          {/* Header */}
          <div className="px-7 pt-7 pb-3 relative">
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-lg hover:bg-slate-100 grid place-items-center transition-colors"
            >
              <X className="w-4 h-4 text-slate-600" />
            </button>
            <div className="text-[11px] uppercase tracking-[.18em] font-bold text-amber-600/90">
              {isEdit ? "Sửa bài viết" : "Tạo bài viết"}
            </div>
            <h2 className="font-bold text-2xl mt-1 text-slate-900">
              {isEdit ? "Cập nhật tin tức" : "Soạn tin tức cho dòng họ"}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Viết bài, chọn ảnh bìa và gắn thẻ. Lưu nháp để giữ riêng tư, hoặc đăng công khai cho mọi người đọc.
            </p>
          </div>

          <div className="px-7 pb-6 space-y-5">
            {/* Tiêu đề */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                Tiêu đề <span className="text-red-500">*</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder="VD: Họp họ đầu xuân Bính Ngọ — kính mời con cháu về dự"
                className={`w-full px-3 py-2.5 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${errors.title ? "border-red-300" : "border-slate-200 focus:border-indigo-500"}`}
              />
              {errors.title && <div className="text-xs text-red-600 mt-1">{errors.title}</div>}
              <div className="text-[11px] text-slate-400 mt-1 text-right">{title.length}/200</div>
            </div>

            {/* Ảnh bìa */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                Ảnh bìa <span className="text-slate-400 normal-case font-normal">· tùy chọn</span>
              </label>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePickCover} className="hidden" />
              {coverImageUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverImageUrl} alt="Ảnh bìa" className="w-full h-44 object-cover" />
                  <div className="absolute top-2 right-2 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-lg bg-white/90 backdrop-blur text-xs font-semibold text-slate-700 shadow inline-flex items-center gap-1"
                    >
                      <ImagePlus className="w-3.5 h-3.5" /> Đổi
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveCover}
                      className="px-2.5 py-1.5 rounded-lg bg-white/90 backdrop-blur text-xs font-semibold text-red-600 shadow inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Xóa
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full h-32 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/40 grid place-items-center transition-colors disabled:opacity-60"
                >
                  <div className="text-center text-slate-500">
                    {uploading ? (
                      <span className="inline-flex items-center gap-2 text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" /> Đang tải lên…
                      </span>
                    ) : (
                      <>
                        <ImagePlus className="w-6 h-6 mx-auto mb-1" />
                        <div className="text-sm font-medium">Tải ảnh bìa lên</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">PNG/JPG, &lt; 5MB</div>
                      </>
                    )}
                  </div>
                </button>
              )}
              {errors.cover && <div className="text-xs text-red-600 mt-1">{errors.cover}</div>}
            </div>

            {/* Tags */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                Thẻ <span className="text-slate-400 normal-case font-normal">· tối đa 20</span>
              </label>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map((t) => {
                    const s = tagStyle(t)
                    return (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
                        style={{ background: s.bg, color: s.color }}
                      >
                        {t}
                        <button type="button" onClick={() => removeTag(t)} className="hover:opacity-70">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )
                  })}
                </div>
              )}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault()
                    addTag(tagInput)
                  } else if (e.key === "Backspace" && !tagInput && tags.length) {
                    removeTag(tags[tags.length - 1])
                  }
                }}
                maxLength={50}
                placeholder="Nhập thẻ rồi Enter…"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
              {/* Gợi ý nhanh */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {SUGGESTED_TAGS.filter((t) => !tags.some((x) => x.toLowerCase() === t.toLowerCase())).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => addTag(t)}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Nội dung */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                Nội dung <span className="text-red-500">*</span>
              </label>
              <NewsEditor value={contentHtml} onChange={setContentHtml} onUpload={trackedUpload} />
              {errors.content && <div className="text-xs text-red-600 mt-1">{errors.content}</div>}
            </div>

            {/* Trạng thái công khai (chỉ khi sửa) */}
            {isEdit && (
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  {isPublic ? <Globe className="w-4 h-4 text-emerald-600" /> : <Lock className="w-4 h-4 text-slate-500" />}
                  <div>
                    <div className="text-sm font-semibold text-slate-800">
                      {isPublic ? "Công khai" : "Nội bộ (nháp)"}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {isPublic ? "Hiển thị trên trang tin tức cho mọi người." : "Chỉ owner/editor của gia phả xem được."}
                    </div>
                  </div>
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-7 py-4 border-t border-slate-100 bg-slate-50/60 flex gap-2 justify-end flex-wrap">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 rounded-lg font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60"
            >
              Hủy
            </button>
            {isEdit ? (
              // Khi sửa: 1 nút lưu, dùng switch để quyết định public.
              <button
                type="button"
                onClick={() => submit(isPublic)}
                disabled={saving || uploading}
                className="px-5 py-2.5 rounded-lg font-semibold text-white shadow-md inline-flex items-center gap-2 transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:hover:translate-y-0"
                style={{ background: "linear-gradient(135deg,#4338CA,#4F46E5)" }}
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Lưu thay đổi
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => submit(false)}
                  disabled={saving || uploading}
                  className="px-5 py-2.5 rounded-lg font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors inline-flex items-center gap-2 disabled:opacity-60"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Lock className="w-4 h-4" /> Lưu nháp
                </button>
                <button
                  type="button"
                  onClick={() => submit(true)}
                  disabled={saving || uploading}
                  className="px-5 py-2.5 rounded-lg font-semibold text-white shadow-md inline-flex items-center gap-2 transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:hover:translate-y-0"
                  style={{ background: "linear-gradient(135deg,#4338CA,#4F46E5)" }}
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Globe className="w-4 h-4" /> Đăng công khai
                </button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
