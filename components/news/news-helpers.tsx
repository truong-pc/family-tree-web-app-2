/**
 * news-helpers.ts
 * Tiện ích & metadata dùng chung cho module Tin Tức.
 */

/** Tag gợi ý cho ô soạn bài & thanh lọc công khai. */
export const SUGGESTED_TAGS = [
  "Sự kiện",
  "Thông báo",
  "Phả ký",
  "Khuyến học",
  "Họp họ",
  "Giỗ chạp",
  "Hiếu hỉ",
]

/** Bảng gradient cho ảnh bìa fallback (tông indigo/sky/violet như mockup). */
const COVER_GRADIENTS = [
  "linear-gradient(135deg,#818CF8,#38BDF8)",
  "linear-gradient(135deg,#38BDF8,#22D3EE)",
  "linear-gradient(135deg,#818CF8,#A78BFA)",
  "linear-gradient(135deg,#2DD4BF,#818CF8)",
  "linear-gradient(135deg,#6366F1,#818CF8)",
  "linear-gradient(135deg,#A78BFA,#38BDF8)",
]

/** Chọn gradient ổn định theo id (cùng bài → cùng màu). */
export const coverGradient = (id: string): string => {
  let sum = 0
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i)
  return COVER_GRADIENTS[sum % COVER_GRADIENTS.length]
}

/** Màu chip cho tag — xoay vòng theo nội dung tag. */
const TAG_STYLES = [
  { bg: "rgba(79,70,229,0.14)", color: "#4338CA" }, // indigo
  { bg: "rgba(56,189,248,0.18)", color: "#0369A1" }, // sky
  { bg: "rgba(13,148,136,0.16)", color: "#0F766E" }, // teal
  { bg: "rgba(99,102,241,0.16)", color: "#4338CA" }, // violet-ish
  { bg: "rgba(217,119,6,0.14)", color: "#B45309" }, // amber
]

export const tagStyle = (tag: string): { bg: string; color: string } => {
  let sum = 0
  for (let i = 0; i < tag.length; i++) sum += tag.charCodeAt(i)
  return TAG_STYLES[sum % TAG_STYLES.length]
}

/** Format ngày kiểu 14/06/2026 (dùng publishedAt hoặc createdAt). */
export const formatNewsDate = (iso?: string | null): string => {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

/** Format ngày ngắn 12/06. */
export const formatNewsDateShort = (iso?: string | null): string => {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })
}

/** Gom thông điệp lỗi từ response axios (detail dạng mảng Pydantic hoặc chuỗi). */
export const extractApiError = (err: any, fallback: string): string => {
  const detail = err?.response?.data?.detail
  return (
    err?.response?.data?.message ||
    (Array.isArray(detail) ? detail.map((d: any) => d.msg).join("; ") : detail) ||
    fallback
  )
}
