"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/stores/auth-store"
import DashboardLayout from "@/components/dashboard-layout"
import NewsManagePage from "@/components/news/news-manage-page"

interface NewsManageRouteProps {
  params: Promise<{ chartId: string }>
}

export default function NewsManageRoute({ params }: NewsManageRouteProps) {
  const { chartId } = use(params)
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
      <NewsManagePage chartId={chartId} />
    </DashboardLayout>
  )
}
