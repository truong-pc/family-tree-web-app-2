"use client"

import { useState } from "react"
import { X } from "lucide-react"
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

interface AddPersonModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  chartId: string
}

export default function AddPersonModal({ isOpen, onClose, onSuccess, chartId }: AddPersonModalProps) {
  const [name, setName] = useState("")
  const [gender, setGender] = useState<"M" | "F" | "O">("M")
  const [level, setLevel] = useState(0)
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

      await api.createPerson(token, chartId, {
        name: name.trim(),
        gender,
        level,
        dob: dob || null,
        dod: dod || null,
        description: description.trim() || null,
        parentIds: null,
      })

      // Reset form
      setName("")
      setGender("M")
      setLevel(0)
      setDob("")
      setDod("")
      setDescription("")
      
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error("Error creating person:", error)
      setError(error.response?.data?.message || "Failed to add person. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setName("")
      setGender("M")
      setLevel(0)
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
          <DialogTitle>Add New Person</DialogTitle>
          <DialogDescription>
            Add a new family member to your tree. Fill in the details below.
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
              placeholder="Enter person's name"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label htmlFor="level">Generation Level</Label>
              <Input
                id="level"
                type="text"
                value={level}
                onChange={(e) => setLevel(parseInt(e.target.value) || 0)}
                placeholder="0, 1, 2..."
                disabled={isSubmitting}
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 -mt-2">0 = root generation, 1 = children, 2 = grandchildren, etc.</p>

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

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Person"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
