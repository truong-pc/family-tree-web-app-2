"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/stores/auth-store"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useEffect, useState } from "react"
import PublishedCharts from "@/components/published-charts-section"

export default function HomePage() {
  const router = useRouter()
  const { user, token, isLoading } = useAuthStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isLoading && user && token) {
      router.push("/dashboard")
    }
  }, [user, token, isLoading, router])

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-secondary">
      {/* Navigation */}
      <nav className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 text-2xl font-bold text-primary">
            <img src="/icon.png" alt="Logo" className="w-10 h-10 object-contain" />
            Hệ Thống Quản Lý Gia Phả
          </div>
          <div className="flex gap-4">
            <Link href="/login">
              <Button variant="outline">Đăng Nhập</Button>
            </Link>
            <Link href="/register">
              <Button>Đăng Ký</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center space-y-8">
          <h1 className="text-5xl md:text-6xl font-bold text-balance text-foreground">
            Chào Mừng Đến Với 
          </h1>
          <h1 className="text-5xl md:text-6xl font-bold text-balance text-foreground">
            <span className="text-primary">Hệ Thống Quản Lý Gia Phả</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Quản lý cây gia phả dòng họ của bạn một cách dễ dàng, hiệu quả và an toàn. Lưu trữ thông tin gia đình, duy
            trì mối quan hệ và chia sẻ công khai với cộng đồng.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/register">
              <Button size="lg" className="px-8">
                Bắt Đầu Ngay
              </Button>
            </Link>
            <Link href="#published-charts">
              <Button size="lg" variant="outline" className="px-8 bg-transparent">
                Xem Gia Phả Công Khai
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="p-6 border border-border">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Quản Lý Dễ Dàng</h3>
            <p className="text-muted-foreground">
              Tạo và quản lý cây gia phả của bạn với giao diện thân thiện, dễ sử dụng.
            </p>
          </Card>
          <Card className="p-6 border border-border">
            <div className="text-3xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Bảo Mật Cao</h3>
            <p className="text-muted-foreground">
              Dữ liệu gia đình của bạn được bảo vệ bằng các tiêu chuẩn bảo mật tối tân.
            </p>
          </Card>
          <Card className="p-6 border border-border">
            <div className="text-3xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Chia Sẻ Công Khai</h3>
            <p className="text-muted-foreground">Lựa chọn chia sẻ công khai gia phả của bạn để mọi người cùng xem.</p>
          </Card>
        </div>
      </section>

      {/* Published Charts Section */}
      <section id="published-charts" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
          Gia Phả Các Dòng Họ Đã Chia Sẻ Công Khai
        </h2>
        <PublishedCharts />
      </section>
    </main>
  )
}
