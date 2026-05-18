"use client"

import React, { useState, useEffect, useMemo } from "react"
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
import { DatePicker } from "@/components/ui/date-picker"
import CustomAvatarUpload from "@/components/ui/custom-avatar-upload"
import * as personApi from "@/lib/api/person"
import { useAuthStore } from "@/lib/stores/auth-store"
import type { PersonDetail } from "@/lib/stores/family-tree-store"

interface AddChildModalProps {
  isOpen: boolean
  onClose: () => void
  parent: PersonDetail
  onSuccess: () => void
  chartId: string
}

export default function AddChildModal({ isOpen, onClose, parent, onSuccess, chartId }: AddChildModalProps) {
  const [name, setName] = useState("")
  const [gender, setGender] = useState<"M" | "F" | "O">("M")
  const [dob, setDob] = useState("")
  const [dod, setDod] = useState("")
  const [description, setDescription] = useState("")
  const [childOrder, setChildOrder] = useState<number>(1)
  const [selectedSpouseId, setSelectedSpouseId] = useState<string>("none")
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get spouse options from parent's PersonDetail
  const spouseOptions = useMemo(() => {
    if (!parent.spouses) return []
    return parent.spouses.map(s => ({
      name: s.name,
      id: s.personId,
    }))
  }, [parent.spouses])

  useEffect(() => {
    // Auto-select spouse if there is exactly one
    if (spouseOptions.length === 1 && selectedSpouseId === "none") {
      setSelectedSpouseId(spouseOptions[0].id.toString())
    }
  }, [spouseOptions, selectedSpouseId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError("Cần nhập tên")
      return
    }

    setIsSubmitting(true)
    try {
      const token = useAuthStore.getState().token
      if (!token) throw new Error("Yêu cầu đăng nhập")

      let fatherId: number | null = null
      let motherId: number | null = null

      if (parent.gender === "M") {
        fatherId = parent.personId
        motherId = selectedSpouseId !== "none" ? parseInt(selectedSpouseId) : null
      } else if (parent.gender === "F") {
        motherId = parent.personId
        fatherId = selectedSpouseId !== "none" ? parseInt(selectedSpouseId) : null
      } else {
        // Fallback for "Other" gender
        fatherId = parent.personId
      }

      await personApi.addChild(token, chartId, {
        name: name.trim(),
        gender,
        level: parent.level + 1,
        fatherId,
        motherId,
        childOrder,
        dob: dob || null,
        dod: dod || null,
        description: description.trim() || null,
        photoUrl: photoUrl || null,
      })

      // Reset form
      resetForm()
      onSuccess()
    } catch (error: any) {
      console.error("Error adding child:", error)
      setError(error.response?.data?.message || error.response?.data?.detail || "Thêm con thất bại. Vui lòng thử lại.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setName("")
    setGender("M")
    setDob("")
    setDod("")
    setDescription("")
    setChildOrder(1)
    setSelectedSpouseId("none")
    setPhotoUrl(null)
    setError(null)
  }

  React.useEffect(() => {
    if (isOpen) {
      resetForm()
    }
  }, [isOpen, parent])

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm()
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden p-0">
        <div className="overflow-y-auto max-h-[90vh] p-6 space-y-4">
          <DialogHeader>
            <DialogTitle>Thêm con cho {parent.name}</DialogTitle>
            <DialogDescription>
              Thêm một người con mới cho {parent.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Avatar Upload */}
            <div className="flex justify-center">
              <CustomAvatarUpload
                photoUrl={photoUrl}
                onPhotoChange={setPhotoUrl}
                disabled={isSubmitting}
                size={80}
                onError={setError}
              />
            </div>

            {spouseOptions.length > 0 && (
              <div className="space-y-2 p-3 bg-gray-50 rounded-lg border">
                <Label htmlFor="spouse">Chọn {parent.gender === "M" ? "Mẹ" : "Cha"} (Tùy chọn)</Label>
                <Select value={selectedSpouseId} onValueChange={setSelectedSpouseId} disabled={isSubmitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn cha/mẹ còn lại" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không rõ / Không có trong sơ đồ</SelectItem>
                    {spouseOptions.map(spouse => (
                      <SelectItem key={spouse.id} value={spouse.id.toString()}>
                        {spouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Tên người con *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập tên người con"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gender">Giới tính *</Label>
                <Select value={gender} onValueChange={(value: "M" | "F" | "O") => setGender(value)} disabled={isSubmitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn giới tính" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Nam</SelectItem>
                    <SelectItem value="F">Nữ</SelectItem>
                    <SelectItem value="O">Khác</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="childOrder">Thứ tự sinh</Label>
                <Input
                  id="childOrder"
                  type="number"
                  min="1"
                  value={childOrder}
                  onChange={(e) => setChildOrder(parseInt(e.target.value) || 0)}
                  placeholder="Thứ tự sinh trong gia đình"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dob">Ngày sinh</Label>
                <DatePicker
                  date={dob}
                  setDate={setDob}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dod">Ngày mất</Label>
                <DatePicker
                  date={dod}
                  setDate={setDod}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Thêm thông tin bổ sung..."
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Đang thêm..." : "Thêm con"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
