"use client"

import { useState, useEffect } from "react"
import AddChildModal from "@/components/tree/add-child-modal"
import AddSpouseModal from "@/components/tree/add-spouse-modal"
import * as personApi from "@/lib/api/person"
import * as treeApi from "@/lib/api/tree"
import * as cloudinary from "@/lib/services/cloudinary"
import { useFamilyTreeStore } from "@/lib/stores/family-tree-store"
import { useAuthStore } from "@/lib/stores/auth-store"
import type { RelatedPerson } from "@/lib/stores/family-tree-store"
import { SidebarHeader } from "@/components/sidebar/sidebar-header"
import { SidebarSkeleton } from "@/components/sidebar/sidebar-skeleton"
import { SidebarEditMode } from "@/components/sidebar/sidebar-edit-mode"
import { SidebarViewMode } from "@/components/sidebar/sidebar-view-mode"
import { useConfirm } from "@/hooks/use-confirm"
import { useToast } from "@/hooks/use-toast"

interface Props {
  chartId: string
}

export default function PersonSidebar({ chartId }: Props) {
  const {
    selectedPerson: person,
    sidebarOpen: isOpen,
    personDetail,
    personDetailLoading,
    people,
    closeSidebar,
    fetchData,
    fetchPersonDetail,
    updatePersonLocally,
    setEditDirty,
    isEditDirty,
    selectPerson,
    openSidebar,
  } = useFamilyTreeStore()

  const { confirm, ConfirmDialog } = useConfirm()
  const { toast } = useToast()

  const [showAddChildModal, setShowAddChildModal] = useState(false)
  const [showAddSpouseModal, setShowAddSpouseModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeletingRel, setIsDeletingRel] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editPhotoUrl, setEditPhotoUrl] = useState<string | null>(null)
  // File ảnh mới được chọn (chưa upload). Chỉ upload khi bấm "Lưu".
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [editForm, setEditForm] = useState({
    name: "",
    gender: "M" as "M" | "F" | "O",
    level: "",
    dob: "",
    dod: "",
    description: "",
  })
  const [error, setError] = useState<string | null>(null)

  // Fetch person detail when person changes
  useEffect(() => {
    if (person && isOpen) {
      fetchPersonDetail(chartId, person.personId)
    }
  }, [person?.personId, isOpen, chartId, fetchPersonDetail])

  // Exit edit mode when selecting a different person
  useEffect(() => {
    setIsEditing(false)
  }, [person?.personId])

  // Sync edit form with personDetail when not editing
  useEffect(() => {
    if (personDetail && !isEditing) {
      setEditForm({
        name: personDetail.name || "",
        gender: personDetail.gender || "M",
        level: personDetail.level?.toString() || "",
        dob: personDetail.dob || "",
        dod: personDetail.dod || "",
        description: personDetail.description || "",
      })
      setEditPhotoUrl(personDetail.photoUrl || null)
      setPhotoFile(null)
      setError(null)
    }
  }, [personDetail, isEditing])

  // Thoát chế độ sửa khi sidebar đóng (bấm X, click ra ngoài) để không kẹt dirty.
  useEffect(() => {
    if (!isOpen) setIsEditing(false)
  }, [isOpen])

  // Đồng bộ cờ "có thay đổi chưa lưu" lên store để các nơi khác chặn thoát.
  useEffect(() => {
    if (!isEditing || !personDetail) {
      setEditDirty(false)
      return
    }
    const dirty =
      editForm.name !== (personDetail.name || "") ||
      editForm.gender !== (personDetail.gender || "M") ||
      editForm.level !== (personDetail.level?.toString() || "") ||
      editForm.dob !== (personDetail.dob || "") ||
      editForm.dod !== (personDetail.dod || "") ||
      editForm.description !== (personDetail.description || "") ||
      photoFile !== null ||
      (editPhotoUrl || null) !== (personDetail.photoUrl || null)
    setEditDirty(dirty)
  }, [isEditing, personDetail, editForm, photoFile, editPhotoUrl, setEditDirty])

  // Dọn cờ dirty khi unmount; cảnh báo khi đóng/refresh tab lúc đang có thay đổi.
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (useFamilyTreeStore.getState().isEditDirty) {
        // Gọi preventDefault() là đủ để trình duyệt hiện hộp thoại xác nhận rời trang
        // (thay cho e.returnValue đã deprecated).
        e.preventDefault()
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      setEditDirty(false)
    }
  }, [setEditDirty])

  if (!person) return null

  const detail = personDetail

  const onDataUpdate = async () => {
    await fetchData(chartId, false)
    if (person) {
      await fetchPersonDetail(chartId, person.personId)
    }
  }

  // ── save ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    setError(null)
    if (!editForm.level || editForm.level.trim() === "") {
      setError("Cần nhập đời")
      return
    }
    const levelNum = parseInt(editForm.level)
    if (isNaN(levelNum) || levelNum <= 0) {
      setError("Đời phải là số nguyên dương")
      return
    }

    setIsSaving(true)

    // Hoãn upload: chỉ đẩy ảnh mới lên Cloudinary đúng lúc lưu. Ảnh cũ do backend dọn.
    let finalPhotoUrl = editPhotoUrl
    if (photoFile) {
      try {
        finalPhotoUrl = await cloudinary.uploadImage(photoFile)
      } catch (err) {
        console.error("Avatar upload error:", err)
        setError("Tải ảnh lên thất bại. Vui lòng thử lại.")
        setIsSaving(false)
        return
      }
    }

    // Save original data for rollback
    const originalPersonData: Partial<typeof person> = {
      name: person.name,
      gender: person.gender,
      level: person.level,
      dob: person.dob,
      dod: person.dod,
      description: person.description,
      photoUrl: person.photoUrl,
    }

    // Build patch from edit form
    const patch = {
      name: editForm.name,
      gender: editForm.gender,
      level: levelNum,
      dob: editForm.dob || null,
      dod: editForm.dod || null,
      description: editForm.description || null,
      photoUrl: finalPhotoUrl ?? null,
    }

    // Optimistic update: apply immediately
    updatePersonLocally(person.personId, patch)
    setIsEditing(false)

    try {
      const token = useAuthStore.getState().token
      if (!token) throw new Error("Yêu cầu đăng nhập")

      await personApi.updatePerson(token, chartId, person.personId, {
        ...patch,
        photoUrl: finalPhotoUrl ?? "",
      })
      setPhotoFile(null)
      // Refresh person detail to keep sidebar relationships in sync
      await fetchPersonDetail(chartId, person.personId)
    } catch {
      // Rollback on failure
      updatePersonLocally(person.personId, originalPersonData)
      setIsEditing(true)
      setError("Cập nhật thất bại. Vui lòng thử lại.")
    } finally {
      setIsSaving(false)
    }
  }

  // ── cancel edit ──────────────────────────────────────────────────
  const handleCancelEdit = () => {
    if (detail) {
      setEditForm({
        name: detail.name || "",
        gender: detail.gender || "M",
        level: detail.level?.toString() || "",
        dob: detail.dob || "",
        dod: detail.dod || "",
        description: detail.description || "",
      })
      setEditPhotoUrl(detail.photoUrl || null)
    }
    setPhotoFile(null)
    setIsEditing(false)
    setError(null)
  }

  // ── close (X / có thể có thay đổi chưa lưu) ──────────────────────
  const handleRequestClose = async () => {
    if (isEditDirty) {
      const ok = await confirm({
        title: "Bỏ thay đổi?",
        description: "Bạn có các thay đổi chưa được lưu. Thoát và bỏ qua các thay đổi này?",
        confirmLabel: "Bỏ thay đổi",
        variant: "destructive",
      })
      if (!ok) return
    }
    closeSidebar()
  }

  // ── delete person ────────────────────────────────────────────────
  const deletePerson = async () => {
    const ok = await confirm({
      title: "Xóa thành viên",
      description: `Bạn có chắc chắn muốn xóa ${person.name}? Thao tác này cũng sẽ xóa tất cả các mối quan hệ của họ.`,
      confirmLabel: "Xóa",
      variant: "destructive",
    })
    if (!ok) return

    setIsDeleting(true)
    try {
      const token = useAuthStore.getState().token
      if (!token) throw new Error("Yêu cầu đăng nhập")

      // Ảnh đại diện trên Cloudinary do backend tự dọn khi xoá thành viên.
      await personApi.deletePerson(token, chartId, person.personId)
      await fetchData(chartId, false)
      closeSidebar()
    } catch {
      toast({ variant: "destructive", title: "Lỗi", description: "Xóa thành viên thất bại. Vui lòng thử lại." })
    } finally {
      setIsDeleting(false)
    }
  }

  // ── delete relationship ──────────────────────────────────────────
  const deleteRelationship = async (type: "father" | "mother" | "spouse" | "child", related: RelatedPerson) => {
    const labels: Record<string, string> = {
      father: "cha",
      mother: "mẹ",
      spouse: "vợ/chồng",
      child: "con",
    }
    const ok = await confirm({
      title: "Xóa quan hệ",
      description: `Xóa quan hệ ${labels[type]} với ${related.name}?`,
      confirmLabel: "Xóa",
      variant: "destructive",
    })
    if (!ok) return

    const key = `${type}-${related.personId}`
    setIsDeletingRel(key)
    try {
      const token = useAuthStore.getState().token
      if (!token) throw new Error("Yêu cầu đăng nhập")

      if (type === "father") {
        await treeApi.deleteFather(token, chartId, related.personId, person.personId)
      } else if (type === "mother") {
        await treeApi.deleteMother(token, chartId, related.personId, person.personId)
      } else if (type === "spouse") {
        await treeApi.deleteSpouse(token, chartId, person.personId, related.personId)
      } else if (type === "child") {
        // determine relationship type based on current person's gender
        if (detail?.gender === "M") {
          await treeApi.deleteFather(token, chartId, person.personId, related.personId)
        } else if (detail?.gender === "F") {
          await treeApi.deleteMother(token, chartId, person.personId, related.personId)
        }
      }

      await onDataUpdate()
    } catch {
      toast({ variant: "destructive", title: "Lỗi", description: "Xóa quan hệ thất bại. Vui lòng thử lại." })
    } finally {
      setIsDeletingRel(null)
    }
  }

  // ── click vào người thân → navigate sidebar ──────────────────────
  const handleRelPersonClick = async (personId: number) => {
    if (isEditDirty) {
      const ok = await confirm({
        title: "Bỏ thay đổi?",
        description: "Bạn có các thay đổi chưa được lưu. Thoát và bỏ qua các thay đổi này?",
        confirmLabel: "Bỏ thay đổi",
        variant: "destructive",
      })
      if (!ok) return
    }
    const target = people.find((p) => p.personId === personId)
    if (!target) return
    selectPerson(target)
    openSidebar()
  }

  return (
    <>
      <div
        className={`fixed right-0 top-0 h-full w-[400px] bg-card shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col border-l border-border ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <SidebarHeader
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          deletePerson={deletePerson}
          isDeleting={isDeleting}
          closeSidebar={handleRequestClose}
        />

        <div className="flex-1 overflow-y-auto">
          {personDetailLoading || !detail ? (
            <SidebarSkeleton />
          ) : isEditing ? (
              <SidebarEditMode
                error={error}
                setError={setError}
                editPhotoUrl={editPhotoUrl}
                onPhotoFileChange={setPhotoFile}
                onRemovePhoto={() => setEditPhotoUrl(null)}
                isSaving={isSaving}
                editForm={editForm}
                setEditForm={setEditForm}
                handleSave={handleSave}
                handleCancelEdit={handleCancelEdit}
            />
          ) : (
            <SidebarViewMode
              detail={detail}
              error={error}
              setShowAddSpouseModal={setShowAddSpouseModal}
              setShowAddChildModal={setShowAddChildModal}
              deleteRelationship={deleteRelationship}
              isDeletingRel={isDeletingRel}
              onPersonClick={handleRelPersonClick}
            />
          )}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────── */}
      {detail && (
        <>
          <AddChildModal
            isOpen={showAddChildModal}
            onClose={() => setShowAddChildModal(false)}
            parent={detail}
            onSuccess={() => {
              onDataUpdate()
              setShowAddChildModal(false)
            }}
            chartId={chartId}
          />
          <AddSpouseModal
            isOpen={showAddSpouseModal}
            onClose={() => setShowAddSpouseModal(false)}
            person={detail}
            onSuccess={() => {
              onDataUpdate()
              setShowAddSpouseModal(false)
            }}
            chartId={chartId}
          />
        </>
      )}

      {ConfirmDialog}
    </>
  )
}
