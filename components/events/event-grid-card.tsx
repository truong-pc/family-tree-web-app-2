"use client"

/**
 * event-grid-card.tsx
 * Card hiển thị sự kiện dạng grid (ô vuông).
 * - Hiển thị icon, badge loại, tiêu đề, ngày, lặp lại
 * - Nếu custom: có nút sửa/xóa
 * - Click vào card → onView
 */

import type { FamilyEvent } from "@/lib/api/events"
import { getEventMeta, formatEventDate, formatRepeat } from "./event-helpers"

export default function EventGridCard({
  ev,
  onView,
  onEdit,
  onDelete,
}: {
  ev: FamilyEvent
  onView: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const meta = getEventMeta(ev.type)
  const isCustom = ev.type === "custom"

  return (
    <article
      className="rounded-2xl p-5 cursor-pointer relative transition-all duration-300 hover:-translate-y-1 hover:shadow-xl bg-card"
      style={{ background: "rgba(255,255,255,.60)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,.60)", boxShadow: "0 1px 2px rgba(15,23,42,.04), 0 8px 24px -12px rgba(15,23,42,.08)" }}
      onClick={onView}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`w-12 h-12 rounded-xl grid place-items-center ${meta.iconBg} ${meta.iconText}`}>{meta.icon}</div>
        {/* Nút sửa/xóa chỉ hiển thị cho event custom */}
        {isCustom && (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button onClick={onEdit} className="w-7 h-7 rounded-md hover:bg-amber-50 grid place-items-center text-slate-500 transition-colors">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
            </button>
            <button onClick={onDelete} className="w-7 h-7 rounded-md hover:bg-red-50 grid place-items-center text-slate-500 transition-colors">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
            </button>
          </div>
        )}
      </div>
      {/* Badge loại sự kiện */}
      <div className={`mt-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${meta.bgClass} ${meta.textClass} border ${meta.borderClass}`}>
        {meta.icon}{meta.label}
      </div>
      {/* Tiêu đề */}
      <h3 className="font-bold text-base mt-2 leading-snug line-clamp-2 text-slate-900">{ev.title}</h3>
      {/* Ngày + badge âm lịch */}
      <div className="text-sm text-slate-600 mt-2 flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2" /></svg>
        {formatEventDate(ev)}
        {ev.calendar === "lunar" && <span className="text-[10px] text-amber-700 font-bold">ÂL</span>}
      </div>
      {/* Lặp lại + branch */}
      <div className="text-xs text-slate-500 mt-1">{formatRepeat(ev)} · {ev.branch || (ev.description ? "Tự tạo" : "")}</div>
    </article>
  )
}
