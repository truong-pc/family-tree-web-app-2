"use client"

import Image from "next/image"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useFamilyTreeStore } from "@/lib/stores/family-tree-store"
import type { Person } from "@/lib/stores/family-tree-store"

const genderLabel = (g: string) => (g === "M" ? "Nam" : g === "F" ? "Nữ" : "Khác")

// Search box over the chart: typing filters names; clicking a result zooms +
// highlights that node (via focusedPerson). The X button only clears the input
// — the highlight is cleared by clicking empty canvas.
export default function TreeSearchBox() {
  const { searchTerm, searchResults, handleSearch, clearSearch, setFocusedPerson } = useFamilyTreeStore()

  const onResultClick = (person: Person) => {
    setFocusedPerson(String(person.personId))
    handleSearch("")
  }

  return (
    <div className="relative w-full sm:w-96">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <Input
        type="text"
        placeholder="Tìm kiếm để zoom đến người đó"
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
        className="bg-white/70 pl-10 pr-10 backdrop-blur-sm"
      />
      {searchTerm && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearSearch}
          className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 p-0 hover:bg-gray-200/60"
        >
          <X className="h-4 w-4 text-gray-400" />
        </Button>
      )}
      {searchResults.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-white/60 bg-white/90 shadow-lg backdrop-blur-md">
          {searchResults.map((person) => (
            <button
              type="button"
              key={person.personId}
              onClick={() => onResultClick(person)}
              className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-2 text-left last:border-b-0 hover:bg-blue-50/60"
            >
              <span className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                <Image
                  src={person.photoUrl || "/placeholder-user.jpg"}
                  alt={person.name || "Avatar"}
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{person.name}</span>
                <span className="flex justify-between text-sm text-gray-500">
                  <span>{genderLabel(person.gender)}</span>
                  <span className="text-gray-400">Đời {person.level}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
