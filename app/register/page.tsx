"use client"

import Link from "next/link"
import RegisterForm from "@/components/register-form"
import { Button } from "@/components/ui/button"

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-secondary flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="text-4xl">🌳</div>
          <h1 className="text-3xl font-bold text-foreground">Đăng Ký Tài Khoản</h1>
          <p className="text-muted-foreground">Tạo tài khoản mới để bắt đầu quản lý gia phả</p>
        </div>

        <RegisterForm />

        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            Đã có tài khoản?{" "}
            <Link href="/login" className="text-primary hover:underline font-semibold">
              Đăng nhập
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
