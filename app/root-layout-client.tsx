"use client"

import type { ReactNode } from "react"
import { Toaster } from "@/components/ui/toaster"

export default function RootLayoutClient({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  )
}

