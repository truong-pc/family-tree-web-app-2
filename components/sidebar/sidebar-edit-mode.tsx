import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { Button } from "@/components/ui/button"
import { Save, XCircle } from "lucide-react"
import CustomAvatarUpload from "@/components/ui/custom-avatar-upload"

interface EditFormState {
  name: string
  gender: "M" | "F" | "O"
  level: string
  dob: string
  dod: string
  description: string
}

interface SidebarEditModeProps {
  error: string | null
  setError: (err: string | null) => void
  editPhotoUrl: string | null
  setEditPhotoUrl: (url: string | null) => void
  isSaving: boolean
  editForm: EditFormState
  setEditForm: (form: EditFormState) => void
  handleSave: () => void
  handleCancelEdit: () => void
}

export function SidebarEditMode({
  error,
  setError,
  editPhotoUrl,
  setEditPhotoUrl,
  isSaving,
  editForm,
  setEditForm,
  handleSave,
  handleCancelEdit,
}: SidebarEditModeProps) {
  return (
    <div className="p-5 space-y-5">
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Avatar edit */}
      <CustomAvatarUpload
        photoUrl={editPhotoUrl}
        onPhotoChange={setEditPhotoUrl}
        disabled={isSaving}
        size={96}
        onError={setError}
      />

      {/* Name */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-muted-foreground">Họ và tên</label>
        <Input
          value={editForm.name}
          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          placeholder="Nhập tên"
        />
      </div>

      {/* Gender + Level */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Giới tính</label>
          <Select
            value={editForm.gender}
            onValueChange={(v: "M" | "F" | "O") => setEditForm({ ...editForm, gender: v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="M">Nam</SelectItem>
              <SelectItem value="F">Nữ</SelectItem>
              <SelectItem value="O">Khác</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Đời thứ</label>
          <Input
            type="number"
            value={editForm.level}
            onChange={(e) => setEditForm({ ...editForm, level: e.target.value })}
            placeholder="1, 2, 3..."
          />
        </div>
      </div>

      {/* DOB + DOD */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Ngày sinh</label>
          <DatePicker date={editForm.dob} setDate={(v) => setEditForm({ ...editForm, dob: v })} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Ngày mất</label>
          <DatePicker date={editForm.dod} setDate={(v) => setEditForm({ ...editForm, dod: v })} />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-muted-foreground">Tiểu sử</label>
        <Textarea
          value={editForm.description}
          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
          placeholder="Nhập mô tả"
          rows={3}
        />
      </div>

      {/* Save / Cancel */}
      <div className="flex gap-2 pt-1">
        <Button onClick={handleSave} disabled={isSaving || !editForm.name.trim()} className="flex-1">
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Đang lưu..." : "Lưu"}
        </Button>
        <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving} className="flex-1">
          <XCircle className="h-4 w-4 mr-2" />
          Hủy
        </Button>
      </div>
    </div>
  )
}
