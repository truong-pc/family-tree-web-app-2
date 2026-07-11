import { apiClient } from "./client"

/** Bài đầy đủ — response của GET chi tiết / POST / PATCH */
export interface NewsOut {
  postId: string
  chartId: string
  authorId: string
  title: string
  contentHtml: string
  coverImageUrl?: string | null
  tags?: string[]
  public: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

/** Thẻ bài (item của feed & danh sách quản lý) — bỏ contentHtml, thêm tên */
export interface NewsCardOut {
  postId: string
  chartId: string
  chartName: string | null
  authorId: string
  authorName: string | null
  title: string
  coverImageUrl?: string | null
  tags?: string[]
  public: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

/** Response của feed công khai */
export interface NewsFeedOut {
  items: NewsCardOut[]
  nextCursor: string | null
}

/** 1 tag công khai kèm số bài (GET /news/tags). */
export interface NewsTagOut {
  tag: string
  count: number
}

export interface NewsCreate {
  title: string
  contentHtml: string
  coverImageUrl?: string | null
  tags?: string[]
  public?: boolean
  /**
   * Toàn bộ URL ảnh đã upload trong phiên soạn (ảnh trong bài + mọi ảnh bìa
   * từng chọn). Backend giữ lại URL còn dùng và dọn phần dư trên Cloudinary.
   */
  draftPhotoUrls?: string[]
}

export type NewsUpdate = Partial<NewsCreate>

// Công khai (no auth)

/**
 * Feed công khai, phân trang bằng cursor.
 * Dùng URLSearchParams để URL-encode cursor (dấu `+`/`|`/`:`),
 * tránh lỗi 400 Invalid cursor (xem news-api.md mục 2.3).
 */
export const getNewsFeed = async (params: {
  limit?: number
  cursor?: string | null
  chartId?: string
  tag?: string
} = {}): Promise<NewsFeedOut> => {
  try {
    const qs = new URLSearchParams()
    qs.set("limit", String(params.limit ?? 12))
    if (params.cursor) qs.set("cursor", params.cursor)
    if (params.chartId) qs.set("chartId", params.chartId)
    if (params.tag) qs.set("tag", params.tag)

    const response = await apiClient.get(`/api/v1/news?${qs.toString()}`)
    return response.data
  } catch (error) {
    console.error("Get news feed error:", error)
    throw error
  }
}

/** Danh sách tag công khai (kèm số bài), sắp theo count giảm dần. */
export const getNewsTags = async (): Promise<NewsTagOut[]> => {
  try {
    const response = await apiClient.get(`/api/v1/news/tags`)
    return response.data
  } catch (error) {
    console.error("Get news tags error:", error)
    throw error
  }
}

/** Chi tiết bài công khai (chỉ bài public). */
export const getNewsPost = async (postId: string): Promise<NewsOut> => {
  try {
    const response = await apiClient.get(`/api/v1/news/${postId}`)
    return response.data
  } catch (error) {
    console.error("Get news post error:", error)
    throw error
  }
}

// Quản lý theo chart (auth)

/** Danh sách quản lý — tất cả bài của chart (cả nháp). Mảng phẳng, không phân trang. */
export const getChartNews = async (
  token: string,
  chartId: string,
  params: { mine?: boolean; public?: boolean; tag?: string } = {}
): Promise<NewsCardOut[]> => {
  try {
    const qs = new URLSearchParams()
    if (params.mine) qs.set("mine", "true")
    if (params.public !== undefined) qs.set("public", String(params.public))
    if (params.tag) qs.set("tag", params.tag)
    const query = qs.toString()

    const response = await apiClient.get(
      `/api/v1/charts/${chartId}/news${query ? `?${query}` : ""}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    return response.data
  } catch (error) {
    console.error("Get chart news error:", error)
    throw error
  }
}

/** Chi tiết 1 bài bất kỳ trong chart (kể cả nháp) — cho màn xem trước / sửa. */
export const getChartNewsPost = async (
  token: string,
  chartId: string,
  postId: string
): Promise<NewsOut> => {
  try {
    const response = await apiClient.get(
      `/api/v1/charts/${chartId}/news/${postId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    return response.data
  } catch (error) {
    console.error("Get chart news post error:", error)
    throw error
  }
}

/** Tạo bài. */
export const createNews = async (
  token: string,
  chartId: string,
  data: NewsCreate
): Promise<NewsOut> => {
  try {
    const response = await apiClient.post(`/api/v1/charts/${chartId}/news`, data, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  } catch (error) {
    console.error("Create news error:", error)
    throw error
  }
}

/** Sửa bài (partial update). */
export const updateNews = async (
  token: string,
  chartId: string,
  postId: string,
  data: NewsUpdate
): Promise<NewsOut> => {
  try {
    const response = await apiClient.patch(
      `/api/v1/charts/${chartId}/news/${postId}`,
      data,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    return response.data
  } catch (error) {
    console.error("Update news error:", error)
    throw error
  }
}

/** Xoá bài. */
export const deleteNews = async (
  token: string,
  chartId: string,
  postId: string
): Promise<void> => {
  try {
    await apiClient.delete(`/api/v1/charts/${chartId}/news/${postId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch (error) {
    console.error("Delete news error:", error)
    throw error
  }
}
