"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/lib/api"
import { Person } from "./family-tree-view"

interface AddChildModalProps {
  isOpen: boolean
  onClose: () => void
  parent: Person
  onSuccess: () => void
  chartId: string
}

export default function AddChildModal({ isOpen, onClose, parent, onSuccess, chartId }: AddChildModalProps) {
  const [name, setName] = useState("")
  const [gender, setGender] = useState<"M" | "F" | "O">("M")
  const [dob, setDob] = useState("")
  const [dod, setDod] = useState("")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError("Name is required")
      return
    }

    setIsSubmitting(true)
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
      if (!token) throw new Error("Authentication required")

      // Create the child with parent relationship
      await api.createPerson(token, chartId, {
        name: name.trim(),
        gender,
        level: parent.level + 1, // Child is one level below parent
        dob: dob || null,
        dod: dod || null,
        description: description.trim() || null,
        parentIds: [parent.personId],
      })

      // Reset form
      setName("")
      setGender("M")
      setDob("")
      setDod("")
      setDescription("")
      
      onSuccess()
    } catch (error: any) {
      console.error("Error adding child:", error)
      setError(error.response?.data?.message || "Failed to add child. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setName("")
      setGender("M")
      setDob("")
      setDod("")
      setDescription("")
      setError(null)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Child to {parent.name}</DialogTitle>
          <DialogDescription>
            Add a new child for {parent.name}. The child will be automatically linked as their descendant.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter child's name"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Gender *</Label>
            <Select value={gender} onValueChange={(value: "M" | "F" | "O") => setGender(value)} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Male</SelectItem>
                <SelectItem value="F">Female</SelectItem>
                <SelectItem value="O">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input
                id="dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dod">Date of Death</Label>
              <Input
                id="dod"
                type="date"
                value={dod}
                onChange={(e) => setDod(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any additional information..."
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-sm">
            <p>
              This child will be added at generation level <strong>{parent.level + 1}</strong> and linked to{" "}
              <strong>{parent.name}</strong> as their parent.
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Child"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
