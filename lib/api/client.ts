import axios from "axios"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

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
        const refreshToken = typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null

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
              
              // Lưu token mới
              if (accessToken && typeof window !== "undefined") {
                localStorage.setItem("token", accessToken)
                // Dispatch event để AuthContext cập nhật state token
                window.dispatchEvent(new CustomEvent("token-refreshed", { detail: accessToken }))
              }
              
              return accessToken
            } catch (err) {
              // Xóa token và redirect về login
              if (typeof window !== "undefined") {
                localStorage.removeItem("token")
                localStorage.removeItem("refreshToken")
                localStorage.removeItem("user")
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
