"use client"

import React, { useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import * as treeApi from "@/lib/api/tree"
import { useFamilyTreeStore } from "@/lib/stores/family-tree-store"
import { useAuthStore } from "@/lib/stores/auth-store"

interface DelRelationshipModalProps {
  chartId: string
}

type RelType = "FATHER" | "MOTHER" | "SPOUSE";

export default function DelRelationshipModal({ chartId }: DelRelationshipModalProps) {
  const { showDelRelationshipModal: isOpen, toggleModal, fetchData } = useFamilyTreeStore()

  const [relType, setRelType] = useState<RelType>("FATHER")
  const [id1, setId1] = useState<string>("")
  const [id2, setId2] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!id1 || !id2) {
      setError("Vui lòng nhập cả hai ID")
      return
    }

    if (id1 === id2) {
      setError("ID không được giống nhau")
      return
    }

    const typeName = relType === "FATHER" ? "cha-con" : relType === "MOTHER" ? "mẹ-con" : "vợ-chồng"
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa mối quan hệ ${typeName} giữa ID ${id1} và ID ${id2}?`
    )

    if (!confirmed) return

    setIsSubmitting(true)
    
    try {
      const token = useAuthStore.getState().token
      if (!token) throw new Error("Yêu cầu đăng nhập")

      const p1 = parseInt(id1)
      const p2 = parseInt(id2)

      if (relType === "FATHER") {
        await treeApi.deleteFather(token, chartId, p1, p2)
      } else if (relType === "MOTHER") {
        await treeApi.deleteMother(token, chartId, p1, p2)
      } else if (relType === "SPOUSE") {
        await treeApi.deleteSpouse(token, chartId, p1, p2)
      }

      // Reset form
      setId1("")
      setId2("")
      
      fetchData(chartId, false)
      toggleModal("delRelationship", false)
    } catch (error: any) {
      console.error("Error deleting relationship:", error)
      if (error.response?.status === 404) {
        setError("Quan hệ không tồn tại hoặc đã bị xóa")
      } else {
        setError(error.response?.data?.detail || error.response?.data?.message || "Xóa quan hệ thất bại. Vui lòng thử lại.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setId1("")
      setId2("")
      setError(null)
      toggleModal("delRelationship", false)
    }
  }

  const labels = {
    FATHER: { p1: "ID Cha", p2: "ID Con" },
    MOTHER: { p1: "ID Mẹ", p2: "ID Con" },
    SPOUSE: { p1: "ID Người 1", p2: "ID Người 2" },
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Xóa quan hệ</DialogTitle>
          <DialogDescription>
            Xóa bỏ mối quan hệ giữa hai thành viên.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>Loại quan hệ</Label>
            <Select value={relType} onValueChange={(val: RelType) => setRelType(val)} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn loại" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FATHER">Cha (P1 là Cha của P2)</SelectItem>
                <SelectItem value="MOTHER">Mẹ (P1 là Mẹ của P2)</SelectItem>
                <SelectItem value="SPOUSE">Vợ/Chồng (P1 và P2 là Vợ/Chồng)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="p1">{labels[relType].p1} *</Label>
            <Input
              id="p1"
              type="text"
              value={id1}
              onChange={(e) => setId1(e.target.value)}
              placeholder="Nhập ID"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="p2">{labels[relType].p2} *</Label>
            <Input
              id="p2"
              type="text"
              value={id2}
              onChange={(e) => setId2(e.target.value)}
              placeholder="Nhập ID"
              disabled={isSubmitting}
            />
          </div>

          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm mt-4">
            <p className="font-medium mb-1">Cảnh báo:</p>
            <p>
              Hành động này sẽ xóa vĩnh viễn mối quan hệ giữa hai thành viên này.
              Thao tác này không thể hoàn tác.
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? "Đang xóa..." : "Xóa quan hệ"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
