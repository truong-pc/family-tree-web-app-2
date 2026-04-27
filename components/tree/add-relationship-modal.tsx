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

interface AddRelationshipModalProps {
  chartId: string
}

type RelType = "FATHER" | "MOTHER" | "SPOUSE";

export default function AddRelationshipModal({ chartId }: AddRelationshipModalProps) {
  const { showAddRelationshipModal: isOpen, toggleModal, fetchData } = useFamilyTreeStore()

  const [relType, setRelType] = useState<RelType>("FATHER")
  const [id1, setId1] = useState<string>("")
  const [id2, setId2] = useState<string>("")
  const [order, setOrder] = useState<number>(1)
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
      setError("Không thể kết nối một người với chính họ")
      return
    }

    setIsSubmitting(true)
    try {
      const token = useAuthStore.getState().token
      if (!token) throw new Error("Yêu cầu đăng nhập")

      const p1 = parseInt(id1)
      const p2 = parseInt(id2)

      if (relType === "FATHER") {
        await treeApi.setFather(token, chartId, p1, p2, order)
      } else if (relType === "MOTHER") {
        await treeApi.setMother(token, chartId, p1, p2, order)
      } else if (relType === "SPOUSE") {
        await treeApi.setSpouse(token, chartId, p1, p2, order)
      }

      // Reset form
      setId1("")
      setId2("")
      setOrder(1)
      
      fetchData(chartId, false)
      toggleModal("addRelationship", false)
    } catch (error: any) {
      console.error("Error creating relationship:", error)
      if (error.response?.status === 404) {
        setError("Một trong hai ID đã nhập không tìm thấy")
      } else {
        setError(error.response?.data?.detail || error.response?.data?.message || "Tạo quan hệ thất bại. Vui lòng thử lại.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setId1("")
      setId2("")
      setOrder(1)
      setError(null)
      toggleModal("addRelationship", false)
    }
  }

  const labels = {
    FATHER: { p1: "ID Cha", p2: "ID Con", order: "Thứ tự sinh" },
    MOTHER: { p1: "ID Mẹ", p2: "ID Con", order: "Thứ tự sinh" },
    SPOUSE: { p1: "ID Người 1", p2: "ID Người 2", order: "Thứ tự vợ/chồng" },
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Thêm quan hệ</DialogTitle>
          <DialogDescription>
            Tạo mối quan hệ giữa hai thành viên hiện có bằng ID của họ.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="p1">{labels[relType].p1} *</Label>
              <Input
                id="p1"
                type="text"
                value={id1}
                onChange={(e) => setId1(e.target.value)}
                placeholder="ID Thành viên"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="p2">{labels[relType].p2} *</Label>
              <Input
                id="p2"
                type="text"
                value={id2}
                onChange={(e) => setId2(e.target.value)}
                placeholder="ID Thành viên"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="order">{labels[relType].order}</Label>
            <Input
              id="order"
              type="number"
              min="1"
              value={order}
              onChange={(e) => setOrder(parseInt(e.target.value) || 1)}
              disabled={isSubmitting}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-sm mt-4">
            <p className="font-medium mb-1">Lưu ý:</p>
            <p>
              Vui lòng nhập đúng ID của cả hai người. Bạn có thể tìm thấy ID trong thanh bên khi nhấn vào một người trên sơ đồ.
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang tạo..." : "Tạo quan hệ"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
