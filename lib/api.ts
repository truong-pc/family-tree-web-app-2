import axios from "axios"
// console.log("API base URL:", process.env.NEXT_PUBLIC_API_BASE_URL);
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  // withCredentials: true,
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
                refresh_token: refreshToken,
              })
              
              const { access_token } = response.data
              
              // Lưu token mới
              if (access_token && typeof window !== "undefined") {
                localStorage.setItem("token", access_token)
              }
              
              return access_token
            } catch (err) {
              // Xóa token và redirect về login
              if (typeof window !== "undefined") {
                localStorage.removeItem("token")
                localStorage.removeItem("refreshToken")
                localStorage.removeItem("user")
                alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.")
                setTimeout(() => {
                  window.location.href = "/login"
                }, 2000)
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

export const api = {
  async register(email: string, password: string, full_name: string, phone?: string, dob?: string) {
    try {
      const response = await apiClient.post("/api/v1/auth/register", {
        email,
        password,
        full_name,
        phone,
        dob,
      })
      return response.data
    } catch (error) {
      console.error("Register error:", error)
      throw error
    }
  },

  async login(email: string, password: string) {
    try {
      const response = await apiClient.post("/api/v1/auth/login", {
        email,
        password,
      })
      return response.data
    } catch (error) {
      console.error("Login error:", error)
      throw error
    }
  },

  async getMe(token: string) {
    try {
      const response = await apiClient.get("/api/v1/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.data
    } catch (error) {
      console.error("Get me error:", error)
      throw error
    }
  },

  async updateMe(token: string, data: { full_name?: string; phone?: string; dob?: string }) {
    try {
      const response = await apiClient.put("/api/v1/auth/me", data, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.data
    } catch (error) {
      console.error("Update me error:", error)
      throw error
    }
  },

  // --- Chart APIs ---
  
  async getPublishedCharts() {
    const response = await apiClient.get("/api/v1/published-charts")
    return response.data
  },

  async getMyChart(token: string) {
    try {
      const response = await apiClient.get("/api/v1/charts/mine", {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.data
    } catch (error: any) {
      // Nếu lỗi 404 nghĩa là chưa có chart
      if (error.response && error.response.status === 404) {
        return null
      }
      throw error
    }
  },

  async createChart(token: string, data: { name: string; description: string }) {
    const response = await apiClient.post("/api/v1/charts", data, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  },

  async updateChart(token: string, chartId: string, data: { name?: string; description?: string; published?: boolean }) {
    const response = await apiClient.patch(`/api/v1/charts/${chartId}`, data, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  },

  async deleteChart(token: string, chartId: string) {
    const response = await apiClient.delete(`/api/v1/charts/${chartId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  },

  async addEditor(token: string, chartId: string, email: string) {
    const response = await apiClient.post(`/api/v1/charts/${chartId}/editors`, { email }, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  },

  async removeEditor(token: string, chartId: string, email: string) {
    const response = await apiClient.delete(`/api/v1/charts/${chartId}/editors/${email}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  },

  async getEditedCharts(token: string) {
    const response = await apiClient.get("/api/v1/charts/edited", {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  }
}