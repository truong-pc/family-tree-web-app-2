"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

interface User {
  id: string
  email: string
  fullName?: string
}

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isLoading: boolean

  // Actions
  login: (token: string, refreshToken: string, user: User) => void
  logout: () => void
  updateUser: (userData: Partial<User>) => void
  setToken: (token: string) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isLoading: true,

      login: (token, refreshToken, user) => {
        set({ token, refreshToken, user, isLoading: false })
      },

      logout: () => {
        set({ user: null, token: null, refreshToken: null, isLoading: false })
      },

      updateUser: (userData) => {
        const currentUser = get().user
        if (currentUser) {
          set({ user: { ...currentUser, ...userData } })
        }
      },

      setToken: (token) => {
        set({ token })
      },

      setLoading: (loading) => {
        set({ isLoading: loading })
      },
    }),
    {
      name: "auth-storage",
      // Persist chỉ lưu user, token, refreshToken vào localStorage
      // isLoading không cần persist
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => {
        return (_state, error) => {
          if (error) {
            console.error("Error rehydrating auth store:", error)
          }
          // Dùng queueMicrotask để tránh circular reference (TDZ)
          // vì callback này chạy đồng bộ trong quá trình khởi tạo store
          queueMicrotask(() => {
            useAuthStore.setState({ isLoading: false })
          })
        }
      },
    }
  )
)
