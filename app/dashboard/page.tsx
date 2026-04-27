"use client"

import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/stores/auth-store"
import { useEffect, useState } from "react"
import DashboardLayout from "@/components/dashboard-layout"
import UserChartSection from "@/components/user-chart-section"
import PublishedCharts from "@/components/published-charts-section"
import EditedChartsSection from "@/components/edited-charts-section"
import { Separator } from "@/components/ui/separator"

export default function DashboardPage() {
  const router = useRouter()
  const { user, token, isLoading } = useAuthStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isLoading && (!user || !token)) {
      router.push("/login")
    }
  }, [user, token, isLoading, router])

  if (!mounted || isLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        
        {/* Header Section */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Trang Quản Lý</h1>
          <p className="text-muted-foreground">
            Xin chào, <span className="font-semibold text-primary">{user.fullName || user.email}</span>!
          </p>
        </div>

        {/* User's Personal Chart Section */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
            🌳 Gia Phả Của Tôi
          </h2>
          <UserChartSection />
        </section>

        <Separator />
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
            🛠 Gia phả mà bạn có quyền chỉnh sửa
          </h2>
          <p className="text-muted-foreground mb-6">Danh sách các gia phả bạn đã tạo hoặc được chia sẻ để chỉnh sửa.</p>
          <EditedChartsSection />
        </section>

        <Separator />

        {/* Public Charts Section */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            🌍 Gia Phả Cộng Đồng
          </h2>
          <p className="text-muted-foreground mb-6">Khám phá các gia phả được chia sẻ công khai bởi cộng đồng.</p>
          <PublishedCharts />
        </section>

      </div>
    </DashboardLayout>
  )
}

