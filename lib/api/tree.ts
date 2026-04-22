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

export const setFather = async (token: string, chartId: string, fatherId: number, childId: number, childOrder: number = 1) => {
  try {
    const response = await apiClient.post(
      `/api/v1/charts/${chartId}/relationships/father-of`,
      { fatherId, childId, childOrder },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    return response.data
  } catch (error: any) {
    console.error("Set father error:", error)
    throw error
  }
}

export const deleteFather = async (token: string, chartId: string, fatherId: number, childId: number) => {
  try {
    const response = await apiClient.delete(`/api/v1/charts/${chartId}/relationships/father-of`, {
      data: { fatherId, childId },
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  } catch (error) {
    console.error("Delete father error:", error)
    throw error
  }
}

export const setMother = async (token: string, chartId: string, motherId: number, childId: number, childOrder: number = 1) => {
  try {
    const response = await apiClient.post(
      `/api/v1/charts/${chartId}/relationships/mother-of`,
      { motherId, childId, childOrder },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    return response.data
  } catch (error: any) {
    console.error("Set mother error:", error)
    throw error
  }
}

export const deleteMother = async (token: string, chartId: string, motherId: number, childId: number) => {
  try {
    const response = await apiClient.delete(`/api/v1/charts/${chartId}/relationships/mother-of`, {
      data: { motherId, childId },
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  } catch (error) {
    console.error("Delete mother error:", error)
    throw error
  }
}

export const setSpouse = async (token: string, chartId: string, person1Id: number, person2Id: number, spouseOrder: number = 1) => {
  try {
    const response = await apiClient.post(
      `/api/v1/charts/${chartId}/relationships/spouse-of`,
      { person1Id, person2Id, spouseOrder },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    return response.data
  } catch (error: any) {
    console.error("Set spouse error:", error)
    throw error
  }
}

export const deleteSpouse = async (token: string, chartId: string, person1Id: number, person2Id: number) => {
  try {
    const response = await apiClient.delete(`/api/v1/charts/${chartId}/relationships/spouse-of`, {
      data: { person1Id, person2Id },
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  } catch (error) {
    console.error("Delete spouse error:", error)
    throw error
  }
}
