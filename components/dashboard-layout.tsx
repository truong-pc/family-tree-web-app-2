"use client"

import type { ReactNode } from "react"
import DashboardNavbar from "./dashboard-navbar"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />
      <main>{children}</main>
    </div>
  )
}
