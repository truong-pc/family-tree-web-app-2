"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useState } from "react"
import { api } from "@/lib/api"
import { UserProfileDialog } from "@/components/user-profile-dialog"

export default function DashboardNavbar() {
  const router = useRouter()
  const { user, token, refreshToken, logout } = useAuth()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const handleLogout = async () => {
    try {
      if (token && refreshToken) {
        await api.logout(token, refreshToken)
      }
    } catch (err) {
      console.error("Logout error:", err)
    } finally {
      logout()
      router.push("/")
    }
  }

  return (
    <nav className="border-b border-border bg-card sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          {/* Logo and Brand */}
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition">
            <img src="/icon.png" alt="Logo" className="w-10 h-10 object-contain" />
            <span className="font-bold text-lg text-foreground">Gia Phả</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-foreground hover:text-primary transition font-medium">
              Trang Chủ
            </Link>
            <Link href="/dashboard/edited" className="text-foreground hover:text-primary transition font-medium">
              Gia Phả Chỉnh Sửa
            </Link>

            {/* My Account Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary transition"
              >
                <span className="text-xl">👤</span>
                <span className="text-foreground">Tài Khoản</span>
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg">
                  <div className="p-2">
                    <p className="px-4 py-2 text-sm text-muted-foreground border-b border-border">{user?.full_name || user?.email}</p>
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false)
                        setIsProfileOpen(true)
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-secondary rounded text-foreground transition"
                    >
                      Thông Tin Tài Khoản
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 hover:bg-destructive/10 text-destructive rounded transition"
                    >
                      Đăng Xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <UserProfileDialog open={isProfileOpen} onOpenChange={setIsProfileOpen} />
    </nav>
  )
}
