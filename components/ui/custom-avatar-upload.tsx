"use client"

import React, { useRef, useState } from "react"
import { Camera, Loader2, Trash2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import * as cloudinary from "@/lib/services/cloudinary"

interface CustomAvatarUploadProps {
  /** Current photo URL (can be null for no photo) */
  photoUrl: string | null
  /** Callback when photo changes (new URL or null when removed) */
  onPhotoChange: (url: string | null) => void
  /** Whether the upload controls are disabled */
  disabled?: boolean
  /** Avatar size in px (default 96) */
  size?: number
  /** Additional className for the wrapper */
  className?: string
  /** Called with error message if upload/validation fails */
  onError?: (message: string) => void
}

export default function CustomAvatarUpload({
  photoUrl,
  onPhotoChange,
  disabled = false,
  size = 96,
  className = "",
  onError,
}: CustomAvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate
    const validationError = cloudinary.validateImageFile(file)
    if (validationError) {
      onError?.(validationError)
      return
    }

    setIsUploading(true)
    try {
      // Delete old image if exists
      if (photoUrl) {
        await cloudinary.deleteImage(photoUrl)
      }

      const newUrl = await cloudinary.uploadImage(file)
      onPhotoChange(newUrl)
    } catch (error: any) {
      console.error("Avatar upload error:", error)
      onError?.(error.message || "Tải ảnh lên thất bại")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleRemove = async () => {
    if (!photoUrl) return
    setIsUploading(true)
    try {
      await cloudinary.deleteImage(photoUrl)
      onPhotoChange(null)
    } catch (error: any) {
      console.error("Avatar remove error:", error)
      onError?.(error.message || "Xóa ảnh thất bại")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {/* Avatar preview */}
      <div className="relative group" style={{ width: size, height: size }}>
        <div
          className="w-full h-full rounded-full overflow-hidden border-2 border-border bg-muted"
        >
          <Image
            src={photoUrl || "/placeholder-user.jpg"}
            alt="Avatar"
            width={size}
            height={size}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Upload overlay on hover */}
        {!disabled && !isUploading && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
          >
            <Camera className="h-5 w-5 text-white" />
          </button>
        )}

        {/* Loading overlay */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </div>
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
          disabled={disabled || isUploading}
          className="text-xs"
        >
          {photoUrl ? (
            <RefreshCw className="h-3.5 w-3.5" />
          ) : (
            <>
              <Camera className="h-3.5 w-3.5 mr-1" />
              Tải ảnh
            </>
          )}
        </Button>
        {photoUrl && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemove}
            disabled={disabled || isUploading}
            className="text-xs text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
