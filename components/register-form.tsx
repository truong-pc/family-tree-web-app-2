"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function RegisterForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [dob, setDob] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Mật khẩu không khớp")
      return
    }

    setIsLoading(true)

    try {
      await api.register(email, password, fullName, phone || undefined, dob || undefined)

      // Auto login after registration
      const loginResponse = await api.login(email, password)
      const token = loginResponse.access_token || loginResponse.token
      const refreshToken = loginResponse.refresh_token

      const userInfo = await api.getMe(token)

      login(token, refreshToken, {
        id: userInfo.userId || userInfo.id, // Handle both userId (from spec) and id (potential legacy)
        email: userInfo.email,
      })

      router.push("/dashboard")
    } catch (err) {
      setError("Đăng ký thất bại. Vui lòng thử lại.")
      console.error("Register error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="p-6 border border-border">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="fullName" className="text-sm font-medium text-foreground">
            Họ và Tên <span className="text-red-500">*</span>
          </label>
          <Input
            id="fullName"
            type="text"
            placeholder="Nguyễn Văn A"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            disabled={isLoading}
            className="bg-background border border-border"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email <span className="text-red-500">*</span>
          </label>
          <Input
            id="email"
            type="email"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            className="bg-background border border-border"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium text-foreground">
              Số Điện Thoại
            </label>
            <Input
              id="phone"
              type="tel"
              placeholder="0912345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isLoading}
              className="bg-background border border-border"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="dob" className="text-sm font-medium text-foreground">
              Ngày Sinh
            </label>
            <Input
              id="dob"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              disabled={isLoading}
              className="bg-background border border-border"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Mật Khẩu <span className="text-red-500">*</span>
          </label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            className="bg-background border border-border"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
            Xác Nhận Mật Khẩu <span className="text-red-500">*</span>
          </label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isLoading}
            className="bg-background border border-border"
          />
        </div>

        {error && <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">{error}</div>}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Đang đăng ký..." : "Đăng Ký"}
        </Button>
      </form>
    </Card>
  )
}
