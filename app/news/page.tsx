"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/lib/stores/auth-store"
import DashboardNavbar from "@/components/dashboard-navbar"
import PublicNavbar from "@/components/public-navbar"
import NewsFeed from "@/components/news/news-feed"

export default function NewsPage() {
  const { user, token } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isAuthed = mounted && !!user && !!token

  return (
    <>
      {isAuthed ? <DashboardNavbar /> : <PublicNavbar />}
      <NewsFeed />
    </>
  )
}
