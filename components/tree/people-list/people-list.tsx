"use client"

import { useMemo, useState } from "react"
import { Plus, Search, Users, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useFamilyTreeStore } from "@/lib/stores/family-tree-store"
import type { Person } from "@/lib/stores/family-tree-store"
import { getPersonColor } from "../person-color"
import PersonCard from "./person-card"

interface Props {
  readOnly?: boolean
}

// "Family members" section: search by name + filter by generation level, then
// members are grouped by level (one block per generation).
export default function PeopleList({ readOnly = false }: Props) {
  const {
    people,
    familyTreeData,
    levelFilter,
    setLevelFilter,
    selectPerson,
    openSidebar,
    confirmDiscardChanges,
    toggleModal,
  } = useFamilyTreeStore()

  // Name search is view-only state — no need to live in the global store.
  const [nameQuery, setNameQuery] = useState("")

  const filtered = useMemo(() => {
    const q = nameQuery.trim().toLowerCase()
    const lvl = levelFilter ? parseInt(levelFilter) : null
    return people.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false
      if (lvl != null && !Number.isNaN(lvl) && p.level !== lvl) return false
      return true
    })
  }, [people, nameQuery, levelFilter])

  // Group filtered members by level, ascending.
  const groups = useMemo(() => {
    const map = filtered.reduce((acc, person) => {
      const lvl = person.level ?? 0
      ;(acc[lvl] ||= []).push(person)
      return acc
    }, {} as Record<number, Person[]>)
    return Object.entries(map).sort(([a], [b]) => Number(a) - Number(b))
  }, [filtered])

  const handleSelect = (person: Person) => {
    if (!confirmDiscardChanges()) return
    selectPerson(person)
    openSidebar()
  }

  const hasFilter = Boolean(nameQuery.trim() || levelFilter)

  return (
    <div className="rounded-2xl border border-white/50 bg-white/60 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-black/30 sm:p-6">
      {/* Header + filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 sm:text-xl">
          Thành viên gia đình{" "}
          <span className="text-sm font-medium text-gray-400">({people.length})</span>
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Tìm theo tên"
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              className="bg-white/70 pl-9 pr-9 backdrop-blur-sm"
            />
            {nameQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setNameQuery("")}
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0 hover:bg-gray-200/60"
              >
                <X className="h-4 w-4 text-gray-400" />
              </Button>
            )}
          </div>
          <div className="relative w-full sm:w-32">
            <Input
              type="text"
              inputMode="numeric"
              placeholder="Số đời"
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value.replace(/[^0-9]/g, ""))}
              className="bg-white/70 pr-9 backdrop-blur-sm"
            />
            {levelFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLevelFilter("")}
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0 hover:bg-gray-200/60"
              >
                <X className="h-4 w-4 text-gray-400" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Grouped members */}
      {groups.length > 0 ? (
        <div className="space-y-5 sm:space-y-6">
          {groups.map(([level, members]) => (
            <div key={level}>
              <div className="mb-3 flex items-center">
                <span className="inline-flex items-center rounded-full bg-gradient-to-r from-blue-500 to-amber-500 px-3 py-1 text-xs font-semibold text-white shadow-sm sm:text-sm">
                  Đời {level}
                </span>
                <span className="ml-2 text-xs text-gray-400 sm:text-sm">{members.length} thành viên</span>
                <div className="ml-3 flex-1 border-t border-gray-200/70" />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6">
                {members.map((person) => (
                  <PersonCard
                    key={person.personId}
                    person={person}
                    accent={getPersonColor(person, familyTreeData.links)}
                    onClick={() => handleSelect(person)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-10 text-center sm:py-14">
          <Users className="mx-auto mb-4 h-12 w-12 text-gray-300 sm:h-16 sm:w-16" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            {hasFilter ? "Không tìm thấy thành viên phù hợp" : "Chưa có thành viên nào"}
          </h3>
          <p className="mb-4 text-gray-600">
            {hasFilter
              ? "Thử đổi từ khóa hoặc xóa bộ lọc."
              : "Bắt đầu xây dựng cây phả hệ bằng cách thêm người đầu tiên."}
          </p>
          {!readOnly && !hasFilter && (
            <Button onClick={() => toggleModal("addPerson", true)}>
              <Plus className="mr-2 h-4 w-4" />
              Thêm người đầu tiên
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
