import { apiClient } from "./client"

export const register = async (email: string, password: string, fullName: string, phone?: string, dob?: string) => {
  try {
    const response = await apiClient.post("/api/v1/auth/register", {
      email,
      password,
      fullName,
      phone,
      dob,
    })
    return response.data
  } catch (error) {
    console.error("Register error:", error)
    throw error
  }
}

export const login = async (email: string, password: string) => {
  try {
    const response = await apiClient.post("/api/v1/auth/login", {
      email,
      password,
    })
    return response.data
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      return Promise.reject(new Error("Invalid email or password"))
    }
    console.error("Login error :", error)
    throw error
  }
}

export const logout = async (token: string, refreshToken: string) => {
  try {
    const response = await apiClient.post(
      "/api/v1/auth/logout",
      { refreshToken: refreshToken },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    return response.data
  } catch (error) {
    console.error("Logout error:", error)
    throw error
  }
}

export const changePassword = async (token: string, oldPassword: string, newPassword: string) => { 
  try {
    const response = await apiClient.post(
      "/api/v1/auth/password/change",
      { oldPassword: oldPassword, newPassword: newPassword },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    return response.data
  } catch (error) {
    console.error("Password change error:", error)
    throw error
  }
}

export const forgotPassword = async (email: string) => {
  try {
    const response = await apiClient.post("/api/v1/auth/forgot-password", {
      email,
    })
    return response.data
  } catch (error) {
    console.error("Forgot password error:", error)
    throw error
  }
}

export const resetPassword = async (email: string, otp: string, newPassword: string) => {
  try {
    const response = await apiClient.post("/api/v1/auth/reset-password", {
      email,
      otp,
      newPassword: newPassword,
    })
    return response.data
  } catch (error) {
    console.error("Reset password error:", error)
    throw error
  }
}

export const getMe = async (token: string) => {
  try {
    const response = await apiClient.get("/api/v1/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  } catch (error) {
    console.error("Get me error:", error)
    throw error
  }
}

export const updateMe = async (token: string, data: { fullName?: string; phone?: string; dob?: string }) => {
  try {
    const response = await apiClient.put("/api/v1/auth/me", data, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  } catch (error) {
    console.error("Update me error:", error)
    throw error
  }
}
