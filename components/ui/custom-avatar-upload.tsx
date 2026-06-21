"use client"

import React, { useEffect, useRef, useState } from "react"
import { Camera, Trash2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import * as cloudinary from "@/lib/services/cloudinary"

interface CustomAvatarUploadProps {
  /** Ảnh đã lưu trước đó (hiển thị khi chưa chọn ảnh mới). Null nếu chưa có. */
  photoUrl: string | null
  /**
   * Gọi khi file được chọn (File) hoặc bị gỡ (null).
   * LƯU Ý: component KHÔNG upload — ảnh chỉ thực sự lên Cloudinary lúc lưu form,
   * nên huỷ/đóng modal sẽ không để lại ảnh mồ côi.
   */
  onFileChange: (file: File | null) => void
  /** Gọi khi người dùng gỡ ảnh ĐÃ lưu, để parent xoá luôn `photoUrl`. */
  onRemove?: () => void
  /** Whether the upload controls are disabled */
  disabled?: boolean
  /** Avatar size in px (default 96) */
  size?: number
  /** Additional className for the wrapper */
  className?: string
  /** Called with error message if validation fails */
  onError?: (message: string) => void
}

export default function CustomAvatarUpload({
  photoUrl,
  onFileChange,
  onRemove,
  disabled = false,
  size = 96,
  className = "",
  onError,
}: CustomAvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Preview cục bộ của file vừa chọn (chưa upload), tạo bằng URL.createObjectURL.
  const [localPreview, setLocalPreview] = useState<string | null>(null)

  // Dọn object URL khi preview đổi hoặc khi unmount để tránh rò bộ nhớ.
  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview)
    }
  }, [localPreview])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validationError = cloudinary.validateImageFile(file)
    if (validationError) {
      onError?.(validationError)
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    // Hoãn upload: chỉ giữ file + preview cục bộ. (object URL cũ được effect dọn.)
    setLocalPreview(URL.createObjectURL(file))
    onFileChange(file)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleRemove = () => {
    setLocalPreview(null)
    onFileChange(null)
    onRemove?.()
  }

  const displaySrc = localPreview || photoUrl || "/placeholder-user.jpg"
  const hasPhoto = !!(localPreview || photoUrl)

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {/* Avatar preview */}
      <div className="relative group" style={{ width: size, height: size }}>
        <div className="w-full h-full rounded-full overflow-hidden border-2 border-border bg-muted">
          {/* Dùng <img> thường vì nguồn có thể là blob: URL (preview cục bộ). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displaySrc}
            alt="Avatar"
            width={size}
            height={size}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Upload overlay on hover */}
        {!disabled && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
          >
            <Camera className="h-5 w-5 text-white" />
          </button>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="text-xs"
        >
          {hasPhoto ? (
            <RefreshCw className="h-3.5 w-3.5" />
          ) : (
            <>
              <Camera className="h-3.5 w-3.5 mr-1" />
              Tải ảnh
            </>
          )}
        </Button>
        {hasPhoto && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemove}
            disabled={disabled}
            className="text-xs text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
