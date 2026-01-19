"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface Chart {
  _id: string
  name: string | null
  description: string | null
  ownerName: string | null
  createdAt: string
}

export default function PublishedCharts() {
  const [charts, setCharts] = useState<Chart[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchCharts = async () => {
      try {
        console.log("Starting fetch published charts...")
        const data = await api.getPublishedCharts()
        console.log("Successfully fetched charts:", data)
        setCharts(data || [])
        setError("")
      } catch (err) {
        console.error("Published charts fetch failed:", err)
        setError("Không thể kết nối đến máy chủ. Vui lòng kiểm tra backend đang chạy ở http://localhost:8000")
        setCharts([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchCharts()
  }, [])

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6 bg-yellow-50 border border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800">
        <div className="space-y-2">
          <p className="font-semibold text-yellow-800 dark:text-yellow-200">⚠️ Lỗi Kết Nối</p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">{error}</p>
        </div>
      </Card>
    )
  }

  if (charts.length === 0) {
    return (
      <Card className="p-12 text-center border border-border">
        <p className="text-muted-foreground mb-4">Chưa có gia phả nào được chia sẻ công khai</p>
        <Link href="/register">
          <Button>Tạo Gia Phả Đầu Tiên Của Bạn</Button>
        </Link>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {charts.map((chart) => (
        <Card key={chart._id} className="p-6 border border-border hover:border-primary/50 transition-colors">
          <h3 className="text-lg font-semibold text-foreground mb-2">{chart.name || "Không có tên"}</h3>
          <p className="text-muted-foreground text-sm mb-4 line-clamp-3">{chart.description || "Không có mô tả"}</p>
          <p className="text-xs text-muted-foreground mb-4">Chia sẻ bởi: {chart.ownerName || "Ẩn danh"}</p>
          <Link href={`/published-tree/${chart._id}`}>
            <Button variant="outline" className="w-full bg-transparent">
              Xem Sơ Đồ Phả Hệ
            </Button>
          </Link>
        </Card>
      ))}
    </div>
  )
}
