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
import { DatePicker } from "@/components/ui/date-picker"
import CustomAvatarUpload from "@/components/ui/custom-avatar-upload"
import * as personApi from "@/lib/api/person"
import * as cloudinary from "@/lib/services/cloudinary"
import { useFamilyTreeStore } from "@/lib/stores/family-tree-store"
import { useAuthStore } from "@/lib/stores/auth-store"

interface AddPersonModalProps {
  chartId: string
}

export default function AddPersonModal({ chartId }: AddPersonModalProps) {
  const { showAddPersonModal: isOpen, toggleModal, fetchData } = useFamilyTreeStore()

  const [name, setName] = useState("")
  const [gender, setGender] = useState<"M" | "F" | "O">("M")
  const [level, setLevel] = useState("")
  const [dob, setDob] = useState("")
  const [dod, setDod] = useState("")
  const [description, setDescription] = useState("")
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError("Cần nhập tên")
      return
    }

    if (!level || level.trim() === "") {
      setError("Cần nhập đời")
      return
    }

    const levelNum = parseInt(level)
    if (isNaN(levelNum) || levelNum < 1) {
      setError("Đời phải là một số nguyên dương")
      return
    }

    setIsSubmitting(true)
    try {
      const token = useAuthStore.getState().token
      if (!token) throw new Error("Yêu cầu đăng nhập")

      const levelNum = parseInt(level)

      // Hoãn upload: chỉ đẩy ảnh lên Cloudinary khi người dùng thực sự lưu.
      let photoUrl: string | null = null
      if (photoFile) {
        photoUrl = await cloudinary.uploadImage(photoFile)
      }

      await personApi.createPerson(token, chartId, {
        name: name.trim(),
        gender,
        level: levelNum,
        dob: dob || null,
        dod: dod || null,
        description: description.trim() || null,
        photoUrl,
      })

      // Reset form
      resetForm()
      fetchData(chartId, false)
      toggleModal("addPerson", false)
    } catch (error: any) {
      console.error("Error creating person:", error)
      setError(error.response?.data?.message || "Thêm người thất bại. Vui lòng thử lại.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setName("")
    setGender("M")
    setLevel("")
    setDob("")
    setDod("")
    setDescription("")
    setPhotoFile(null)
    setError(null)
  }

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm()
      toggleModal("addPerson", false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden p-0">
        <div className="overflow-y-auto max-h-[90vh] p-6 space-y-4">
          <DialogHeader>
            <DialogTitle>Thêm người mới</DialogTitle>
            <DialogDescription>
              Thêm một thành viên mới vào cây phả hệ của bạn. Điền thông tin chi tiết bên dưới.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Avatar Upload */}
            <div className="flex justify-center">
              <CustomAvatarUpload
                photoUrl={null}
                onFileChange={setPhotoFile}
                disabled={isSubmitting}
                size={80}
                onError={setError}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Họ và tên *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập tên thành viên"
                disabled={isSubmitting}
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
                <Label htmlFor="level">Đời thứ *</Label>
                <Input
                  id="level"
                  type="number"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  placeholder="1, 2, 3..."
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
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Đang thêm..." : "Thêm người"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
