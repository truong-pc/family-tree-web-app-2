"use client"

import { use, useEffect, useState } from "react"
import { useAuthStore } from "@/lib/stores/auth-store"
import DashboardNavbar from "@/components/dashboard-navbar"
import PublicNavbar from "@/components/public-navbar"
import NewsArticle from "@/components/news/news-article"

interface NewsDetailPageProps {
  params: Promise<{ postId: string }>
}

export default function NewsDetailPage({ params }: NewsDetailPageProps) {
  const { postId } = use(params)
  const { user, token } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isAuthed = mounted && !!user && !!token

  return (
    <>
      {isAuthed ? <DashboardNavbar /> : <PublicNavbar />}
      <NewsArticle postId={postId} />
    </>
  )
}
