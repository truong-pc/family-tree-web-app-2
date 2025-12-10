"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await api.login(email, password)
      // Assume response has access_token and refresh_token
      const token = response.access_token || response.token
      const refreshToken = response.refresh_token

      // Get user info
      const userInfo = await api.getMe(token)

      login(token, refreshToken, {
        id: userInfo.id,
        email: userInfo.email,
        full_name: userInfo.full_name,
      })

      router.push("/dashboard")
    } catch (err) {
      setError("Đăng nhập thất bại. Vui lòng kiểm tra email và mật khẩu.")
      console.error("Login error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="p-6 border border-border">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
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

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Mật Khẩu
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

        {error && <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">{error}</div>}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Đang đăng nhập..." : "Đăng Nhập"}
        </Button>
      </form>
    </Card>
  )
}
