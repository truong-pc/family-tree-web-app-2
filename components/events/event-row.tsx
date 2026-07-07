"use client"

/**
 * event-row.tsx
 * Hàng hiển thị sự kiện dạng list (1 dòng ngang).
 * - Bên trái: block ngày/tháng có màu theo loại sự kiện
 * - Giữa: badge loại, tiêu đề, branch/mô tả
 * - Bên phải: nút sửa/xóa (chỉ cho custom)
 * - Click vào hàng → onView
 */

import { Pencil, Trash2 } from "lucide-react"
import type { FamilyEvent } from "@/lib/api/events"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getEventMeta, formatRepeat } from "./event-helpers"

export default function EventRow({
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
      className="rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg bg-card"
      style={{ background: "rgba(255,255,255,.60)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,.60)", boxShadow: "0 1px 2px rgba(15,23,42,.04), 0 8px 24px -12px rgba(15,23,42,.08)" }}
      onClick={onView}
    >
      {/* Block ngày/tháng bên trái */}
      <div className={`rounded-xl p-3 text-center min-w-[78px] ${meta.bgClass} border ${meta.borderClass}`}>
        <div className={`font-black text-2xl leading-none ${meta.textClass}`}>{String(ev.day).padStart(2, "0")}</div>
        <div className={`text-[10px] uppercase tracking-wider font-bold ${meta.textClass} mt-1.5`}>
          {ev.calendar === "lunar" ? `Th.${String(ev.month).padStart(2, "0")} ÂL` : `Th.${String(ev.month).padStart(2, "0")} DL`}
        </div>
      </div>

      {/* Thông tin giữa: badge + tiêu đề + branch */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${meta.bgClass} ${meta.textClass} ${meta.borderClass} [&>svg]:size-4`}>
            {meta.icon} {meta.label}
          </Badge>
          {ev.calendar === "lunar" && (
            <Badge variant="outline" className="px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-700 bg-amber-50 border-amber-100">ÂL</Badge>
          )}
          <span className="text-[10px] text-slate-500">{formatRepeat(ev)}</span>
        </div>
        <h3 className="font-bold text-[15px] mt-1 truncate text-slate-900">{ev.title}</h3>
        <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
          {ev.branch ? `${ev.branch}${ev.generation ? ` · Đời ${ev.generation}` : ""}` : ev.description}
        </div>
      </div>

      {/* Nút hành động bên phải */}
      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        {isCustom && (
          <>
            <Button variant="ghost" size="icon" onClick={onEdit} title="Sửa" className="rounded-lg hover:bg-amber-50 text-slate-600 hover:text-amber-700">
              <Pencil />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete} title="Xóa" className="rounded-lg hover:bg-red-50 text-slate-600 hover:text-red-700">
              <Trash2 />
            </Button>
          </>
        )}
      </div>
    </article>
  )
}
