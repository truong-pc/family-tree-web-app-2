import { apiClient } from "./client"

export const getPublishedCharts = async () => {
  const response = await apiClient.get("/api/v1/published-charts")
  return response.data
}

export const getMyChart = async (token: string) => {
  try {
    const response = await apiClient.get("/api/v1/charts/mine", {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      return null
    }
    throw error
  }
}

export const createChart = async (token: string, data: { name: string; description: string }) => {
  const response = await apiClient.post("/api/v1/charts", data, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const updateChart = async (token: string, chartId: string, data: { name?: string; description?: string; published?: boolean }) => {
  const response = await apiClient.patch(`/api/v1/charts/${chartId}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const deleteChart = async (token: string, chartId: string) => {
  const response = await apiClient.delete(`/api/v1/charts/${chartId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const addEditor = async (token: string, chartId: string, email: string) => {
  const response = await apiClient.post(`/api/v1/charts/${chartId}/editors`, { email }, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const removeEditor = async (token: string, chartId: string, email: string) => {
  const response = await apiClient.delete(`/api/v1/charts/${chartId}/editors/${email}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const getEditedCharts = async (token: string) => {
  try {
    const response = await apiClient.get("/api/v1/charts/edited", {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      return []
    }
    throw error
  }
}

export const getEditorName = async (token: string, userId: string) => {
  try {
    const response = await apiClient.get(`/api/v1/charts/editor-name?userId=${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  } catch (error) {
    console.error("Get editor name error:", error)
    throw error
  }
}
