"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { api } from "@/lib/api"
import { Person } from "./family-tree-view"

interface AddRelationshipModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  people: Person[]
  chartId: string
}

export default function AddRelationshipModal({
  isOpen,
  onClose,
  onSuccess,
  people,
  chartId,
}: AddRelationshipModalProps) {
  const [parentId, setParentId] = useState<string>("")
  const [childId, setChildId] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!parentId || !childId) {
      setError("Please select both parent and child")
      return
    }

    if (parentId === childId) {
      setError("Parent and child cannot be the same person")
      return
    }

    setIsSubmitting(true)
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
      if (!token) throw new Error("Authentication required")

      await api.createParentChildRelationship(token, chartId, parseInt(parentId), parseInt(childId))

      // Reset form
      setParentId("")
      setChildId("")
      
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error("Error creating relationship:", error)
      if (error.response?.status === 404) {
        setError("ParentId or childId not found")
      } else {
        setError(error.response?.data?.message || "Failed to create relationship. Please try again.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setParentId("")
      setChildId("")
      setError(null)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Relationship</DialogTitle>
          <DialogDescription>
            Create a parent-child relationship between two existing family members.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="parent">Parent ID *</Label>
            <Input
              id="parent"
              type="text"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              placeholder="Enter parent's person ID"
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500">Enter the Person ID of the parent</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="child">Child ID *</Label>
            <Input
              id="child"
              type="text"
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              placeholder="Enter child's person ID"
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500">Enter the Person ID of the child</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-sm">
            <p className="font-medium mb-1">Note:</p>
            <p>
              This will create a parent-child relationship where the selected parent will be connected to the selected
              child in the family tree.
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Relationship"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
