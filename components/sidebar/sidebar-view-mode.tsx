import Image from "next/image"
import { BookOpen, Users, Plus, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PersonDetail, RelatedPerson } from "@/lib/stores/family-tree-store"

interface SidebarViewModeProps {
  detail: PersonDetail
  error: string | null
  setShowAddSpouseModal: (val: boolean) => void
  setShowAddChildModal: (val: boolean) => void
  deleteRelationship: (type: "father" | "mother" | "spouse" | "child", related: RelatedPerson) => void
  isDeletingRel: string | null
  onPersonClick?: (personId: number) => void
}

function calcAge(dob: string | null | undefined, dod: string | null | undefined): number | null {
  if (!dob) return null
  const birth = new Date(dob)
  const end = dod ? new Date(dod) : new Date()
  let age = end.getFullYear() - birth.getFullYear()
  const m = end.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) age--
  return age >= 0 ? age : null
}

function fmtDate(d: string | null | undefined) {
  if (!d) return null
  return d.split("-").reverse().join("/")
}

function spouseLabel(order: number | null | undefined, index: number, gender: string, totalSpouses: number) {
  const label = gender === "M" ? "Vợ" : gender === "F" ? "Chồng" : "Vợ/Chồng"
  if (totalSpouses < 2) return label
  const o = order ?? index + 1
  if (o === 1) return `${label} cả`
  return `${label} ${o}`
}

function childLabel(order: number | null | undefined, index: number) {
  const o = order ?? index + 1
  if (o === 1) return "Con trưởng"
  return `Con thứ ${o}`
}

export function SidebarViewMode({
  detail,
  error,
  setShowAddSpouseModal,
  setShowAddChildModal,
  deleteRelationship,
  isDeletingRel,
  onPersonClick,
}: SidebarViewModeProps) {
  const age = calcAge(detail.dob, detail.dod)

  const renderRelPerson = (
    rel: RelatedPerson,
    label: string,
    type: "father" | "mother" | "spouse" | "child",
  ) => {
    const key = `${type}-${rel.personId}`
    const deleting = isDeletingRel === key

    const iconBg = rel.gender === "M" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
      : rel.gender === "F" ? "bg-pink-100 text-pink-600 dark:bg-pink-900/50 dark:text-pink-400"
        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"

    return (
      <div
        key={key}
        className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-white/60 dark:bg-black/40 backdrop-blur-md border border-white/50 dark:border-white/10 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:bg-white/90 dark:hover:bg-white/10 transition-all group cursor-pointer"
        onClick={() => onPersonClick?.(rel.personId)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full ${iconBg} shadow-sm font-bold text-lg`}>
            {rel.gender === "M" ? "♂" : rel.gender === "F" ? "♀" : "◌"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{rel.name}</p>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mt-0.5">{label}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); deleteRelationship(type, rel); }}
          disabled={deleting}
          className="transition-all h-6 w-6 text-destructive hover:text-white hover:bg-destructive flex-shrink-0 shadow-sm"
          title="Xóa"
        >
          {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3.5 w-3.5" />}
        </Button>
      </div>
    )
  }

  return (
    <div className="relative p-5 space-y-6 z-0 overflow-hidden min-h-full">
      {/* Decorative Background Gradients */}
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-40 -right-20 w-72 h-72 bg-amber-400/20 dark:bg-amber-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-transparent via-blue-50/30 to-amber-50/30 dark:via-blue-950/10 dark:to-amber-950/10 pointer-events-none -z-10" />

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-xl text-sm font-medium shadow-sm relative z-10">
          {error}
        </div>
      )}

      {/* ── Avatar + Name + ID ── */}
      <div className="flex flex-col items-center gap-3 pb-2 relative z-10 mt-2">
        <div className="relative group">
          <div className="w-28 h-28 rounded-full overflow-hidden bg-muted border-4 border-background shadow-xl">
            <Image
              src={detail.photoUrl || "/placeholder-user.jpg"}
              alt={detail.name || "Avatar"}
              width={112}
              height={112}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </div>
          {/* Gender badge */}
          <span
            className={`absolute -bottom-1 -right-1 w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold shadow-lg border-2 border-background z-10 ${detail.gender === "M"
                ? "bg-gradient-to-br from-blue-400 to-blue-600 text-white"
                : detail.gender === "F"
                  ? "bg-gradient-to-br from-pink-400 to-rose-500 text-white"
                  : "bg-gradient-to-br from-gray-400 to-gray-600 text-white"
              }`}
          >
            {detail.gender === "M" ? "♂" : detail.gender === "F" ? "♀" : "◌"}
          </span>
        </div>
        <div className="text-center mt-2 space-y-1.5">
          <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-amber-600 dark:from-blue-400 dark:to-amber-300 leading-tight drop-shadow-sm">
            {detail.name}
          </h3>
          <span className="inline-block text-xs text-muted-foreground font-mono bg-white/60 dark:bg-black/40 backdrop-blur-md shadow-sm border border-black/5 dark:border-white/10 px-3 py-1 rounded-full">
            ID: {detail.personId}
          </span>
        </div>
      </div>

      {/* ── Info cards (2×2 grid) ── */}
      <div className="grid grid-cols-2 gap-3 relative z-10 mt-4">
        {/* Age */}
        <div className="rounded-2xl bg-white/60 dark:bg-black/40 backdrop-blur-md border border-white/50 dark:border-white/10 shadow-sm px-4 py-3.5 space-y-1 hover:shadow-md transition-all hover:-translate-y-0.5 group">
          <p className="text-[11px] uppercase tracking-wider text-blue-600/90 dark:text-blue-400/90 font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm"></span>
            {detail.dod ? "Hưởng dương" : "Tuổi"}
          </p>
          <p className="text-lg font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {age !== null ? `${age} tuổi` : "—"}
          </p>
        </div>

        {/* Level */}
        <div className="rounded-2xl bg-white/60 dark:bg-black/40 backdrop-blur-md border border-white/50 dark:border-white/10 shadow-sm px-4 py-3.5 space-y-1 hover:shadow-md transition-all hover:-translate-y-0.5 group">
          <p className="text-[11px] uppercase tracking-wider text-amber-600/90 dark:text-amber-400/90 font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm"></span>
            Đời
          </p>
          <p className="text-lg font-bold text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
            Đời thứ {detail.level}
          </p>
        </div>

        {/* DOB */}
        <div className="rounded-2xl bg-white/60 dark:bg-black/40 backdrop-blur-md border border-white/50 dark:border-white/10 shadow-sm px-4 py-3.5 space-y-1 hover:shadow-md transition-all hover:-translate-y-0.5 group">
          <p className="text-[11px] uppercase tracking-wider text-emerald-600/90 dark:text-emerald-400/90 font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm"></span>
            Ngày sinh
          </p>
          <p className="text-sm font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors mt-0.5">
            {fmtDate(detail.dob) || "—"}
          </p>
        </div>

        {/* DOD */}
        <div className="rounded-2xl bg-white/60 dark:bg-black/40 backdrop-blur-md border border-white/50 dark:border-white/10 shadow-sm px-4 py-3.5 space-y-1 hover:shadow-md transition-all hover:-translate-y-0.5 group">
          <p className="text-[11px] uppercase tracking-wider text-rose-600/90 dark:text-rose-400/90 font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-sm"></span>
            Ngày mất
          </p>
          <p className="text-sm font-bold text-foreground group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors mt-0.5">
            {fmtDate(detail.dod) || "—"}
          </p>
          {detail.lunarDeathDay != null && detail.lunarDeathMonth != null && detail.lunarDeathYear != null && (
            <p className="text-[10px] font-bold text-amber-700 bg-amber-100/80 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 rounded-md inline-block mt-1.5 shadow-sm border border-amber-200/50 dark:border-amber-800/50">
              ÂL: {detail.lunarDeathDay}/{detail.lunarDeathMonth}
              {detail.lunarIsLeap ? " (nhuận)" : ""}/{detail.lunarDeathYear}
            </p>
          )}
        </div>
      </div>

      {/* ── Description ── */}
      {detail.description && (
        <div className="relative rounded-2xl bg-gradient-to-br from-blue-50/80 to-amber-50/80 dark:from-blue-950/30 dark:to-amber-950/30 backdrop-blur-md border border-blue-100/50 dark:border-blue-900/50 shadow-sm p-4 overflow-hidden z-10 group mt-4">
          <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-blue-400 to-amber-400"></div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-white/80 dark:bg-black/40 shadow-sm">
              <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-[11px] uppercase tracking-wider text-blue-800 dark:text-blue-300 font-black">Tiểu sử</p>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line relative z-10 font-medium">
            {detail.description}
          </p>
        </div>
      )}

      {/* ── Family section ── */}
      <div className="space-y-5 relative z-10 mt-6">
        <div className="flex items-center gap-2.5 pb-2.5 border-b border-border/50">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-amber-500 text-white shadow-md">
            <Users className="h-4 w-4" />
          </div>
          <h4 className="text-sm font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-amber-600 dark:from-blue-400 dark:to-amber-300">
            Gia đình
          </h4>
        </div>

        {/* Parents */}
        <div className="space-y-2">
          <div className="flex items-center px-1 mb-2">
            <div className="h-3.5 w-1 rounded-full bg-blue-400 mr-2"></div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cha mẹ</p>
          </div>
          {detail.parents.length > 0 ? (
            <div className="space-y-2">
              {detail.parents.map((p) =>
                renderRelPerson(
                  p,
                  p.gender === "M" ? "Cha" : p.gender === "F" ? "Mẹ" : "Cha/Mẹ",
                  p.gender === "M" ? "father" : "mother",
                ),
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground font-medium italic px-4 py-2 bg-muted/30 rounded-lg border border-border/30">Chưa ghi nhận</p>
          )}
        </div>

        {/* Spouses */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between px-1 mb-2">
            <div className="flex items-center">
              <div className="h-3.5 w-1 rounded-full bg-pink-400 mr-2"></div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {detail.gender === "M" ? "Vợ" : detail.gender === "F" ? "Chồng" : "Vợ/Chồng"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddSpouseModal(true)}
              className="h-7 px-3 text-[11px] font-bold text-pink-600 border-pink-200 bg-pink-50 hover:bg-pink-100 hover:text-pink-700 dark:bg-pink-950/30 dark:border-pink-900/50 dark:text-pink-400 dark:hover:bg-pink-900/50 dark:hover:text-pink-300 rounded-full shadow-sm transition-all"
            >
              <Plus className="h-3 w-3 mr-1" />
              Thêm {detail.gender === "M" ? "vợ" : detail.gender === "F" ? "chồng" : "người"}
            </Button>
          </div>
          {detail.spouses.length > 0 ? (
            <div className="space-y-2">
              {[...detail.spouses]
                .sort((a, b) => (a.spouseOrder ?? 999) - (b.spouseOrder ?? 999))
                .map((s, i) => renderRelPerson(s, spouseLabel(s.spouseOrder, i, detail.gender, detail.spouses.length), "spouse"))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground font-medium italic px-4 py-2 bg-muted/30 rounded-lg border border-border/30">Chưa ghi nhận</p>
          )}
        </div>

        {/* Children */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between px-1 mb-2">
            <div className="flex items-center">
              <div className="h-3.5 w-1 rounded-full bg-amber-400 mr-2"></div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Con cái</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddChildModal(true)}
              className="h-7 px-3 text-[11px] font-bold text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:text-amber-700 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-400 dark:hover:bg-amber-900/50 dark:hover:text-amber-300 rounded-full shadow-sm transition-all"
            >
              <Plus className="h-3 w-3 mr-1" />
              Thêm con
            </Button>
          </div>
          {detail.children.length > 0 ? (
            <div className="space-y-2">
              {[...detail.children]
                .sort((a, b) => (a.childOrder ?? 999) - (b.childOrder ?? 999))
                .map((c, i) => renderRelPerson(c, childLabel(c.childOrder, i), "child"))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground font-medium italic px-4 py-2 bg-muted/30 rounded-lg border border-border/30">Chưa ghi nhận</p>
          )}
        </div>
      </div>
    </div>
  )
}
