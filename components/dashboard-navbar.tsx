"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/stores/auth-store"
import { useState, useEffect, useRef } from "react"
import * as authApi from "@/lib/api/auth"
import { UserProfileDialog } from "@/components/user-profile-dialog"
import { UserChangePasswordDialog } from "@/components/user-changepassword-dialog"
import { Settings, KeyRound, LogOut } from "lucide-react"

export default function DashboardNavbar() {
  const router = useRouter()
  const { user, token, refreshToken, logout } = useAuthStore()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isDropdownOpen])

  const handleLogout = async () => {
    try {
      if (token && refreshToken) {
        await authApi.logout(token, refreshToken)
      }
    } catch (err) {
      console.error("Logout error:", err)
    } finally {
      logout()
      router.push("/")
    }
  }

  return (
    <nav className="border-b border-border bg-card ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex justify-between items-center">
          {/* Logo and Brand */}
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition">
            <img src="/icon.png" alt="Logo" className="w-10 h-10 object-contain" />
            <span className="font-bold text-2xl text-primary hidden sm:inline">Gia Phả</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-1">
            <Link href="/dashboard" className="px-3 py-2 rounded-md text-foreground hover:text-primary hover:bg-secondary transition font-medium">
              Trang Chủ
            </Link>
            <Link href="/news" className="px-3 py-2 rounded-md text-foreground hover:text-primary hover:bg-secondary transition font-medium">
              Tin Tức
            </Link>

            {/* My Account Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary transition"
              >
                <span className="text-foreground">Tài Khoản</span>
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-50">
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false)
                        setIsProfileOpen(true)
                      }}
                      className="w-full flex items-center justify-between gap-3 px-4 py-2 hover:bg-secondary rounded transition border-b border-border"
                    >
                      <div className="text-left min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{user?.fullName || user?.email}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                      </div>
                      <Settings className="w-5 h-5 text-muted-foreground shrink-0" />
                    </button>
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false)
                        setIsChangePasswordOpen(true)
                      }}
                      className="w-full flex items-center gap-2 text-left px-4 py-2 hover:bg-secondary rounded text-foreground transition"
                    >
                      <KeyRound className="w-4 h-4 shrink-0" />
                      Đổi Mật Khẩu
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 text-left px-4 py-2 hover:bg-destructive/10 text-destructive rounded transition"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
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
      <UserChangePasswordDialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen} />
    </nav>
  )
}
