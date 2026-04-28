/**
 * Cloudinary service — reusable upload/delete image logic.
 * Extracted so every modal/form can share the same implementation.
 */

import { extractPublicId } from "@/lib/utils"

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
  formData.append("upload_preset", "family-tree")
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

// ── Delete ──────────────────────────────────────────────────────────
/** Delete an image from Cloudinary by its full URL. Silently ignores errors. */
export async function deleteImage(url: string): Promise<void> {
  const publicId = extractPublicId(url)
  if (!publicId) return

  try {
    await fetch("/api/cloudinary/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_id: publicId }),
    })
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error)
  }
}
