import { apiClient } from "./client"

export const getChartPersons = async (token: string, chartId: string, searchQuery?: string) => {
  try {
    const url = searchQuery 
      ? `/api/v1/charts/${chartId}/persons?q=${encodeURIComponent(searchQuery)}`
      : `/api/v1/charts/${chartId}/persons`
    const response = await apiClient.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  } catch (error) {
    console.error("Get chart persons error:", error)
    throw error
  }
}

export const createPerson = async (
  token: string, 
  chartId: string, 
  data: { 
    name: string; 
    gender: "M" | "F" | "O"; 
    level: number; 
    dob?: string | null; 
    dod?: string | null; 
    description?: string | null; 
    parentIds?: number[] | null;
    photoUrl?: string | null;
  }
) => {
  try {
    const response = await apiClient.post(`/api/v1/charts/${chartId}/persons`, data, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  } catch (error) {
    console.error("Create person error:", error)
    throw error
  }
}

export const updatePerson = async (
  token: string,
  chartId: string,
  personId: number,
  data: {
    name?: string;
    gender?: "M" | "F" | "O";
    level?: number;
    dob?: string | null;
    dod?: string | null;
    description?: string | null;
    photoUrl?: string | null;
  }
) => {
  try {
    const response = await apiClient.patch(`/api/v1/charts/${chartId}/persons/${personId}`, data, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  } catch (error) {
    console.error("Update person error:", error)
    throw error
  }
}

export const deletePerson = async (token: string, chartId: string, personId: number) => {
  try {
    const response = await apiClient.delete(`/api/v1/charts/${chartId}/persons/${personId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  } catch (error) {
    console.error("Delete person error:", error)
    throw error
  }
}
