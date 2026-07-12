"use client"

/**
 * public-navbar.tsx
 * Thanh điều hướng cho khách chưa đăng nhập (trang chủ, tin tức công khai).
 * Tách ra từ phần Navigation của trang chủ để dùng chung nhiều nơi.
 */

import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function PublicNavbar() {
  return (
    <nav className="border-b border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <Link
          href="/"
          className="flex items-center gap-3 text-2xl font-bold text-primary hover:opacity-80 transition"
        >
          <img src="/icon.png" alt="Logo" className="w-10 h-10 object-contain" />
          <span className="hidden sm:inline">Hệ Thống Quản Lý Gia Phả</span>
        </Link>
        <div className="flex gap-2 sm:gap-4 items-center">
          <Link href="/news" className="px-3 py-2 rounded-md text-foreground hover:text-primary transition font-medium">
            Tin Tức
          </Link>
          <Link href="/login">
            <Button variant="outline">Đăng Nhập</Button>
          </Link>
          <Link href="/register">
            <Button>Đăng Ký</Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}
