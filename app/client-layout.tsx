"use client"

import type React from "react"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/lib/auth-context"

export function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      <AuthProvider>{children}</AuthProvider>
      <Analytics />
    </>
  )
}
