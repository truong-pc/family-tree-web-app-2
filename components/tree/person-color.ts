import { COLORS } from "./graph/constants"
import type { FamilyTreeData, Person } from "@/lib/stores/family-tree-store"

// Shared helper used across the whole tree feature: the D3 chart (node fill),
// the people list (card tint), and the view (getPersonColorById). Lives at the
// `tree/` root rather than inside `graph/` because it is not graph-specific.
// Isolated people (no links) get amber, otherwise coloured by gender.
export function getPersonColor(person: Pick<Person, "personId" | "gender">, links: FamilyTreeData["links"]): string {
  const id = String(person.personId)
  const hasRelationships = links.some((l) => l.source === id || l.target === id)
  if (!hasRelationships) return COLORS.isolated
  return person.gender === "M" ? COLORS.male : person.gender === "F" ? COLORS.female : COLORS.other
}
