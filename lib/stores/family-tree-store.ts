"use client"

import { create } from "zustand"
import * as treeApi from "@/lib/api/tree"
import * as personApi from "@/lib/api/person"
import { useAuthStore } from "@/lib/stores/auth-store"

export interface Person {
  personId: number
  ownerId: string
  chartId: string
  name: string
  gender: "M" | "F" | "O"
  level: number
  dob?: string | null
  dod?: string | null
  description?: string | null
  photoUrl?: string | null
  lunarDeathDay?: number | null
  lunarDeathMonth?: number | null
  lunarDeathYear?: number | null
  lunarIsLeap?: boolean | null
}

export interface RelatedPerson {
  personId: number
  name: string
  gender: string
  birthOrder?: number | null
  childOrder?: number | null
  spouseOrder?: number | null
}

export interface PersonDetail {
  personId: number
  ownerId: string
  chartId: string
  name: string
  gender: "M" | "F" | "O"
  level: number
  dob?: string | null
  dod?: string | null
  description?: string | null
  photoUrl?: string | null
  lunarDeathDay?: number | null
  lunarDeathMonth?: number | null
  lunarDeathYear?: number | null
  lunarIsLeap?: boolean | null
  parents: RelatedPerson[]
  spouses: RelatedPerson[]
  children: RelatedPerson[]
}

export interface FamilyTreeData {
  nodes: Array<{ id: string; gender: string; [key: string]: any }>
  links: Array<{ source: string; target: string; [key: string]: any }>
}

type ModalName = "addPerson" | "addRelationship" | "delRelationship"

interface FamilyTreeState {
  // Data
  people: Person[]
  familyTreeData: FamilyTreeData

  // Person detail (sidebar)
  personDetail: PersonDetail | null
  personDetailLoading: boolean

  // UI state
  selectedPerson: Person | null
  sidebarOpen: boolean
  focusedPerson: string | null
  loading: boolean
  error: string | null
  searchTerm: string
  searchResults: Person[]
  levelFilter: string

  // Modal visibility
  showAddPersonModal: boolean
  showAddRelationshipModal: boolean
  showDelRelationshipModal: boolean

  // Actions
  fetchData: (chartId: string, readOnly: boolean) => Promise<void>
  fetchPersonDetail: (chartId: string, personId: number) => Promise<void>
  updatePersonLocally: (personId: number, patch: Partial<Person>) => void
  handleSearch: (term: string) => void
  clearSearch: () => void
  selectPerson: (person: Person | null) => void
  openSidebar: () => void
  closeSidebar: () => void
  toggleModal: (modal: ModalName, open: boolean) => void
  setFocusedPerson: (id: string | null) => void
  setLevelFilter: (value: string) => void
  reset: () => void
}

const initialState = {
  people: [] as Person[],
  familyTreeData: { nodes: [], links: [] } as FamilyTreeData,
  personDetail: null as PersonDetail | null,
  personDetailLoading: false,
  selectedPerson: null as Person | null,
  sidebarOpen: false,
  focusedPerson: null as string | null,
  loading: false,
  error: null as string | null,
  searchTerm: "",
  searchResults: [] as Person[],
  levelFilter: "",
  showAddPersonModal: false,
  showAddRelationshipModal: false,
  showDelRelationshipModal: false,
}

export const useFamilyTreeStore = create<FamilyTreeState>()((set, get) => ({
  ...initialState,

  fetchData: async (chartId: string, readOnly: boolean) => {
    set({ loading: true, error: null })
    try {
      const token = useAuthStore.getState().token

      // Fetch tree data
      let treeData: FamilyTreeData
      if (readOnly) {
        treeData = await treeApi.getPublishedTree(chartId)
      } else {
        if (!token) throw new Error("Authentication required")
        treeData = await treeApi.getChartTree(token, chartId)
      }

      // Ensure treeData has valid structure
      const rawNodes = Array.isArray(treeData?.nodes) ? treeData.nodes : []
      const rawLinks = Array.isArray(treeData?.links) ? treeData.links : []

      // Transform nodes to have 'id' field (required by chart component)
      const transformedNodes = rawNodes.map((node: any) => ({
        ...node,
        id: String(node.id || node.personId),
      }))

      // Transform links: keep personId as string to match node ids
      const transformedLinks = rawLinks.map((link: any) => ({
        ...link,
        source: String(link.source),
        target: String(link.target),
      }))

      const validTreeData: FamilyTreeData = {
        nodes: transformedNodes,
        links: transformedLinks,
      }

      // Fetch persons list
      let peopleData: Person[]
      if (!readOnly && token) {
        const personsResponse = await personApi.getChartPersons(token, chartId)
        peopleData = Array.isArray(personsResponse)
          ? personsResponse
          : Array.isArray(personsResponse?.data)
            ? personsResponse.data
            : []
      } else {
        // In read-only mode, extract people from nodes
        peopleData = rawNodes.map((node: any) => ({
          personId: node.id || node.personId || 0,
          ownerId: node.ownerId || "",
          chartId: chartId,
          name: node.name || "Unknown",
          gender: node.gender === "male" || node.gender === "M" ? "M" : node.gender === "female" || node.gender === "F" ? "F" : "O",
          level: node.level || 0,
          dob: node.dob || null,
          dod: node.dod || null,
          description: node.desc || node.description || null,
          photoUrl: node.photoUrl || null,
          lunarDeathDay: node.lunarDeathDay ?? null,
          lunarDeathMonth: node.lunarDeathMonth ?? null,
          lunarDeathYear: node.lunarDeathYear ?? null,
          lunarIsLeap: node.lunarIsLeap ?? null,
        }))
      }

      // Update selectedPerson if it exists in the new people data
      const currentSelected = get().selectedPerson
      let updatedSelected: Person | null = null
      if (currentSelected && peopleData.length > 0) {
        updatedSelected = peopleData.find(p => p.personId === currentSelected.personId) || null
      }

      set({
        familyTreeData: validTreeData,
        people: peopleData,
        selectedPerson: updatedSelected,
        loading: false,
        error: null,
      })
    } catch (error: any) {
      console.error("Error fetching data:", error)
      set({
        loading: false,
        error: error.message || "Failed to load family tree data. Please check if the server is running.",
      })
    }
  },

  fetchPersonDetail: async (chartId: string, personId: number) => {
    set({ personDetailLoading: true })
    try {
      const token = useAuthStore.getState().token
      if (!token) throw new Error("Yêu cầu đăng nhập")

      const detail = await personApi.getPersonDetail(token, chartId, personId)
      set({
        personDetail: detail,
        personDetailLoading: false,
      })
    } catch (error: any) {
      console.error("Error fetching person detail:", error)
      set({ personDetailLoading: false })
    }
  },

  handleSearch: (term: string) => {
    const { people } = get()
    if (term.trim()) {
      const filtered = people.filter((person) =>
        person.name.toLowerCase().includes(term.toLowerCase())
      )
      set({ searchTerm: term, searchResults: filtered })
    } else {
      set({ searchTerm: term, searchResults: [], focusedPerson: null })
    }
  },

  clearSearch: () => {
    set({ searchTerm: "", searchResults: [], focusedPerson: null })
  },

  selectPerson: (person) => {
    set({ selectedPerson: person })
  },

  openSidebar: () => {
    set({ sidebarOpen: true })
  },

  closeSidebar: () => {
    set({ sidebarOpen: false, personDetail: null })
  },

  toggleModal: (modal, open) => {
    switch (modal) {
      case "addPerson":
        set({ showAddPersonModal: open })
        break
      case "addRelationship":
        set({ showAddRelationshipModal: open })
        break
      case "delRelationship":
        set({ showDelRelationshipModal: open })
        break
    }
  },

  setFocusedPerson: (id) => {
    set({ focusedPerson: id })
  },

  setLevelFilter: (value) => {
    set({ levelFilter: value })
  },

  updatePersonLocally: (personId, patch) => {
    set((state) => ({
      people: state.people.map((p) =>
        p.personId === personId ? { ...p, ...patch } : p
      ),
      familyTreeData: {
        ...state.familyTreeData,
        nodes: state.familyTreeData.nodes.map((n) =>
          n.id === String(personId) ? { ...n, ...patch } : n
        ),
      },
      selectedPerson:
        state.selectedPerson?.personId === personId
          ? { ...state.selectedPerson, ...patch }
          : state.selectedPerson,
    }))
  },

  reset: () => {
    set(initialState)
  },
}))
