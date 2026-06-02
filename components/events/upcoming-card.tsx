"use client"

/**
 * upcoming-card.tsx
 * Card hiển thị sự kiện sắp tới (upcoming).
 * - Nếu hôm nay: card gradient đặc biệt (xanh + vàng) với badge "HÔM NAY"
 * - Nếu tương lai: card glass morphism thường, hiển thị số ngày còn lại
 * - Click vào card → onClick (mở modal xem chi tiết)
 */

import type { UpcomingEvent } from "@/lib/api/events"
import { getEventMeta, formatEventDate, formatRepeat, daysUntilLabel } from "./event-helpers"

export default function UpcomingCard({ ev, onClick }: { ev: UpcomingEvent; onClick: () => void }) {
  const meta = getEventMeta(ev.type)
  const isToday = ev.daysUntil === 0

  // --- Card đặc biệt cho sự kiện hôm nay ---
  if (isToday) {
    return (
      <article
        onClick={onClick}
        className="rounded-2xl overflow-hidden relative cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
        style={{ background: "linear-gradient(135deg,#1e40af 0%, #3b82f6 60%, #f59e0b 110%)", color: "white" }}
      >
        {/* Blob trang trí góc phải */}
        <div className="absolute -top-16 -right-12 w-44 h-44 rounded-full pointer-events-none" style={{ background: "rgba(245,158,11,.35)", filter: "blur(50px)" }} />
        <div className="relative p-5">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-300/30" style={{ background: "rgba(251,191,36,.20)", color: "#fde68a" }}>HÔM NAY</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1" style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.20)" }}>
              {meta.icon} {meta.label}
            </span>
          </div>
          <h4 className="font-bold text-xl leading-tight mt-3">{ev.title}</h4>
          <p className="text-blue-100/90 text-xs mt-1.5">{formatEventDate(ev)} · {ev.branch || formatRepeat(ev)}</p>
          <button className="mt-4 px-3.5 py-2 rounded-lg font-semibold text-blue-900 text-xs hover:opacity-90 transition" style={{ background: "#fbbf24" }}>Xem chi tiết</button>
        </div>
      </article>
    )
  }

  // --- Card thường cho sự kiện tương lai ---
  return (
    <article
      onClick={onClick}
      className="rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      style={{ background: "rgba(255,255,255,.60)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,.60)", boxShadow: "0 1px 2px rgba(15,23,42,.04), 0 8px 24px -12px rgba(15,23,42,.08)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`w-10 h-10 rounded-xl grid place-items-center ${meta.iconBg} ${meta.iconText}`}>{meta.icon}</div>
        {/* Badge đếm ngược */}
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${meta.bgClass} ${meta.textClass} border ${meta.borderClass}`}>
          {daysUntilLabel(ev.daysUntil)}
        </span>
      </div>
      <h4 className="font-bold text-[15px] leading-snug mt-3 line-clamp-2 text-slate-900">{ev.title}</h4>
      <div className="text-xs text-slate-500 mt-1.5">{formatEventDate(ev)}</div>
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="font-mono text-slate-400">{ev.occurrenceDate}</span>
        <span className="font-semibold text-blue-700">Xem →</span>
      </div>
    </article>
  )
}
