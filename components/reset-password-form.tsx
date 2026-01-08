"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

export function ResetPasswordForm() {
  const router = useRouter()
  
  // Step 1: Request OTP
  const [email, setEmail] = useState("")
  const [isLoadingSendOTP, setIsLoadingSendOTP] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [otpSent, setOtpSent] = useState(false)
  
  // Step 2: Verify OTP and Reset Password
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoadingReset, setIsLoadingReset] = useState(false)
  const [attemptsRemaining, setAttemptsRemaining] = useState(5)
  
  // Messages
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage("")
    setSuccessMessage("")

    if (!email) {
      setErrorMessage("Please enter your email address")
      return
    }

    setIsLoadingSendOTP(true)

    try {
      const response = await api.forgotPassword(email)
      setSuccessMessage(response.message || "OTP sent to your email")
      setOtpSent(true)
      setCountdown(60) // 60 second countdown
      setAttemptsRemaining(5) // Reset attempts when new OTP is sent
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status
        const detail = error.response.data?.detail

        if (status === 404) {
          setErrorMessage(detail || "User with this email does not exist")
        } else if (status === 429) {
          setErrorMessage(detail || "Too many requests. Please try again later.")
        } else {
          setErrorMessage("An error occurred. Please try again.")
        }
      } else {
        setErrorMessage("Network error. Please check your connection.")
      }
    } finally {
      setIsLoadingSendOTP(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage("")
    setSuccessMessage("")

    // Validation
    if (!otp || !newPassword || !confirmPassword) {
      setErrorMessage("Please fill in all fields")
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match")
      return
    }

    if (newPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters long")
      return
    }

    setIsLoadingReset(true)

    try {
      const response = await api.resetPassword(email, otp, newPassword)
      setSuccessMessage(response.message || "Password reset successfully")
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status
        const detail = error.response.data?.detail

        if (status === 400) {
          setErrorMessage(detail || "Invalid OTP or request")
        } else if (status === 429) {
          // Extract remaining attempts from error message if available
          if (detail && detail.includes("attempts remaining")) {
            const match = detail.match(/(\d+) attempts remaining/)
            if (match) {
              const remaining = parseInt(match[1])
              setAttemptsRemaining(remaining)
            }
            setErrorMessage(detail)
          } else {
            setErrorMessage(detail || "Too many failed attempts")
          }
        } else {
          setErrorMessage("An error occurred. Please try again.")
        }
      } else {
        setErrorMessage("Network error. Please check your connection.")
      }
    } finally {
      setIsLoadingReset(false)
    }
  }

  const handleResendOTP = () => {
    handleSendOTP(new Event("submit") as any)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{otpSent ? "Verify OTP" : "Request OTP"}</CardTitle>
        <CardDescription>
          {otpSent 
            ? "Enter the OTP code sent to your email and your new password" 
            : "Enter your email address to receive an OTP code"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {errorMessage && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        
        {successMessage && (
          <Alert className="mb-4 border-green-500 bg-green-50 text-green-900">
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {!otpSent ? (
          // Step 1: Request OTP
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoadingSendOTP}
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoadingSendOTP || countdown > 0}
            >
              {isLoadingSendOTP && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {countdown > 0 ? `Resend in ${countdown}s` : "Send OTP"}
            </Button>
            <div className="text-center text-sm">
              <a href="/login" className="text-blue-600 hover:underline">
                Back to login
              </a>
            </div>
          </form>
        ) : (
          // Step 2: Verify OTP and Reset Password
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-display">Email</Label>
              <Input
                id="email-display"
                type="email"
                value={email}
                disabled
                className="bg-gray-50"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="otp">OTP Code</Label>
              <Input
                id="otp"
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                disabled={isLoadingReset}
                maxLength={6}
                required
              />
              {attemptsRemaining < 5 && (
                <p className="text-sm text-orange-600">
                  {attemptsRemaining} attempts remaining
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoadingReset}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoadingReset}
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoadingReset}
            >
              {isLoadingReset && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reset Password
            </Button>

            <div className="flex flex-col gap-2 text-center text-sm">
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={countdown > 0 || isLoadingSendOTP}
                className="text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline"
              >
                {countdown > 0 ? `Resend OTP in ${countdown}s` : "Resend OTP"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false)
                  setOtp("")
                  setNewPassword("")
                  setConfirmPassword("")
                  setErrorMessage("")
                  setSuccessMessage("")
                }}
                className="text-gray-600 hover:underline"
              >
                Change other account 
              </button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
