/**
 * event-helpers.tsx
 * Hàm tiện ích & metadata cho module Events.
 * - TYPE_META: styling/icon cho từng loại sự kiện (birthday, death, custom)
 * - getEventMeta: lấy metadata theo type, fallback về custom
 * - formatEventDate: format ngày hiển thị (có phân biệt âm/dương lịch)
 * - formatRepeat: hiển thị "Hàng năm" / "Một lần"
 * - daysUntilLabel: label đếm ngược cho upcoming events
 */

// import { Cake, Flame, CalendarDays } from "lucide-react"
import type { FamilyEvent } from "@/lib/api/events"

/** Metadata hiển thị cho mỗi loại sự kiện: màu, icon, label */
export const TYPE_META = {
  birthday: {
    label: "Sinh nhật",
    bgClass: "bg-blue-50",
    textClass: "text-blue-700",
    borderClass: "border-blue-100",
    iconBg: "bg-blue-100",
    iconText: "text-blue-700",
    gradientFrom: "#dbeafe",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21H4v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z" />
        <path d="M4 16s1-1 4-1 5 2 8 2 4-1 4-1" />
        <path d="M2 21h20M7 8v2M12 8v2M17 8v2M12 4v0" />
      </svg>
    ),
    // icon: <Cake size={16} />,
  },
  death: {
    label: "Giỗ",
    bgClass: "bg-slate-100",
    textClass: "text-slate-700",
    borderClass: "border-slate-200",
    iconBg: "bg-slate-200",
    iconText: "text-slate-700",
    gradientFrom: "#f1f5f9",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2c-.5 2-2 2.5-2 5 0 1.5 1 2 2 2s2-.5 2-2c0-2.5-1.5-3-2-5z" />
        <rect x="9" y="9" width="6" height="9" rx="1" />
        <path d="M7 22h10" />
      </svg>
    ),
    // icon: <Flame size={16} />,
  },
  custom: {
    label: "Tự tạo",
    bgClass: "bg-amber-50",
    textClass: "text-amber-800",
    borderClass: "border-amber-100",
    iconBg: "bg-amber-100",
    iconText: "text-amber-700",
    gradientFrom: "#fef3c7",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 11h18" />
      </svg>
    ),
  },
}

/** Lấy metadata theo type, fallback về custom nếu type không hợp lệ */
export const getEventMeta = (type: string | undefined | null) => {
  if (type && type in TYPE_META) {
    return TYPE_META[type as keyof typeof TYPE_META]
  }
  return TYPE_META.custom
}

/** Format ngày hiển thị — có phân biệt âm/dương lịch và tháng nhuận */
export const formatEventDate = (e: FamilyEvent) => {
  const m = e.month, d = e.day
  if (e.calendar === "lunar") return `${d}/${m} ÂL${e.isLeapMonth ? " (nhuận)" : ""}`
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`
}

/** Hiển thị loại lặp lại: "Hàng năm" hoặc "Một lần" */
export const formatRepeat = (e: { repeat: string }) => e.repeat === "yearly" ? "Hàng năm" : "Một lần"

/** Label đếm ngược cho upcoming events: "Hôm nay", "Ngày mai", "Còn N ngày" */
export const daysUntilLabel = (n: number) => {
  if (n === 0) return "Hôm nay"
  if (n === 1) return "Ngày mai"
  return `Còn ${n} ngày`
}
