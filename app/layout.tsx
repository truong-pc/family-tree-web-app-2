import type React from "react"
import type { Metadata } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import RootLayoutClient from "./root-layout-client"

const _inter = Inter({ 
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
})
// const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Quản Lý Gia Phả - Family Tree Management",
  description: "Hệ thống quản lý cây gia phả dòng họ - Manage your family tree efficiently",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
    ],
  },
  openGraph: {
    title: "Quản Lý Gia Phả - Family Tree Management",
    description:
      "Hệ thống quản lý cây gia phả dòng họ - Manage your family tree efficiently",
    images: [{ url: "/icon.png" }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi">
      <body className={`${_inter.variable} font-sans antialiased`}>
        <RootLayoutClient>{children}</RootLayoutClient>
        <Analytics />
      </body>
    </html>
  )
}
