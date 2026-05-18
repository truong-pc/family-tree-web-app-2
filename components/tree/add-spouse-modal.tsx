"use client"

import React, { useState } from "react"
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

interface AddSpouseModalProps {
  isOpen: boolean
  onClose: () => void
  person: PersonDetail
  onSuccess: () => void
  chartId: string
}

export default function AddSpouseModal({ isOpen, onClose, person, onSuccess, chartId }: AddSpouseModalProps) {
  const [name, setName] = useState("")
  const [gender, setGender] = useState<"M" | "F" | "O">(person.gender === "M" ? "F" : "M")
  const [spouseOrder, setSpouseOrder] = useState<number>(1)
  const [dob, setDob] = useState("")
  const [dod, setDod] = useState("")
  const [description, setDescription] = useState("")
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

      await personApi.addSpouse(token, chartId, {
        name: name.trim(),
        gender,
        level: person.level,
        spouseId: person.personId,
        spouseOrder,
        dob: dob || null,
        dod: dod || null,
        description: description.trim() || null,
        photoUrl: photoUrl || null,
      })

      // Reset form
      resetForm()
      onSuccess()
    } catch (error: any) {
      console.error("Error adding spouse:", error)
      setError(error.response?.data?.message || error.response?.data?.detail || "Thêm vợ/chồng thất bại. Vui lòng thử lại.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setName("")
    setGender(person.gender === "M" ? "F" : "M")
    setSpouseOrder(1)
    setDob("")
    setDod("")
    setDescription("")
    setPhotoUrl(null)
    setError(null)
  }

  React.useEffect(() => {
    if (isOpen) {
      resetForm()
    }
  }, [isOpen, person])

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm()
      onClose()
    }
  }

  const spouseLabel = person.gender === "M" ? "vợ" : person.gender === "F" ? "chồng" : "vợ/chồng"


  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden p-0">
        <div className="overflow-y-auto max-h-[90vh] p-6 space-y-4">
          <DialogHeader>
            <DialogTitle>Thêm {spouseLabel} cho {person.name}</DialogTitle>
            <DialogDescription>
              Thêm một người {spouseLabel} mới cho {person.name}.
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

            <div className="space-y-2">
              <Label htmlFor="spouse-name">Họ và tên *</Label>
              <Input
                id="spouse-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Nhập tên ${spouseLabel}`}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="spouse-gender">Giới tính *</Label>
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
                <Label htmlFor="spouse-order">Thứ tự {spouseLabel}</Label>
                <Input
                  id="spouse-order"
                  type="number"
                  min="1"
                  value={spouseOrder}
                  onChange={(e) => setSpouseOrder(parseInt(e.target.value)||0)}
                  placeholder="1, 2, 3..."
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="spouse-dob">Ngày sinh</Label>
                <DatePicker
                  date={dob}
                  setDate={setDob}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="spouse-dod">Ngày mất</Label>
                <DatePicker
                  date={dod}
                  setDate={setDod}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="spouse-description">Mô tả</Label>
              <Textarea
                id="spouse-description"
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
                {isSubmitting ? "Đang thêm..." : `Thêm ${spouseLabel}`}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
