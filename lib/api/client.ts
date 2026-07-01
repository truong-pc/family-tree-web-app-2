import axios from "axios"
import { useAuthStore } from "@/lib/stores/auth-store"
import { getClientId } from "@/lib/clientId"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Đính kèm X-Client-Id vào mọi request (chỉ client-side, nơi có tab uuid).
// Backend echo giá trị này vào `originId` của tree.changed để FE bỏ echo của chính mình.
if (typeof window !== "undefined") {
  apiClient.defaults.headers.common["X-Client-Id"] = getClientId()
}

// Promise để tránh race condition khi nhiều request cùng refresh token
let refreshTokenPromise: Promise<string> | null = null

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Nếu gặp lỗi 401 Unauthorized và request này chưa từng được retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        const refreshToken = useAuthStore.getState().refreshToken

        if (!refreshToken) {
          return Promise.reject(error)
        }

        // Nếu chưa có refresh nào đang chạy, tạo mới
        if (!refreshTokenPromise) {
          refreshTokenPromise = (async () => {
            try {
              // Gọi API refresh token
              const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
                refreshToken: refreshToken,
              })
              
              const { accessToken } = response.data
              
              // Cập nhật token mới vào Zustand store (persist middleware tự sync localStorage)
              if (accessToken) {
                useAuthStore.getState().setToken(accessToken)
              }
              
              return accessToken
            } catch (err) {
              // Xóa token và redirect về login
              useAuthStore.getState().logout()
              if (typeof window !== "undefined") {
                alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.")
                window.location.href = "/login"
              }
              throw err
            } finally {
              // Reset promise để lần sau có thể refresh lại
              refreshTokenPromise = null
            }
          })()
        }

        // Tất cả request đều chờ cùng 1 promise refresh
        const newToken = await refreshTokenPromise

        if (newToken) {
          // Cập nhật token mới và retry request
          originalRequest.headers["Authorization"] = `Bearer ${newToken}`
          return apiClient(originalRequest)
        }
      } catch (refreshError) {
        console.error("Refresh token failed:", refreshError)
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  },
)
