"use client"

/**
 * news-editor.tsx
 * Wrapper HugeRTE (fork mã nguồn mở của TinyMCE 6) để soạn nội dung bài viết.
 * - Core HugeRTE nạp runtime từ CDN jsdelivr (không cần bundler config, không API key).
 * - Ảnh chèn trong bài upload thẳng lên Cloudinary qua uploadImage (giống ảnh bìa).
 * - Render client-only (HugeRTE đụng tới window/document → không SSR).
 */

import { Editor } from "@hugerte/hugerte-react"
import { uploadImage } from "@/lib/services/cloudinary"

const HUGERTE_SRC = "https://cdn.jsdelivr.net/npm/hugerte@1/hugerte.min.js"

export default function NewsEditor({
  value,
  onChange,
  onUpload = uploadImage,
}: {
  value: string
  onChange: (html: string) => void
  /** Upload ảnh (mặc định uploadImage). Truyền bản "tracked" để gom draftPhotoUrls. */
  onUpload?: (file: File) => Promise<string>
}) {
  return (
    <Editor
      hugerteScriptSrc={HUGERTE_SRC}
      value={value}
      onEditorChange={(html: string) => onChange(html)}
      init={{
        height: 560,
        menubar: false,
        branding: false,
        plugins: [
          "lists",
          "link",
          "image",
          "table",
          "code",
          "preview",
          "fullscreen",
          "wordcount",
          "autolink",
        ],
        toolbar:
          "undo redo | blocks | bold italic underline | " +
          "alignleft aligncenter alignright | bullist numlist | lineheight | " +
          "link image table | code fullscreen",
        line_height_formats: "1 1.15 1.3 1.5 1.75 2 2.5 3",
        automatic_uploads: true,
        paste_data_images: true,
        file_picker_types: "image",
        // Giữ NGUYÊN URL tuyệt đối của Cloudinary. Mặc định HugeRTE đổi URL
        // tuyệt đối → tương đối theo domain app, khiến ảnh đã upload bị gãy
        // link khi xem lại (URL có trong DB nhưng không hiển thị).
        convert_urls: false,
        relative_urls: false,
        remove_script_host: false,
        content_style:
          "body{font-family:inherit;font-size:15px;line-height:1.5;color:#1e293b}" +
          "p{margin:0 0 0.5em}" +
          "h1,h2,h3,h4,h5,h6{margin:0.6em 0 0.3em;line-height:1.25}",
        // HugeRTE/TinyMCE 6: handler trả về Promise<string> = URL ảnh trực tiếp.
        images_upload_handler: (blobInfo: any) =>
          onUpload(blobInfo.blob() as File),
        // Cho phép nút "Ảnh" trên toolbar chọn tệp & upload thẳng lên Cloudinary.
        file_picker_callback: (
          cb: (url: string, meta?: { title?: string }) => void,
        ) => {
          const input = document.createElement("input")
          input.type = "file"
          input.accept = "image/*"
          input.onchange = async () => {
            const file = input.files?.[0]
            if (!file) return
            try {
              const url = await onUpload(file)
              cb(url, { title: file.name })
            } catch {
              cb("", {})
            }
          }
          input.click()
        },
      }}
    />
  )
}
