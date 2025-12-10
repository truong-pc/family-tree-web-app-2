"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import LoginForm from "@/components/login-form"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-secondary flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="text-4xl">🌳</div>
          <h1 className="text-3xl font-bold text-foreground">Đăng Nhập</h1>
          <p className="text-muted-foreground">Quay lại với hệ thống quản lý gia phả của bạn</p>
        </div>

        <LoginForm />

        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            Chưa có tài khoản?{" "}
            <Link href="/register" className="text-primary hover:underline font-semibold">
              Đăng ký ngay
            </Link>
          </p>
          <Link href="/">
            <Button variant="ghost" className="w-full">
              ← Quay lại trang chủ
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
