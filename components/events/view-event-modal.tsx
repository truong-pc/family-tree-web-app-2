"use client"

/**
 * view-event-modal.tsx
 * Modal xem chi tiết sự kiện.
 * - Dùng shadcn Dialog (DialogContent overflow-hidden p-0, nội dung trong div overflow-y-auto)
 * - Với event birthday/death: fetch getPersonDetail() để hiển thị thông tin chi tiết người
 *   (avatar, ngày sinh/mất, mô tả, cha mẹ, vợ/chồng, con cái)
 * - Với event custom: chỉ hiển thị metadata + mô tả
 */

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuthStore } from "@/lib/stores/auth-store"
import { getPersonDetail } from "@/lib/api/person"
import type { FamilyEvent } from "@/lib/api/events"
import { getEventMeta, formatEventDate, formatRepeat } from "./event-helpers"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

// --- Types cho person detail API response ---
interface PersonRelation {
  personId: number
  name: string
  gender: string
  birthOrder?: number
  spouseOrder?: number
  childOrder?: number
}

interface PersonDetail {
  personId: number
  name: string
  gender: string
  level: number
  dob: string | null
  dod: string | null
  description: string | null
  photoUrl: string | null
  lunarDeathDay: number | null
  lunarDeathMonth: number | null
  lunarDeathYear: number | null
  lunarIsLeap: boolean
  parents: PersonRelation[]
  spouses: PersonRelation[]
  children: PersonRelation[]
}

interface ViewEventModalProps {
  ev: FamilyEvent | null // null = modal đóng
  chartId: string
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function ViewEventModal({
  ev,
  chartId,
  onClose,
  onEdit,
  onDelete,
}: ViewEventModalProps) {
  const { token } = useAuthStore()

  // State cho person detail (chỉ dùng khi event là birthday/death)
  const [person, setPerson] = useState<PersonDetail | null>(null)
  const [personLoading, setPersonLoading] = useState(false)
  const [personError, setPersonError] = useState<string | null>(null)

  const isOpen = !!ev
  const isCustom = ev?.type === "custom"
  const meta = getEventMeta(ev?.type)
  // Kèm ?focus=<personId> để trang tree tự zoom vào node người này khi mở.
  const treeUrl = ev?.personId
    ? `/dashboard/${chartId}/tree?focus=${ev.personId}`
    : `/dashboard/${chartId}/tree`

  /**
   * Fetch person detail khi modal mở cho event birthday/death.
   * Sử dụng AbortController để cancel nếu modal đóng trước khi fetch xong.
   */
  useEffect(() => {
    // Reset state khi đóng modal hoặc đổi event
    setPerson(null)
    setPersonError(null)
    setPersonLoading(false)

    if (!ev || isCustom || !ev.personId || !token) return

    const controller = new AbortController()
    setPersonLoading(true)

    getPersonDetail(token, chartId, ev.personId)
      .then((data) => {
        if (!controller.signal.aborted) {
          setPerson(data as PersonDetail)
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.error("Fetch person detail error:", err)
          setPersonError("Không thể tải thông tin chi tiết người này.")
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setPersonLoading(false)
      })

    return () => controller.abort()
  }, [ev, isCustom, token, chartId])

  // Không render gì nếu không có event
  if (!ev) {
    return (
      <Dialog open={false} onOpenChange={() => { }}>
        <DialogContent className="overflow-hidden p-0" showCloseButton={false}>
          <DialogTitle className="sr-only">Sự kiện</DialogTitle>
          <DialogDescription className="sr-only">Chi tiết sự kiện</DialogDescription>
        </DialogContent>
      </Dialog>
    )
  }

  /** Hiển thị giới tính dạng text */
  const genderLabel = (g: string) => (g === "M" ? "Nam" : g === "F" ? "Nữ" : "Khác")

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent
        className="overflow-hidden p-0 rounded-3xl max-w-lg border border-slate-100"
        showCloseButton={false}
      >
        {/* Ẩn title/description cho accessibility (nội dung tự custom) */}
        <DialogTitle className="sr-only">{ev.title}</DialogTitle>
        <DialogDescription className="sr-only">Chi tiết sự kiện {ev.title}</DialogDescription>

        <div className="overflow-y-auto max-h-[85vh]">
          {/* ====== Header gradient ====== */}
          <div className="px-7 pt-7 pb-6 relative" style={{ background: `linear-gradient(135deg, ${meta.gradientFrom}, #fff)` }}>
            {/* Nút đóng */}
            <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-lg hover:bg-white/80 grid place-items-center transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
            {/* Badge loại sự kiện */}
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${meta.bgClass} ${meta.textClass} border ${meta.borderClass}`}>
              {meta.icon} {meta.label}
            </div>
            <h2 className="font-bold text-3xl mt-3 leading-tight text-slate-900">{ev.title}</h2>
            {/* Badges: ngày, loại lịch, lặp lại */}
            <div className="mt-3 flex items-center gap-2 flex-wrap text-sm">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/70 border border-slate-200 font-semibold text-slate-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></svg>
                {formatEventDate(ev)}
              </span>
              {ev.calendar === "lunar"
                ? <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-100 text-amber-700 font-bold text-xs">Âm lịch</span>
                : <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 font-bold text-xs">Dương lịch</span>
              }
              <span className="px-2.5 py-1 rounded-lg bg-white/70 border border-slate-200 text-xs font-semibold text-slate-700">{formatRepeat(ev)}</span>
            </div>
          </div>

          {/* ====== Body ====== */}
          <div className="px-7 py-6 space-y-5">
            {/* --- Person detail cho birthday/death --- */}
            {!isCustom && (
              <>
                {personLoading && (
                  <div className="space-y-3 animate-pulse">
                    <div className="h-16 rounded-xl bg-slate-100" />
                    <div className="h-10 rounded-xl bg-slate-100" />
                    <div className="h-10 rounded-xl bg-slate-100" />
                  </div>
                )}

                {personError && (
                  <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
                    {personError}
                  </div>
                )}

                {person && (
                  <div className="space-y-4">
                    {/* Thông tin cơ bản: avatar + tên + giới tính */}
                    <div className="rounded-xl border border-slate-100 p-4 flex items-center justify-between gap-4 bg-white">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        {person.photoUrl ? (
                          <img
                            src={person.photoUrl}
                            alt={person.name}
                            className="w-14 h-14 rounded-full object-cover border-2 border-slate-200"
                          />
                        ) : (
                          <div className={`w-14 h-14 rounded-full grid place-items-center font-bold text-lg flex-shrink-0 ${meta.iconBg} ${meta.iconText}`}>
                            {person.name.split(" ").slice(-2).map((s) => s[0]).join("")}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-base text-slate-900">{person.name}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>{genderLabel(person.gender)}</span>
                            {person.level && <span>· Đời {person.level}</span>}
                          </div>
                          {/* Ngày sinh / ngày mất */}
                          <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3">
                            {person.dob && <span>Sinh: {person.dob}</span>}
                            {person.dod && <span>Mất: {person.dod}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Số thứ tự sinh (birthOrder) */}
                      {(() => {
                        const mainBirthOrder = person.parents.find(p => p.birthOrder != null)?.birthOrder
                        if (!mainBirthOrder) return null
                        return (
                          <span className="flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 border border-amber-100 text-amber-700">
                            {mainBirthOrder === 1 ? "Con trưởng" : `Con thứ ${mainBirthOrder}`}
                          </span>
                        )
                      })()}
                    </div>

                    {/* Ngày giỗ âm lịch (nếu có) */}
                    {person.lunarDeathDay && person.lunarDeathMonth && (
                      <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-4 py-3">
                        <div className="text-[10px] uppercase tracking-wider font-bold text-amber-700">Giỗ âm lịch</div>
                        <div className="font-semibold text-sm text-amber-900 mt-0.5">
                          {person.lunarDeathDay}/{person.lunarDeathMonth}
                          {person.lunarDeathYear ? ` năm ${person.lunarDeathYear}` : ""}
                          {person.lunarIsLeap ? " (tháng nhuận)" : ""}
                        </div>
                      </div>
                    )}

                    {/* Mô tả người */}
                    {person.description && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Mô tả</div>
                        <p className="text-sm text-slate-700 leading-relaxed">{person.description}</p>
                      </div>
                    )}

                    {/* Cha mẹ */}
                    {person.parents.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1.5">Cha mẹ</div>
                        <div className="space-y-1.5">
                          {person.parents.map((p) => (
                            <div key={p.personId} className="rounded-lg border border-slate-100 bg-white px-3 py-2 flex items-center gap-2 text-sm">
                              <span className={`w-7 h-7 rounded-full grid place-items-center text-[10px] font-bold ${p.gender === "M" ? "bg-blue-50 text-blue-700" : "bg-pink-50 text-pink-700"}`}>
                                {p.gender === "M" ? "♂" : "♀"}
                              </span>
                              <span className="font-semibold text-slate-900">{p.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Vợ / Chồng (sắp xếp theo spouseOrder) */}
                    {person.spouses.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1.5">Vợ / Chồng</div>
                        <div className="space-y-1.5">
                          {[...person.spouses]
                            .sort((a, b) => (a.spouseOrder ?? 0) - (b.spouseOrder ?? 0))
                            .map((s) => (
                              <div key={s.personId} className="rounded-lg border border-slate-100 bg-white px-3 py-2 flex items-center gap-2 text-sm">
                                <span className={`w-7 h-7 rounded-full grid place-items-center text-[10px] font-bold ${s.gender === "M" ? "bg-blue-50 text-blue-700" : "bg-pink-50 text-pink-700"}`}>
                                  {s.gender === "M" ? "♂" : "♀"}
                                </span>
                                <span className="font-semibold text-slate-900">{s.name}</span>
                                <span className="text-[10px] text-slate-400 ml-auto">
                                  {s.gender === "M" ? `` : (s.spouseOrder === 1 ? "Vợ cả" : `Vợ ${s.spouseOrder}`)}
                                </span>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    )}

                    {/* Con cái (sắp xếp theo childOrder) */}
                    {person.children.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1.5">Con cái ({person.children.length})</div>
                        <div className="space-y-1.5">
                          {[...person.children]
                            .sort((a, b) => (a.childOrder ?? 0) - (b.childOrder ?? 0))
                            .map((c) => (
                              <div key={c.personId} className="rounded-lg border border-slate-100 bg-white px-3 py-2 flex items-center gap-2 text-sm">
                                <span className={`w-7 h-7 rounded-full grid place-items-center text-[10px] font-bold ${c.gender === "M" ? "bg-blue-50 text-blue-700" : "bg-pink-50 text-pink-700"}`}>
                                  {c.gender === "M" ? "♂" : "♀"}
                                </span>
                                <span className="font-semibold text-slate-900">{c.name}</span>
                                <span className="text-[10px] text-slate-400 ml-auto">
                                  {c.childOrder ? `Thứ ${c.childOrder}` : ""}
                                </span>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Fallback nếu không có personId hoặc fetch chưa chạy */}
                {!personLoading && !personError && !person && (
                  <Link href={treeUrl} className="block hover:opacity-95 transition-opacity">
                    <div className="rounded-xl border border-slate-100 p-4 flex items-center gap-3 bg-white">
                      <div className={`w-12 h-12 rounded-full grid place-items-center font-bold ${meta.iconBg} ${meta.iconText}`}>
                        {ev.title.split(" ").slice(-2).map((s) => s[0]).join("")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-slate-900">
                          {ev.title.replace("Sinh nhật ", "").replace("Giỗ ", "").replace(" (Thủy Tổ)", "")}
                        </div>
                        <div className="text-xs text-slate-500">
                          {ev.branch}{ev.generation ? ` · Đời ${ev.generation}` : ""}
                        </div>
                      </div>
                    </div>
                  </Link>
                )}
              </>
            )}

            {/* Mô tả sự kiện (cho cả custom và birthday/death nếu event có description) */}
            {ev.description && (
              <div>
                <div className="text-[11px] uppercase tracking-[.18em] font-bold text-amber-600/90 mb-2">Mô tả</div>
                <p className="text-sm text-slate-700 leading-relaxed">{ev.description}</p>
              </div>
            )}


            {/* ====== Actions ====== */}
            {isCustom ? (
              <div className="flex gap-2 pt-2">
                <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors">Đóng</button>
                <button onClick={onDelete} className="px-4 py-2.5 rounded-lg font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors">Xóa</button>
                <button onClick={onEdit} className="px-4 py-2.5 rounded-lg font-semibold text-white transition-colors" style={{ background: "linear-gradient(135deg,#1d4ed8,#2563eb)" }}>Sửa sự kiện</button>
              </div>
            ) : (
              <div className="flex gap-2 pt-2">
                <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors">Đóng</button>
                <Link href={treeUrl} className="px-4 py-2.5 rounded-lg font-semibold text-white inline-flex items-center gap-2 transition-colors" style={{ background: "linear-gradient(135deg,#1d4ed8,#2563eb)" }}>
                  Mở phả hệ
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
                </Link>
              </div>
            )}

            {/* Ghi chú cho event tự sinh từ phả hệ */}
            {!isCustom && (
              <div className="text-[11px] text-slate-500 -mt-2">
                Đây là sự kiện <strong>tự sinh</strong> từ phả hệ — để sửa, hãy cập nhật ngày sinh / ngày mất của thành viên tương ứng.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
