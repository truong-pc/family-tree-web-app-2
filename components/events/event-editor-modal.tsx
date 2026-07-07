"use client"

/**
 * event-editor-modal.tsx
 * Modal tạo / sửa sự kiện custom.
 * - Dùng shadcn Dialog (overflow-hidden p-0 + div overflow-y-auto bên trong)
 * - Khi chọn dương lịch: input date native + validate năm 1900–2200
 * - Khi chọn âm lịch: 3 input ngày/tháng/năm thủ công (backend đã validate)
 * - Validate client-side: title bắt buộc, max 200 ký tự, ngày/tháng/năm hợp lệ
 */

import { useState, useEffect } from "react"
import { Check } from "lucide-react"
import type { FamilyEvent } from "@/lib/api/events"
import { formatRepeat } from "./event-helpers"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/** Dữ liệu form tạo/sửa sự kiện */
export type EventForm = {
  title: string
  description: string
  day: number
  month: number
  year: number
  calendar: "solar" | "lunar"
  repeat: "yearly" | "once"
  isLeapMonth: boolean
}

interface EventEditorModalProps {
  open: boolean // controlled open/close từ parent
  ev: FamilyEvent | null // null = tạo mới, có giá trị = sửa
  onClose: () => void
  onSave: (form: EventForm) => void
}

export default function EventEditorModal({ open, ev, onClose, onSave }: EventEditorModalProps) {
  const isEdit = !!ev

  // Form state 
  const [form, setForm] = useState<{
    title: string
    description: string
    day: number | ""
    month: number | ""
    year: number | ""
    calendar: "solar" | "lunar"
    repeat: "yearly" | "once"
    isLeapMonth: boolean
  }>({
    title: "", description: "",
    day: "", month: "", year: "",
    calendar: "lunar", repeat: "yearly", isLeapMonth: false
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [solarDateStr, setSolarDateStr] = useState("")

  /** Khởi tạo form khi modal mở hoặc khi event thay đổi */
  useEffect(() => {
    if (!open) return
    if (ev) {
      // Chế độ sửa: điền dữ liệu từ event hiện tại
      setForm({
        title: ev.title,
        description: ev.description || "",
        day: ev.day, month: ev.month, year: ev.year,
        calendar: ev.calendar, repeat: ev.repeat,
        isLeapMonth: ev.isLeapMonth || false,
      })
      if (ev.calendar === "solar") {
        setSolarDateStr(`${ev.year}-${String(ev.month).padStart(2, "0")}-${String(ev.day).padStart(2, "0")}`)
      } else {
        setSolarDateStr("")
      }
    } else {
      // Chế độ tạo mới: reset form
      setForm({
        title: "", description: "",
        day: "", month: "", year: "",
        calendar: "lunar", repeat: "yearly", isLeapMonth: false,
      })
      setSolarDateStr("")
    }
    setErrors({})
  }, [open, ev])

  /** Cập nhật 1 field trong form */
  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const handleSolarDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSolarDateStr(val)

    if (!val) {
      update("day", "")
      update("month", "")
      update("year", "")
      return
    }

    const parts = val.split("-")
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10)
      const day = parseInt(parts[2], 10)

      // Chỉ cập nhật form state khi năm được nhập đầy đủ (>= 1000)
      if (year >= 1000 && year <= 9999) {
        update("year", year)
        update("month", month)
        update("day", day)
      }
    }
  }

  // Submit & Validate 
  const handleSubmit = () => {
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = "Bắt buộc nhập tên sự kiện"
    if (form.title.length > 200) e.title = "Tối đa 200 ký tự"

    let dayVal = Number(form.day)
    let monthVal = Number(form.month)
    let yearVal = Number(form.year)

    if (form.calendar === "lunar") {
      // Validate ngày âm lịch thủ công
      if (form.day === "" || form.day < 1 || form.day > 30) {
        e.day = "Ngày hợp lệ từ 1 đến 30"
      }
      if (form.month === "" || form.month < 1 || form.month > 12) {
        e.month = "Tháng hợp lệ từ 1 đến 12"
      }
      if (form.year === "" || form.year < 1900 || form.year > 2200) {
        e.year = "Năm hợp lệ từ 1900 đến 2200"
      }
    } else {
      // Validate ngày dương lịch 
      const parts = solarDateStr.split("-")
      yearVal = Number(parts[0])
      monthVal = Number(parts[1])
      dayVal = Number(parts[2])
      if (parts.length !== 3 || !dayVal || !monthVal || !yearVal) {
        e.date = "Vui lòng chọn ngày dương lịch"
      } else if (yearVal < 1900 || yearVal > 2200) {
        e.date = "Năm hợp lệ từ 1900 đến 2200"
      }
    }

    setErrors(e)
    if (Object.keys(e).length === 0) {
      onSave({
        title: form.title,
        description: form.description,
        day: dayVal,
        month: monthVal,
        year: yearVal,
        calendar: form.calendar,
        repeat: form.repeat,
        isLeapMonth: form.isLeapMonth,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent
        className="overflow-hidden p-0 rounded-3xl max-w-2xl border border-slate-100"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">{isEdit ? "Sửa sự kiện" : "Tạo sự kiện mới"}</DialogTitle>
        <DialogDescription className="sr-only">Form tạo hoặc sửa sự kiện gia phả</DialogDescription>

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="overflow-y-auto max-h-[85vh]">
          {/* Header */}
          <div className="px-7 pt-7 pb-3 relative">
            <div className="text-[11px] uppercase tracking-[.18em] font-bold text-amber-600/90">{isEdit ? "Sửa sự kiện" : "Tạo sự kiện mới"}</div>
            <h2 className="font-bold text-2xl mt-1 text-slate-900">{isEdit ? "Cập nhật thông tin" : "Thêm sự kiện cho dòng họ"}</h2>
            <p className="text-sm text-slate-500 mt-1">Sự kiện tự tạo: họp họ, lễ tộc, khánh thành. Không dùng cho sinh nhật/giỗ (lấy từ phả hệ).</p>
          </div>

          <div className="px-7 py-6 space-y-5">
            {/* Tên sự kiện  */}
            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <Label htmlFor="event-title" className="text-xs font-bold uppercase tracking-wider text-slate-600">Tên sự kiện <span className="text-red-500">*</span></Label>
              </div>
              <Input
                id="event-title"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                maxLength={200}
                required
                placeholder="VD: Họp họ đầu năm Bính Thân"
                aria-invalid={!!errors.title}
                className={`px-3 py-2.5 h-auto rounded-lg bg-white shadow-none focus-visible:ring-blue-500/20 ${errors.title ? "border-red-300" : "border-slate-200 focus-visible:border-blue-500"}`}
              />
              {errors.title && <div className="text-xs text-red-600 mt-1">{errors.title}</div>}
              <div className="text-[11px] text-slate-400 mt-1 text-right">{form.title.length}/200</div>
            </div>

            {/* Mô tả */}
            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <Label htmlFor="event-description" className="text-xs font-bold uppercase tracking-wider text-slate-600">Mô tả</Label>
                <span className="text-[10px] text-slate-400">Tùy chọn · tối đa 2000 ký tự</span>
              </div>
              <Textarea
                id="event-description"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                maxLength={2000}
                rows={3}
                placeholder="VD: Tập trung tại nhà thờ tổ lúc 9h sáng, mời toàn thể con cháu các chi…"
                className="px-3 py-2.5 rounded-lg border-slate-200 bg-white resize-none shadow-none field-sizing-fixed min-h-0 focus-visible:border-blue-500 focus-visible:ring-blue-500/20"
              />
            </div>

            {/* Loại lịch toggle */}
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">Loại lịch <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-2 gap-2">
                {/* Nút Âm lịch */}
                <button
                  type="button"
                  onClick={() => update("calendar", "lunar")}
                  className={`px-4 py-3 rounded-lg border-2 text-left transition-colors ${form.calendar === "lunar" ? "border-amber-500 bg-amber-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">Âm lịch</span>
                    {form.calendar === "lunar" && <div className="w-5 h-5 rounded-full bg-amber-500 grid place-items-center"><Check size={12} strokeWidth={3} className="text-white" /></div>}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Giỗ chạp, lễ tổ truyền thống</div>
                </button>
                {/* Nút Dương lịch */}
                <button
                  type="button"
                  onClick={() => {
                    update("calendar", "solar")
                    if (form.day && form.month && form.year) {
                      setSolarDateStr(`${form.year}-${String(form.month).padStart(2, "0")}-${String(form.day).padStart(2, "0")}`)
                    } else {
                      setSolarDateStr("")
                    }
                  }}
                  className={`px-4 py-3 rounded-lg border-2 text-left transition-colors ${form.calendar === "solar" ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">Dương lịch</span>
                    {form.calendar === "solar" && <div className="w-5 h-5 rounded-full bg-blue-500 grid place-items-center"><Check size={12} strokeWidth={3} className="text-white" /></div>}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Sinh nhật, sự kiện hiện đại</div>
                </button>
              </div>
            </div>

            {/* Date inputs */}
            {form.calendar === "solar" ? (
              /* Dương lịch: Input Date native */
              <div>
                <Label htmlFor="event-solar-date" className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                  Ngày dương lịch <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="event-solar-date"
                  type="date"
                  required
                  value={solarDateStr}
                  onChange={handleSolarDateChange}
                  aria-invalid={!!errors.date}
                  className={`px-3 py-2.5 h-auto rounded-lg bg-white shadow-none transition-colors focus-visible:ring-blue-500/20 ${errors.date ? "border-red-300" : "border-slate-200 focus-visible:border-blue-500"}`}
                />
                {errors.date && <div className="text-xs text-red-600 mt-1">{errors.date}</div>}
                {/* Hiển thị ngày đang chọn */}
                {form.day && form.month && form.year && (
                  <div className="text-[11px] text-slate-400 mt-1">
                    Đã chọn: {String(form.day).padStart(2, "0")}/{String(form.month).padStart(2, "0")}/{form.year}
                  </div>
                )}
              </div>
            ) : (
              /* Âm lịch: 3 input thủ công */
              <>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="event-lunar-day" className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">Ngày <span className="text-red-500">*</span></Label>
                  <Input
                    id="event-lunar-day"
                    type="number" min={1} max={30}
                    placeholder="Ngày"
                    value={form.day}
                    onChange={(e) => update("day", e.target.value ? Number(e.target.value) : "")}
                    aria-invalid={!!errors.day}
                    className={`px-3 py-2.5 h-auto rounded-lg bg-white shadow-none ${errors.day ? "border-red-300" : "border-slate-200"}`}
                  />
                  {errors.day && <div className="text-xs text-red-600 mt-1">{errors.day}</div>}
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">Tháng <span className="text-red-500">*</span></Label>
                  <Select
                    value={form.month ? String(form.month) : ""}
                    onValueChange={(val) => update("month", val ? Number(val) : "")}
                  >
                    <SelectTrigger className={`w-full px-3 py-2.5 rounded-lg border text-sm bg-white data-[size=default]:h-auto ${errors.month ? "border-red-300 focus:ring-red-500/20" : "border-slate-200 focus:ring-blue-500/20"}`}>
                      <SelectValue placeholder="Chọn tháng" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <SelectItem key={m} value={String(m)}>
                          Tháng {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.month && <div className="text-xs text-red-600 mt-1">{errors.month}</div>}
                </div>
                <div>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <Label htmlFor="event-lunar-year" className="text-xs font-bold uppercase tracking-wider text-slate-600">Năm gốc <span className="text-red-500">*</span></Label>
                    {form.repeat === "yearly" && <span className="text-[10px] text-slate-400">tham chiếu</span>}
                  </div>
                  <Input
                    id="event-lunar-year"
                    type="number" min={1900} max={2200}
                    placeholder="Năm gốc"
                    value={form.year}
                    onChange={(e) => update("year", e.target.value ? Number(e.target.value) : "")}
                    aria-invalid={!!errors.year}
                    className={`px-3 py-2.5 h-auto rounded-lg bg-white shadow-none ${errors.year ? "border-red-300" : "border-slate-200"}`}
                  />
                  {errors.year && <div className="text-xs text-red-600 mt-1">{errors.year}</div>}
                </div>
              </div>
              {/* Tháng nhuận (chỉ âm lịch) */}
              <div className="flex items-center gap-2.5 mt-3 select-none">
                <Checkbox
                  id="event-leap-month"
                  checked={form.isLeapMonth}
                  onCheckedChange={(checked) => update("isLeapMonth", checked === true)}
                  className="size-5 rounded border-2 border-slate-300 shadow-none hover:border-slate-400"
                />
                <Label htmlFor="event-leap-month" className="text-sm text-slate-700 font-medium cursor-pointer">Tháng nhuận</Label>
                <span className="text-[10px] text-slate-400">(nếu tháng âm lịch này là tháng nhuận)</span>
              </div>
              </>
            )}

            {/* Lặp lại */}
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">Lặp lại <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => update("repeat", "yearly")} className={`px-4 py-3 rounded-lg border-2 text-left transition-colors ${form.repeat === "yearly" ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                  <div className="font-bold text-sm text-slate-900">Hàng năm</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Mỗi năm vào cùng ngày/tháng</div>
                </button>
                <button type="button" onClick={() => update("repeat", "once")} className={`px-4 py-3 rounded-lg border-2 text-left transition-colors ${form.repeat === "once" ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                  <div className="font-bold text-sm text-slate-900">Một lần</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Chỉ vào đúng năm này</div>
                </button>
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-xl p-4 border-2 border-dashed border-slate-200 bg-slate-50">
              <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-2">Xem trước</div>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-50 border border-amber-100 p-2.5 text-center min-w-[64px]">
                  <div className="font-black text-2xl text-amber-800 leading-none">
                    {form.day ? String(form.day).padStart(2, "0") : "--"}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-amber-700 mt-1">
                    {form.calendar === "lunar"
                      ? `Th.${form.month ? String(form.month).padStart(2, "0") : "--"} ÂL`
                      : `Th.${form.month ? String(form.month).padStart(2, "0") : "--"}`}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate text-slate-900">{form.title || "Tên sự kiện"}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{formatRepeat({ repeat: form.repeat })} · Năm gốc {form.year || "----"}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="px-7 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} className="px-5 py-2.5 h-auto rounded-lg font-semibold border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-700 shadow-none">Hủy</Button>
            <Button type="submit" className="px-5 py-2.5 h-auto rounded-lg font-semibold text-white shadow-md gap-2 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:brightness-100" style={{ background: "linear-gradient(135deg,#1d4ed8,#2563eb)" }}>
              <Check size={16} strokeWidth={2.4} />
              {isEdit ? "Lưu thay đổi" : "Tạo sự kiện"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
