import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function extractPublicId(url: string) {
  if (!url) return null;
  
  try {
    // Regex matches /upload/(optional v<version>/)<public_id>.<extension>
    // Example: https://res.cloudinary.com/cloud/image/upload/v123/folder/image.jpg
    // Matches: folder/image
    const regex = /\/upload\/(?:v\d+\/)?(.+)(?:\.[^.]+)$/;
    const match = url.match(regex);
    
    if (match && match[1]) {
      return match[1];
    }
  } catch (error) {
    console.error("Error extracting public ID:", error);
  }
  
  return null;
}
