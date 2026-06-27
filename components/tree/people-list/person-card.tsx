"use client"

import Image from "next/image"
import type { Person } from "@/lib/stores/family-tree-store"

interface Props {
  person: Person
  accent: string // gender/relationship colour — fills the whole card
  onClick: () => void
}

const genderLabel = (g: string) => (g === "M" ? "Nam" : g === "F" ? "Nữ" : "Khác")

// A single member card in the people list. The whole card is tinted by the
// gender/relationship colour (blue = nam, pink = nữ, amber = chưa có quan hệ).
export default function PersonCard({ person, accent, onClick }: Props) {
  return (
    <button
      type="button"
      data-person-card
      onClick={onClick}
      style={{ backgroundColor: accent }}
      className="group flex w-full items-center gap-3 rounded-xl border border-black/5 p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:brightness-[0.97]"
    >
      <span className="block h-11 w-11 flex-shrink-0 overflow-hidden rounded-full border-2 border-white bg-muted shadow-sm sm:h-12 sm:w-12">
        <Image
          src={person.photoUrl || "/placeholder-user.jpg"}
          alt={person.name || "Avatar"}
          width={48}
          height={48}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      </span>

      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-gray-900">{person.name}</div>
        <div className="mt-0.5 flex items-center justify-between text-xs text-gray-700 sm:text-sm">
          <span>{genderLabel(person.gender)}</span>
          <span className="font-mono text-[11px] text-gray-600">Đời {person.level}</span>
        </div>
      </div>
    </button>
  )
}
