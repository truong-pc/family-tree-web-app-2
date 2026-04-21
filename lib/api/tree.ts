import { apiClient } from "./client"

export const getPublishedTree = async (chartId: string) => {
  try {
    const response = await apiClient.get(`/api/v1/charts/${chartId}/tree/published` )
    return response.data
  } catch (error) {
    console.error("Get published tree error:", error)
    throw error
  }
}

export const getChartTree = async (token: string, chartId: string) => {
  try {
    const response = await apiClient.get(`/api/v1/charts/${chartId}/tree`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  } catch (error) {
    console.error("Get chart tree error:", error)
    throw error
  }
}

export const createParentChildRelationship = async (token: string, chartId: string, parentId: number, childId: number) => {
  try {
    const response = await apiClient.post(
      `/api/v1/charts/${chartId}/relationships/parent-of`,
      { parentId, childId },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    return response.data
  } catch (error: any) {
    console.error("Create relationship error:", error)
    throw error
  }
}

export const deleteParentChildRelationship = async (token: string, chartId: string, parentId: number, childId: number) => {
  try {
    const response = await apiClient.delete(`/api/v1/charts/${chartId}/relationships/parent-of`, {
      data: { parentId, childId },
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  } catch (error) {
    console.error("Delete relationship error:", error)
    throw error
  }
}
