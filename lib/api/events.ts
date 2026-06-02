import { apiClient } from "./client"

export interface SolarDate {
  day: number
  month: number
  year: number
  weekday: string
}

export interface LunarDate {
  day: number
  month: number
  year: number
  isLeap: boolean
  dayCanChi: string
  monthCanChi: string
  yearCanChi: string
}

export interface CalendarToday {
  solar: SolarDate
  lunar: LunarDate
  hanh: string
  sao: string
  lucDieu: string
  bachKy: string
  gioTot: string[]
  tuoiXung: string[]
  tiet: string
}

export interface FamilyEvent {
  type: "birthday" | "death" | "custom"
  sourceId: string
  title: string
  day: number
  month: number
  year: number
  calendar: "solar" | "lunar"
  repeat: "yearly" | "once"
  isLeapMonth: boolean
  personId: number | null
  description: string | null
  branch?: string
  generation?: string
}

export interface UpcomingEvent extends FamilyEvent {
  occurrenceDate: string
  daysUntil: number
}

export const getCalendarToday = async (): Promise<CalendarToday> => {
  try {
    const response = await apiClient.get("/api/v1/calendar/today")
    return response.data
  } catch (error) {
    console.error("Get calendar today error:", error)
    throw error
  }
}

export const getEvents = async (token: string, chartId: string): Promise<FamilyEvent[]> => {
  try {
    const response = await apiClient.get(`/api/v1/charts/${chartId}/events`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  } catch (error) {
    console.error("Get events error:", error)
    throw error
  }
}

export const getUpcomingEvents = async (
  token: string,
  chartId: string,
  days: number = 7
): Promise<UpcomingEvent[]> => {
  try {
    const response = await apiClient.get(
      `/api/v1/charts/${chartId}/events/upcoming?days=${days}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    return response.data
  } catch (error) {
    console.error("Get upcoming events error:", error)
    throw error
  }
}

export const createEvent = async (
  token: string,
  chartId: string,
  data: {
    title: string
    description?: string | null
    day: number
    month: number
    year: number
    calendar: "solar" | "lunar"
    repeat: "yearly" | "once"
    isLeapMonth?: boolean
  }
): Promise<FamilyEvent> => {
  try {
    const response = await apiClient.post(`/api/v1/charts/${chartId}/events`, data, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  } catch (error) {
    console.error("Create event error:", error)
    throw error
  }
}

export const updateEvent = async (
  token: string,
  chartId: string,
  sourceId: string,
  data: Partial<{
    title: string
    description: string | null
    day: number
    month: number
    year: number
    calendar: "solar" | "lunar"
    repeat: "yearly" | "once"
    isLeapMonth: boolean
  }>
): Promise<FamilyEvent> => {
  try {
    const response = await apiClient.patch(
      `/api/v1/charts/${chartId}/events/${sourceId}`,
      data,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    return response.data
  } catch (error) {
    console.error("Update event error:", error)
    throw error
  }
}

export const deleteEvent = async (
  token: string,
  chartId: string,
  sourceId: string
): Promise<void> => {
  try {
    await apiClient.delete(`/api/v1/charts/${chartId}/events/${sourceId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch (error) {
    console.error("Delete event error:", error)
    throw error
  }
}
