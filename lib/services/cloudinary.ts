/**
 * Cloudinary service — reusable upload image logic.
 * Extracted so every modal/form can share the same implementation.
 *
 * Lưu ý: phần XOÁ ảnh đã được chuyển sang backend xử lý (vì cần
 * CLOUDINARY_API_SECRET — không để lộ ở phía client). Khi xoá bài/người,
 * backend tự dọn ảnh tương ứng trên Cloudinary.
 */

// ── Validate ────────────────────────────────────────────────────────
/** Returns an error message string, or `null` if valid. */
export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "Vui lòng chọn một tệp hình ảnh"
  }
  if (file.size > 5 * 1024 * 1024) {
    return "Kích thước ảnh phải nhỏ hơn 5MB"
  }
  return null
}

// ── Upload ──────────────────────────────────────────────────────────
/** Upload a file to Cloudinary (unsigned). Returns the `secure_url`. */
export async function uploadImage(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  if (!cloudName) {
    throw new Error("Cloudinary cloud name not configured")
  }

  const formData = new FormData()
  formData.append("file", file)
  formData.append("upload_preset", "family-tree-avatar")
  formData.append("cloud_name", cloudName)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: formData },
  )

  if (!response.ok) {
    throw new Error("Tải ảnh lên thất bại")
  }

  const result = await response.json()
  return result.secure_url as string
}
