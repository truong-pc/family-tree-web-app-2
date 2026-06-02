"use client"

/**
 * lunar-calendar-banner.tsx
 * Banner lịch âm dương hôm nay — hiển thị nổi bật đầu trang Events.
 * Layout grid 12 cột:
 * - Trái (4 col): Ngày dương lịch (số lớn) + tháng/năm + thứ
 * - Giữa (4 col): Ngày âm lịch + can chi ngày/tháng/năm
 * - Phải (4 col): Tử vi & vạn sự (hành, sao, tiết khí, bách kỵ)
 * - Dưới (12 col): Giờ hoàng đạo + tuổi xung
 * Gradient: teal → amber, glassmorphism cards
 */

import type { CalendarToday } from "@/lib/api/events"

export default function LunarCalendarBanner({ data }: { data: CalendarToday }) {
  return (
    <div
      className="rounded-3xl overflow-hidden relative shadow-md border border-teal-800/10"
      style={{ background: "linear-gradient(135deg, #134e4a 0%, #0d9488 45%, #a16207 100%)", color: "white" }}
    >
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full pointer-events-none" style={{ background: "rgba(212,165,116,.42)", filter: "blur(70px)" }} />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full pointer-events-none" style={{ background: "rgba(13,148,136,.45)", filter: "blur(60px)" }} />
      <div className="absolute inset-0 opacity-[.04] pointer-events-none" style={{ backgroundImage: "repeating-linear-gradient(90deg, white 0 1px, transparent 1px 32px)" }} />

      <div className="relative grid grid-cols-12 gap-6 p-6 lg:p-8">
        {/* LEFT: Solar */}
        <div className="col-span-12 md:col-span-4">
          <div className="text-[11px] uppercase tracking-[.18em] font-bold text-amber-200/90">DƯƠNG LỊCH</div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 md:flex-col md:items-start md:gap-2 mt-1">
            <div className="flex items-stretch gap-3">
              <div
                className="font-black leading-none"
                style={{ fontFamily: '"Be Vietnam Pro"', fontSize: "112px", lineHeight: 1, letterSpacing: "-3px", fontFeatureSettings: '"lnum" 1, "tnum" 1' }}
              >
                {data.solar.day}
              </div>
              <div className="flex flex-col justify-between py-1.5">
                <div className="font-bold leading-none" style={{ fontFamily: '"Be Vietnam Pro"', fontSize: "28px", marginTop: "14px" }}>
                  Tháng {data.solar.month}
                </div>
                <div
                  className="leading-none"
                  style={{ fontFamily: '"Be Vietnam Pro"', fontWeight: 900, fontSize: "34px", lineHeight: 1.1, color: "#fcd34d", letterSpacing: "-0.5px" }}
                >
                  {data.solar.year}
                </div>
              </div>
            </div>
            <div className="text-[11px] uppercase tracking-[.22em] font-bold text-white/95 md:mt-1">{data.solar.weekday}</div>
          </div>
        </div>

        {/* CENTER: Lunar */}
        <div className="col-span-12 md:col-span-4 md:border-l md:border-white/15 md:pl-7">
          <div className="text-[11px] uppercase tracking-[.18em] font-bold text-amber-200/90">ÂM LỊCH</div>
          <div className="flex items-stretch gap-3 mt-1">
            <div
              className="font-black leading-none"
              style={{ fontFamily: '"Be Vietnam Pro"', fontSize: "112px", lineHeight: 1, letterSpacing: "-3px", fontFeatureSettings: '"lnum" 1, "tnum" 1' }}
            >
              {data.lunar.day}
            </div>
            <div className="flex flex-col justify-between py-1.5">
              <div className="font-bold leading-none" style={{ fontFamily: '"Be Vietnam Pro"', fontSize: "28px", marginTop: "14px" }}>
                Tháng {data.lunar.month}{data.lunar.isLeap ? " (nhuận)" : ""}
              </div>
              <div
                className="leading-none"
                style={{ fontFamily: '"Be Vietnam Pro"', fontWeight: 900, fontSize: "34px", lineHeight: 1.1, color: "#fcd34d", letterSpacing: "-0.5px" }}
              >
                {data.lunar.year}
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              { label: "Ngày", value: data.lunar.dayCanChi },
              { label: "Tháng", value: data.lunar.monthCanChi },
              { label: "Năm", value: data.lunar.yearCanChi },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/15 px-3 py-2.5" style={{ background: "rgba(255,255,255,.10)", backdropFilter: "blur(8px)" }}>
                <div className="text-[9px] uppercase tracking-wider font-bold text-amber-200/90">{item.label}</div>
                <div className="font-bold text-base mt-0.5 truncate">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Tử Vi & Vạn Sự */}
        <div className="col-span-12 md:col-span-4 md:border-l md:border-white/15 md:pl-7">
          <div className="text-[11px] uppercase tracking-[.18em] font-bold text-amber-200/90">TỬ VI &amp; VẠN SỰ</div>
          <div className="font-bold text-base mt-1 text-amber-100">Ngày {data.lucDieu}</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { label: "Hành", value: data.hanh, warning: false },
              { label: "Sao", value: data.sao, warning: false },
              { label: "Tiết khí", value: data.tiet, warning: false },
              { label: "Bách kỵ", value: data.bachKy, warning: true },
            ].map((item) => (
              <div
                key={item.label}
                className={`rounded-xl border px-3 py-2 ${item.warning ? "border-red-300/30 text-amber-50" : "border-white/15"}`}
                style={{ background: item.warning ? "rgba(248,113,113,.15)" : "rgba(255,255,255,.10)", backdropFilter: "blur(8px)" }}
              >
                <div className="text-[9px] uppercase tracking-wider font-bold text-amber-200/90">{item.label}</div>
                <div className="font-bold text-sm mt-0.5 truncate">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM: Giờ Hoàng Đạo + Tuổi Xung */}
        <div className="col-span-12 mt-2 pt-5 border-t border-white/15 grid grid-cols-12 gap-5">
          <div className="col-span-12 lg:col-span-7">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[.18em] font-bold text-amber-200/90 mb-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
              Giờ Hoàng Đạo
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.gioTot.map((g) => (
                <span key={g} className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: "rgba(255,255,255,.10)", border: "1px solid rgba(255,255,255,.15)", backdropFilter: "blur(8px)" }}>{g}</span>
              ))}
            </div>
          </div>
          <div className="col-span-12 lg:col-span-5">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[.18em] font-bold text-amber-200/90 mb-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><circle cx="12" cy="12" r="9" /><path d="m5 5 14 14" /></svg>
              Tuổi Xung
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.tuoiXung.map((t) => (
                <span key={t} className="px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-50" style={{ background: "rgba(248,113,113,.15)", border: "1px solid rgba(252,165,165,.30)", backdropFilter: "blur(8px)" }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
