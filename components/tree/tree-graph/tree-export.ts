// Export the whole family tree (not just the viewport) to a downloaded PNG.
// Kept functionally identical to the previous inline implementation.

// Convert an avatar URL to a base64 data URL so it can be embedded into the
// cloned SVG. Without this, drawing external images onto a canvas "taints" it
// and toBlob() throws a security error.
async function imageToDataUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return "" // leave avatar empty rather than break the whole export
  }
}

export async function exportTreeToPng(svgEl: SVGSVGElement): Promise<void> {
  // The first <g> is the zoom/pan container holding the whole tree.
  const gNode = svgEl.querySelector("g") as SVGGElement | null
  if (!gNode) return

  // Real bounds of the tree in its own coordinate system (ignores zoom/pan).
  const bbox = gNode.getBBox()
  const padding = 40
  const exportWidth = bbox.width + padding * 2
  const exportHeight = bbox.height + padding * 2

  const clone = svgEl.cloneNode(true) as SVGSVGElement
  clone.setAttribute("width", String(exportWidth))
  clone.setAttribute("height", String(exportHeight))
  clone.setAttribute("viewBox", `0 0 ${exportWidth} ${exportHeight}`)

  const gClone = clone.querySelector("g") as SVGGElement
  gClone.setAttribute("transform", `translate(${-bbox.x + padding}, ${-bbox.y + padding})`)

  // White background (SVG is transparent by default).
  const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
  bgRect.setAttribute("x", "0")
  bgRect.setAttribute("y", "0")
  bgRect.setAttribute("width", String(exportWidth))
  bgRect.setAttribute("height", String(exportHeight))
  bgRect.setAttribute("fill", "#ffffff")
  clone.insertBefore(bgRect, clone.firstChild)

  // Convert each distinct avatar URL once and reuse — most nodes share the
  // placeholder, so this turns hundreds of fetches into a handful.
  const images = Array.from(clone.querySelectorAll("image"))
  const dataUrlCache = new Map<string, Promise<string>>()
  await Promise.all(
    images.map(async (img) => {
      const href =
        img.getAttribute("href") || img.getAttributeNS("http://www.w3.org/1999/xlink", "href") || ""
      if (!href) return
      let pending = dataUrlCache.get(href)
      if (!pending) {
        pending = imageToDataUrl(href)
        dataUrlCache.set(href, pending)
      }
      const dataUrl = await pending
      if (dataUrl) {
        img.setAttribute("href", dataUrl)
        img.removeAttributeNS("http://www.w3.org/1999/xlink", "href")
      }
    }),
  )

  // Serialise and render via a blob URL (keeps Vietnamese accents intact).
  const svgString = new XMLSerializer().serializeToString(clone)
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" })
  const svgUrl = URL.createObjectURL(svgBlob)

  await new Promise<void>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = exportWidth
      canvas.height = exportHeight
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Canvas context unavailable"))
        return
      }
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(svgUrl)

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Export failed"))
          return
        }
        const link = document.createElement("a")
        link.href = URL.createObjectURL(blob)
        link.download = `gia-pha-${new Date().toISOString().slice(0, 10)}.png`
        link.click()
        URL.revokeObjectURL(link.href)
        resolve()
      }, "image/png")
    }
    img.onerror = () => {
      URL.revokeObjectURL(svgUrl)
      reject(new Error("Failed to render SVG"))
    }
    img.src = svgUrl
  })
}
