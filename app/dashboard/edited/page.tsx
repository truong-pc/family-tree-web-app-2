"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import DashboardLayout from "@/components/dashboard-layout"
import { useRouter } from "next/navigation"

interface Chart {
  id: string
  name: string
  description: string
  owner: {
    email: string
  }
}

export default function EditedChartsPage() {
  const router = useRouter()
  const { token, isLoading: authLoading } = useAuth()
  const [charts, setCharts] = useState<Chart[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!authLoading && !token) {
      router.push("/login")
    }
  }, [token, authLoading, router])

  useEffect(() => {
    const fetchCharts = async () => {
      if (!token) return

      try {
        const data = await api.getEditedCharts(token)
        setCharts(Array.isArray(data) ? data : [])
      } catch (err) {
        setError("Không thể tải danh sách gia phả")
        console.error("Fetch edited charts error:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCharts()
  }, [token])

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Gia Phả Chỉnh Sửa</h1>
        <p className="text-muted-foreground mb-8">Các gia phả mà bạn được phép chỉnh sửa</p>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <Card className="p-6 bg-destructive/10 border border-destructive/20">
            <p className="text-destructive">{error}</p>
          </Card>
        ) : charts.length === 0 ? (
          <Card className="p-12 text-center border border-border">
            <p className="text-muted-foreground">Bạn chưa được mời chỉnh sửa gia phả nào</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {charts.map((chart) => (
              <Card key={chart.id} className="p-6 border border-border hover:border-primary/50 transition-colors">
                <h3 className="text-lg font-semibold text-foreground mb-2">{chart.name}</h3>
                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                  {chart.description || "Không có mô tả"}
                </p>
                <p className="text-xs text-muted-foreground mb-4">Chủ sở hữu: {chart.owner?.email}</p>
                <Button variant="outline" className="w-full bg-transparent">
                  Chỉnh Sửa
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
