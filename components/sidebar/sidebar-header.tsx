import { Button } from "@/components/ui/button"
import { Edit2, Trash2, X, Loader2 } from "lucide-react"

interface SidebarHeaderProps {
  isEditing: boolean
  setIsEditing: (val: boolean) => void
  deletePerson: () => void
  isDeleting: boolean
  closeSidebar: () => void
}

export function SidebarHeader({
  isEditing,
  setIsEditing,
  deletePerson,
  isDeleting,
  closeSidebar,
}: SidebarHeaderProps) {
  return (
    <div className="px-5 py-4 border-b border-border flex-shrink-0">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-foreground">
          {isEditing ? "Chỉnh sửa" : "Chi tiết thành viên"}
        </h2>
        <div className="flex items-center gap-1">
          {!isEditing && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10"
                title="Chỉnh sửa"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={deletePerson}
                disabled={isDeleting}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                title="Xóa thành viên"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={closeSidebar} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
