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
}: SidebarViewModeProps) {
  const age = calcAge(detail.dob, detail.dod)

  const renderRelPerson = (
    rel: RelatedPerson,
    label: string,
    type: "father" | "mother" | "spouse" | "child",
  ) => {
    const key = `${type}-${rel.personId}`
    const deleting = isDeletingRel === key
    return (
      <div
        key={key}
        className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base flex-shrink-0">{rel.gender === "M" ? "♂" : rel.gender === "F" ? "♀" : "◌"}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{rel.name}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => deleteRelationship(type, rel)}
          disabled={deleting}
          className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
        </Button>
      </div>
    )
  }

  return (
    <div className="p-5 space-y-5">
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* ── Avatar + Name + ID ── */}
      <div className="flex flex-col items-center gap-2 pb-2">
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-primary/20 shadow-lg bg-muted">
            <Image
              src={detail.photoUrl || "/placeholder-user.jpg"}
              alt={detail.name || "Avatar"}
              width={96}
              height={96}
              className="w-full h-full object-cover"
            />
          </div>
          {/* Gender badge */}
          <span
            className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-md border-2 border-card ${
              detail.gender === "M"
                ? "bg-blue-500 text-white"
                : detail.gender === "F"
                ? "bg-pink-500 text-white"
                : "bg-gray-400 text-white"
            }`}
          >
            {detail.gender === "M" ? "♂" : detail.gender === "F" ? "♀" : "◌"}
          </span>
        </div>
        <h3 className="text-xl font-bold text-foreground text-center leading-tight mt-1">
          {detail.name}
        </h3>
        <span className="text-xs text-muted-foreground font-mono bg-muted px-2.5 py-0.5 rounded-full">
          ID: {detail.personId}
        </span>
      </div>

      {/* ── Info cards (2×2 grid) ── */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Age */}
        <div className="rounded-xl bg-muted/60 px-3.5 py-3 space-y-0.5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
            {detail.dod ? "Hưởng dương" : "Tuổi"}
          </p>
          <p className="text-sm font-semibold text-foreground">
            {age !== null ? `${age} tuổi` : "—"}
          </p>
        </div>

        {/* Level */}
        <div className="rounded-xl bg-muted/60 px-3.5 py-3 space-y-0.5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Đời</p>
          <p className="text-sm font-semibold text-foreground">Đời thứ {detail.level}</p>
        </div>

        {/* DOB */}
        <div className="rounded-xl bg-muted/60 px-3.5 py-3 space-y-0.5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Ngày sinh</p>
          <p className="text-sm font-semibold text-foreground">{fmtDate(detail.dob) || "—"}</p>
        </div>

        {/* DOD */}
        <div className="rounded-xl bg-muted/60 px-3.5 py-3 space-y-0.5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Ngày mất</p>
          <p className="text-sm font-semibold text-foreground">{fmtDate(detail.dod) || "—"}</p>
          {detail.lunarDeathDay != null && detail.lunarDeathMonth != null && detail.lunarDeathYear != null && (
            <p className="text-[11px] text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300 px-1.5 py-0.5 rounded inline-block mt-0.5">
              ÂL: {detail.lunarDeathDay}/{detail.lunarDeathMonth}
              {detail.lunarIsLeap ? " (nhuận)" : ""}/{detail.lunarDeathYear}
            </p>
          )}
        </div>
      </div>

      {/* ── Description ── */}
      {detail.description && (
        <div className="rounded-xl bg-muted/40 border-l-4 border-primary/40 px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Tiểu sử</p>
          </div>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{detail.description}</p>
        </div>
      )}

      {/* ── Family section ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold uppercase tracking-wider text-primary">Gia đình</h4>
        </div>

        {/* Parents */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Cha mẹ</p>
          {detail.parents.length > 0 ? (
            <div className="space-y-1.5">
              {detail.parents.map((p) =>
                renderRelPerson(
                  p,
                  p.gender === "M" ? "Cha" : p.gender === "F" ? "Mẹ" : "Cha/Mẹ",
                  p.gender === "M" ? "father" : "mother",
                ),
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic px-1">Chưa ghi nhận</p>
          )}
        </div>

        {/* Spouses */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {detail.gender === "M" ? "Vợ" : detail.gender === "F" ? "Chồng" : "Vợ/Chồng"}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddSpouseModal(true)}
              className="h-6 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
            >
              <Plus className="h-3 w-3 mr-1" />
              Thêm vợ/chồng
            </Button>
          </div>
          {detail.spouses.length > 0 ? (
            <div className="space-y-1.5">
              {[...detail.spouses]
                .sort((a, b) => (a.spouseOrder ?? 999) - (b.spouseOrder ?? 999))
                .map((s, i) => renderRelPerson(s, spouseLabel(s.spouseOrder, i, detail.gender, detail.spouses.length), "spouse"))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic px-1">Chưa ghi nhận</p>
          )}
        </div>

        {/* Children */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Con cái</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddChildModal(true)}
              className="h-6 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
            >
              <Plus className="h-3 w-3 mr-1" />
              Thêm con
            </Button>
          </div>
          {detail.children.length > 0 ? (
            <div className="space-y-1.5">
              {[...detail.children]
                .sort((a, b) => (a.childOrder ?? 999) - (b.childOrder ?? 999))
                .map((c, i) => renderRelPerson(c, childLabel(c.childOrder, i), "child"))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic px-1">Chưa ghi nhận</p>
          )}
        </div>
      </div>
    </div>
  )
}
