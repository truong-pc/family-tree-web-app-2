"use client"

import React, { useState, useEffect, useRef } from "react"
import { Search, Plus, X, Users, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import Image from "next/image"
import FamilyTreeChart from "./family-tree-chart"
import PersonSidebar from "./person-sidebar"
import AddPersonModal from "./add-person-modal"
import AddRelationshipModal from "./add-relationship-modal"
import DelRelationshipModal from "./del-relationship-modal"

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
}

export interface FamilyTreeData {
  nodes: Array<{ id: string; gender: string; [key: string]: any }>
  links: Array<{ source: string; target: string; [key: string]: any }>
}

interface FamilyTreeViewProps {
  chartId: string
  readOnly?: boolean
}

export default function FamilyTreeView({ chartId, readOnly = false }: FamilyTreeViewProps) {
  const [people, setPeople] = useState<Person[]>([])
  const [familyTreeData, setFamilyTreeData] = useState<FamilyTreeData>({ nodes: [], links: [] })
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<Person[]>([])
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showAddPersonModal, setShowAddPersonModal] = useState(false)
  const [showAddRelationshipModal, setShowAddRelationshipModal] = useState(false)
  const [showDelRelationshipModal, setShowDelRelationshipModal] = useState(false)
  const [focusedPerson, setFocusedPerson] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [levelFilter, setLevelFilter] = useState<string>("")
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Update selectedPerson when people data changes (to reflect edits)
  useEffect(() => {
    if (selectedPerson && people.length > 0) {
      const updatedPerson = people.find(p => p.personId === selectedPerson.personId)
      if (updatedPerson) {
        setSelectedPerson(updatedPerson)
      }
    }
  }, [people])

  // Handle click outside sidebar to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        // Check if click is on a tree node (SVG rect)
        const target = event.target as Element
        if (target.tagName === 'rect' || target.closest('svg')) {
          // Don't close sidebar when clicking on tree nodes
          return
        }

        // Check if any portal content is open (Select, Dropdown, etc.)
        // If so, the click outside likely just meant to close that portal, not the sidebar
        const isPortalOpen = 
          document.querySelector('[data-slot="select-content"][data-state="open"]') ||
          document.querySelector('[role="menu"][data-state="open"]')
        
        if (isPortalOpen) {
          return
        }
        
        setSidebarOpen(false)
      }
    }

    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
  }, [sidebarOpen])

  // Fetch all people and family tree data
  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

      // Fetch tree data
      let treeData: FamilyTreeData
      if (readOnly) {
        treeData = await api.getPublishedTree(chartId)
      } else {
        if (!token) throw new Error("Authentication required")
        treeData = await api.getChartTree(token, chartId)
      }
      
      // Ensure treeData has valid structure
      const rawNodes = Array.isArray(treeData?.nodes) ? treeData.nodes : []
      const rawLinks = Array.isArray(treeData?.links) ? treeData.links : []

      // Create a map of personId to name for link transformation
      const personIdToName = new Map<number, string>()
      rawNodes.forEach((node: any) => {
        if (node.personId && node.name) {
          personIdToName.set(node.personId, node.name)
        }
      })

      // Transform nodes to have 'id' field (required by chart component)
      const transformedNodes = rawNodes.map((node: any) => ({
        ...node,
        id: node.name, // Chart component expects 'id' field
      }))

      // Transform links: convert personId to person names
      const transformedLinks = rawLinks.map((link: any) => ({
        source: personIdToName.get(link.source) || String(link.source),
        target: personIdToName.get(link.target) || String(link.target),
      }))

      const validTreeData: FamilyTreeData = {
        nodes: transformedNodes,
        links: transformedLinks,
      }
      setFamilyTreeData(validTreeData)

      // Fetch persons list
      if (!readOnly && token) {
        const personsResponse = await api.getChartPersons(token, chartId)
        // Handle both direct array and { data: [...] } wrapper
        const personsData = Array.isArray(personsResponse) 
          ? personsResponse 
          : Array.isArray(personsResponse?.data) 
            ? personsResponse.data 
            : []
        setPeople(personsData)
      } else {
        // In read-only mode, extract people from nodes
        const peopleData: Person[] = rawNodes.map((node: any) => ({
          personId: node.personId || 0,
          ownerId: node.ownerId || "",
          chartId: chartId,
          name: node.name || "Unknown",
          gender: node.gender === "male" || node.gender === "M" ? "M" : node.gender === "female" || node.gender === "F" ? "F" : "O",
          level: node.level || 0,
          dob: node.dob || null,
          dod: node.dod || null,
          description: node.desc || node.description || null,
          photoUrl: node.photoUrl || null,
        }))
        setPeople(peopleData)
      }
    } catch (error: any) {
      console.error("Error fetching data:", error)
      setError(error.message || "Failed to load family tree data. Please check if the server is running.")
    } finally {
      setLoading(false)
    }
  }

  // Search for people (frontend filtering)
  const handleSearch = (term: string) => {
    setSearchTerm(term)
    if (term.trim()) {
      const filtered = people.filter((person) =>
        person.name.toLowerCase().includes(term.toLowerCase())
      )
      setSearchResults(filtered)
    } else {
      setSearchResults([])
      setFocusedPerson(null)
    }
  }

  // Clear search
  const clearSearch = () => {
    setSearchTerm("")
    setSearchResults([])
    setFocusedPerson(null)
  }

  // Handle node click in chart
  const handleNodeClick = (personName: string) => {
    const person = people.find((p) => p.name === personName)
    if (person) {
      setSelectedPerson(person)
      setSidebarOpen(true)
    }
  }

  // Handle search result click
  const handleSearchResultClick = (person: Person) => {
    setFocusedPerson(person.name)
    setSearchTerm(person.name)
    setSearchResults([])
  }

  // Get person color based on gender and relationships
  const getPersonColor = (person: Person) => {
    const hasRelationships = familyTreeData.links.some(
      (link) => link.source === person.name || link.target === person.name
    )

    if (!hasRelationships) return "#FEF3C7" // light yellow
    return person.gender === "M" ? "#DBEAFE" : person.gender === "F" ? "#FCE7F3" : "#E5E7EB" // blue, pink, or gray
  }

  useEffect(() => {
    fetchData()
  }, [chartId, readOnly])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading family tree...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <Users className="h-16 w-16 mx-auto mb-4" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchData}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toolbar */}
      {!readOnly && (
        <div className="bg-gray-100 border-b">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center py-3 sm:py-4 space-y-3 sm:space-y-0">
              <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
                <Button onClick={() => setShowAddPersonModal(true)} className="flex-1 sm:flex-none">
                  <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Add Person</span>
                  <span className="sm:hidden">Add</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAddRelationshipModal(true)}
                  className="flex-1 sm:flex-none"
                >
                  <span className="hidden sm:inline">Add Relationship</span>
                  <span className="sm:hidden">Relation</span>
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowDelRelationshipModal(true)}
                  className="flex-1 sm:flex-none"
                >
                  <span className="hidden sm:inline">Delete Relationship</span>
                  <span className="sm:hidden">Del Relation</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Main Content */}
        <div className="flex-1">
          <div className="max-w-7xl mx-auto px-1 sm:px-4 lg:px-8 py-2 sm:py-8">
            {/* Family Tree Visualization */}
            <Card className="mb-2 sm:mb-8 gap-2">
              <CardHeader className="pb-1 sm:pb-3 px-2 sm:px-6 space-y-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg sm:text-xl">Family Tree Visualization</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (typeof window !== 'undefined' && (window as any).familyTreeResetZoom) {
                        (window as any).familyTreeResetZoom()
                      }
                    }}
                    className="text-gray-500 hover:text-gray-700"
                    title="Reset zoom"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                      <path d="M21 3v5h-5"/>
                      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                      <path d="M3 21v-5h5"/>
                    </svg>
                  </Button>
                </div>
                {/* Search Bar for Tree Visualization */}
                <div className="relative w-full sm:w-96">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Search to zoom to person..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10 pr-10 w-full"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSearch}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-200"
                    >
                      <X className="h-4 w-4 text-gray-400" />
                    </Button>
                  )}
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border rounded-md shadow-lg z-10 mt-1 max-h-64 overflow-y-auto">
                      {searchResults.map((person) => (
                        <div
                          key={person.personId}
                          className="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 flex items-center"
                          onClick={() => handleSearchResultClick(person)}
                        >
                          <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 bg-gray-100 mr-3 flex-shrink-0">
                            <Image
                              src={person.photoUrl || "/placeholder-user.jpg"}
                              alt={person.name || "Avatar"}
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{person.name}</div>
                            <div className="text-sm text-gray-500 flex justify-between">
                              <span>{person.gender === "M" ? "Male" : person.gender === "F" ? "Female" : "Other"}</span>
                              <span className="text-gray-400">Level {person.level}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-1 px-1 pb-1 sm:pt-2 sm:px-6 sm:pb-6">
                <FamilyTreeChart
                  data={familyTreeData}
                  onNodeClick={handleNodeClick}
                  focusedPerson={focusedPerson}
                  getPersonColor={(name: string) => {
                    const person = people.find((p) => p.name === name)
                    return person ? getPersonColor(person) : "#F3F4F6"
                  }}
                  onResetZoom={() => {}}
                />
              </CardContent>
            </Card>

            {/* People List */}
            <Card>
              <CardHeader className="pb-2 sm:pb-6 px-2 sm:px-6">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg sm:text-xl">Family Members ({people.length})</CardTitle>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600">Số đời:</label>
                      <div className="relative">
                        <Input
                          type="text"
                          placeholder="Nhập số đời"
                          value={levelFilter}
                          onChange={(e) => {
                            const value = e.target.value
                            setLevelFilter(value)
                            if (value && parseInt(value) <= 0) {
                              // setLevelError("Số đời phải lớn hơn 0")
                            } else {
                              // setLevelError(null)
                            }
                          }}
                          className="w-32 h-9 pr-8"
                        />
                        {levelFilter && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setLevelFilter("")
                              // setLevelError(null)
                            }}
                            className="absolute right-0 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                          >
                            <X className="h-4 w-4 text-gray-400" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-2 sm:p-6">
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3">
                  {[...people]
                    .filter((person) => {
                      if (!levelFilter) return true
                      const filterLevel = parseInt(levelFilter)
                      return person.level === filterLevel
                    })
                    .map((person) => (
                    <div
                      key={person.personId}
                      className="p-3 sm:p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow flex"
                      style={{ backgroundColor: getPersonColor(person) }}
                      onClick={() => {
                        setSelectedPerson(person)
                        setSidebarOpen(true)
                      }}
                    >
                      {/* Avatar - 3/10 width */}
                      <div className="w-3/10 flex-shrink-0 mr-1 sm:mr-2">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-white bg-gray-200">
                          <Image
                            src={person.photoUrl || "/placeholder-user.jpg"}
                            alt={person.name || "Avatar"}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                      {/* Info - 7/10 width */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm sm:text-base truncate" style={{ direction: 'rtl', textAlign: 'left' }}>{person.name}</div>
                        <div className="text-xs sm:text-sm text-gray-600 flex justify-between">
                          <span>{person.gender === "M" ? "Male" : person.gender === "F" ? "Female" : "Other"}</span>
                          <span className="text-gray-500">Level {person.level}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Empty state */}
                {people.filter((person) => {
                  if (!levelFilter ) return true
                  const filterLevel = parseInt(levelFilter)
                  return person.level === filterLevel
                }).length === 0 && (
                  <div className="text-center py-8 sm:py-12">
                    <Users className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {levelFilter ? `Không có thành viên ở đời ${levelFilter}` : "No family members yet"}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {levelFilter ? "Thử nhập số đời khác hoặc xóa bộ lọc." : "Start building your family tree by adding your first person."}
                    </p>
                    {!readOnly && !levelFilter && (
                      <Button onClick={() => setShowAddPersonModal(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Person
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Person Details Sidebar */}
        {!readOnly && (
          <div ref={sidebarRef}>
            <PersonSidebar
              person={selectedPerson}
              isOpen={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              familyTreeData={familyTreeData}
              onDataUpdate={fetchData}
              chartId={chartId}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {!readOnly && (
        <>
          <AddPersonModal
            isOpen={showAddPersonModal}
            onClose={() => setShowAddPersonModal(false)}
            onSuccess={fetchData}
            chartId={chartId}
          />

          <AddRelationshipModal
            isOpen={showAddRelationshipModal}
            onClose={() => setShowAddRelationshipModal(false)}
            onSuccess={fetchData}
            people={people}
            chartId={chartId}
          />

          <DelRelationshipModal
            isOpen={showDelRelationshipModal}
            onClose={() => setShowDelRelationshipModal(false)}
            onSuccess={fetchData}
            people={people}
            chartId={chartId}
          />
        </>
      )}
    </div>
  )
}
