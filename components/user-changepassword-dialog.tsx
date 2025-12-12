"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface UserChangePasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserChangePasswordDialog({ open, onOpenChange }: UserChangePasswordDialogProps) {
  const router = useRouter()
  const { token, logout } = useAuth()
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validate
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("Vui lòng điền đầy đủ thông tin")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu mới không khớp")
      return
    }

    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự")
      return
    }

    if (oldPassword === newPassword) {
      setError("Mật khẩu mới không được trùng với mật khẩu cũ")
      return
    }

    setIsLoading(true)

    try {
      if (!token) {
        setError("Bạn chưa đăng nhập")
        return
      }

      const response = await api.changePassword(token, oldPassword, newPassword)
      
      // Đóng dialog
      onOpenChange(false)
      
      // Reset form
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
      
      // Hiển thị thông báo
      alert(response.message || "Đổi mật khẩu thành công! Vui lòng đăng nhập lại.")
      
      // Logout và chuyển về trang login
      logout()
      router.push("/login")
    } catch (err: any) {
      console.error("Change password error:", err)
      const errorMessage = err.response?.data?.detail || "Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu cũ."
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setOldPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setError("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Đổi Mật Khẩu</DialogTitle>
          <DialogDescription>
            Nhập mật khẩu cũ và mật khẩu mới để thay đổi. Bạn sẽ cần đăng nhập lại sau khi đổi mật khẩu.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="oldPassword">Mật khẩu cũ</Label>
              <Input
                id="oldPassword"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Nhập mật khẩu cũ"
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newPassword">Mật khẩu mới</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                disabled={isLoading}
              />
            </div>
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Hủy
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Đang xử lý..." : "Đổi mật khẩu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
