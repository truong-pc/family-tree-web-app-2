"use client"

import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react"
import * as d3 from "d3"

// Convert an image URL (avatar) to a base64 data URL so it can be embedded
// into the cloned SVG. Without this, drawing external images onto a canvas
// "taints" it and the export (toBlob) will throw a security error.
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
    return "" // fall back: leave avatar empty rather than break the whole export
  }
}

// Input data structure for the family tree diagram (includes nodes and links)
interface FamilyTreeData {
  nodes: Array<{ id: string; gender: string; [key: string]: any }>
  links: Array<{ source: string; target: string; [key: string]: any }>
}

// Props received by the family tree drawing component
interface Props {
  data: FamilyTreeData
  onNodeClick: (personName: string) => void
  focusedPerson: string | null
  getPersonColor: (name: string) => string
  chartId?: string
  // Gọi khi người dùng click vào vùng trống của cây -> dùng để bỏ highlight/focus.
  onBackgroundClick?: () => void
}

// Imperative actions the parent can trigger via a ref (e.g. toolbar buttons)
export interface FamilyTreeChartHandle {
  exportImage: () => Promise<void>
  resetZoom: () => void
}

// Node structure used during tree layout calculations
interface TreeNode {
  id: string
  data: any
  children: TreeNode[]
  parent?: TreeNode
  x: number
  y: number
  width: number
  blockWidth: number
}

const FamilyTreeChart = forwardRef<FamilyTreeChartHandle, Props>(function FamilyTreeChart(
  { data, onNodeClick, focusedPerson, getPersonColor, chartId, onBackgroundClick },
  ref,
) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // Manage D3 zoom behavior
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  // Manage responsive dimensions of SVG
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const isInitialRender = useRef(true)

  // Save zoom/transform state so it is preserved across layout rebuilds
  const savedTransformRef = useRef<d3.ZoomTransform | null>(null)
  const initialTransformRef = useRef<d3.ZoomTransform | null>(null)
  const lastChartIdRef = useRef<string | null>(null)
  // Người mà ta đã auto-zoom tới gần nhất. Dùng để zoom CHỈ khi focus đổi sang
  // người mới, tránh việc cứ mỗi lần biểu đồ vẽ lại (đổi màu/dữ liệu/kích thước) lại "giật" về người đang focus.
  const lastFocusedRef = useRef<string | null>(null)
  // Transform mục tiêu của lần zoom-to-focus gần nhất. Khi biểu đồ vẽ lại (vd
  // StrictMode gọi effect 2 lần ở dev) mà transition zoom chưa xong, ta khôi phục
  // thẳng về transform này thay vì giá trị giữa chừng -> không bị kẹt nửa vời.
  const focusTransformRef = useRef<d3.ZoomTransform | null>(null)

  // Reset the saved transform if switching to a different tree (chartId changed)
  if (chartId && chartId !== lastChartIdRef.current) {
    savedTransformRef.current = null
    initialTransformRef.current = null
    lastFocusedRef.current = null
    focusTransformRef.current = null
    lastChartIdRef.current = chartId
  }

  // Update the SVG dimensions based on the container size
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth
        // Use portrait detection: mobile portrait gets a compact 350px,
        const isPortrait = window.innerHeight > window.innerWidth
        const containerHeight = isPortrait ? 350 : window.innerHeight * 0.7
        setDimensions({
          width: Math.max(300, containerWidth - 20),
          height: containerHeight,
        })
      }
    }
    updateDimensions()
    window.addEventListener("resize", updateDimensions)
    return () => window.removeEventListener("resize", updateDimensions)
  }, [])

  // Main Effect: Rebuild tree layout and redraw D3 components when data/dimensions change
  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove() // Clear previous elements before rendering

    const { width, height } = dimensions
    const margin = { top: 40, right: 40, bottom: 40, left: 40 }
    svg.attr("width", width).attr("height", height)

    // Setup SVG defs (markers, avatar rounding clip paths)
    const defs = svg.append("defs")
    defs.append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 10)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#666")

    defs.append("clipPath")
      .attr("id", "avatar-clip")
      .attr("clipPathUnits", "objectBoundingBox")
      .append("circle")
      .attr("cx", 0.5)
      .attr("cy", 0.5)
      .attr("r", 0.5)

    // Main group container 'g' containing all nodes and links
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`)

    // Responsive configuration constants for nodes
    const baseNodeWidth = width < 1024 ? 120 : 130
    const nodeHeight = width < 1024 ? 70 : 80
    const avatarSize = width < 1024 ? 32 : 40
    const minNodeSpacing = width < 768 ? 15 : 20
    const levelHeight = width < 768 ? 110 : 140

    const avatarY = width < 768 ? 8 : 10

    // Create a map to store all nodes with initialized relationship arrays
    const nodeMap = new Map()
    data.nodes.forEach((node) => {
      nodeMap.set(node.id, { ...node, children: [], parents: [], spouses: [], isPrimary: true, isIsolated: true })
    })

    // Step 1: Map parent-child relationships
    data.links.forEach((link) => {
      if (link.type === "SPOUSE_OF") return; // Skip spouse links in this pass
      const parent = nodeMap.get(link.source)
      const child = nodeMap.get(link.target)
      if (parent && child) {
        // Deduplicate: prevent same child from appearing twice (e.g. both FATHER_OF and MOTHER_OF links)
        if (!parent.children.includes(child)) {
          parent.children.push(child)
        }
        if (!child.parents.includes(parent)) {
          child.parents.push(parent)
        }
        parent.isIsolated = false
        child.isIsolated = false
      }
    })

    // Step 2: Map spouse relationships to merge them into a single visual block
    data.links.forEach((link) => {
      if (link.type !== "SPOUSE_OF") return; // Only process spouse links
      const s1 = nodeMap.get(link.source)
      const s2 = nodeMap.get(link.target)
      if (s1 && s2) {
        s1.isIsolated = false
        s2.isIsolated = false
        let primary = s1
        let secondary = s2

        // Determine primary spouse based on lineage (parentage) for consistent layout
        if (s2.parents.length > 0 && s1.parents.length === 0) {
          primary = s2; secondary = s1;
        } else if (s1.isPrimary === false && s2.isPrimary === true) {
          primary = s2; secondary = s1;
        }

        if (secondary.isPrimary) {
          secondary.isPrimary = false // Mark as secondary so it's drawn inside primary's block
          primary.spouses.push(secondary)
          // Merge children list to primary for visual connections
          secondary.children.forEach((c: any) => {
            if (!primary.children.includes(c)) {
              primary.children.push(c);
              // Also update child's parents array to point to the new primary
              if (!c.parents.includes(primary)) {
                c.parents.push(primary);
              }
            }
          })
        }
      }
    })

    // Extract root nodes (no parents) and isolated nodes (no links)
    const roots = Array.from(nodeMap.values()).filter((node: any) => node.parents.length === 0 && node.isPrimary && !node.isIsolated)
    const isolatedNodes = Array.from(nodeMap.values()).filter((node: any) => node.isIsolated && node.isPrimary)


    const allNodes: TreeNode[] = []
    const allLinks: any[] = []

    // Calculate layout width of a node group including spouses
    function getBlockWidth(node: any) {
      const totalPeople = 1 + node.spouses.length
      return baseNodeWidth * totalPeople + (totalPeople - 1) * 10
    }

    // Memoization cache for subtree width (safe to call multiple times — returns cached result)
    const widthCache = new Map<string, number>()
    
    // Track which nodes have been positioned to prevent double rendering
    const positionedNodes = new Set<string>()

    // Helper to calculate the required width for a subtree
    function calculateSubtreeWidth(node: any): number {
      if (widthCache.has(node.id)) return widthCache.get(node.id)!

      const blockW = getBlockWidth(node)
      // Only count primary children since spouses are merged in the same block
      const primaryChildren = node.children.filter((c: any) => c.isPrimary)
      if (primaryChildren.length === 0) {
        const w = blockW + minNodeSpacing
        widthCache.set(node.id, w)
        return w
      }

      const childrenWidth = primaryChildren.reduce((total: number, child: any) => {
        return total + calculateSubtreeWidth(child)
      }, 0)
      const w = Math.max(blockW + minNodeSpacing, childrenWidth)
      widthCache.set(node.id, w)
      return w
    }

    // Recursively calculate positions for nodes in a subtree
    function positionSubtree(node: any, x: number, y: number, availableWidth: number): TreeNode {
      const bW = getBlockWidth(node)
      const nodeWidth = calculateSubtreeWidth(node)
      const treeNode: TreeNode = {
        id: node.id,
        data: node,
        children: [],
        x: x,
        y: y,
        width: nodeWidth,
        blockWidth: bW
      }

      // Only position primary children that haven't been positioned yet
      const primaryChildren = node.children.filter((c: any) => c.isPrimary && !positionedNodes.has(c.id))

      if (primaryChildren.length > 0) {
        // Recalculate actual children width (excluding already-positioned nodes)
        const actualChildrenWidth = primaryChildren.reduce((total: number, child: any) => {
          return total + calculateSubtreeWidth(child)
        }, 0)
        let childX = x - actualChildrenWidth / 2

        primaryChildren.forEach((child: any) => {
          positionedNodes.add(child.id)
          const childWidth = calculateSubtreeWidth(child)
          const childTreeNode = positionSubtree(child, childX + childWidth / 2, y + levelHeight, childWidth)
          treeNode.children.push(childTreeNode)
          childX += childWidth

          allLinks.push({
            source: treeNode,
            target: childTreeNode,
          })
        })

        // Center parents horizontally above children
        if (treeNode.children.length > 0) {
          const firstChild = treeNode.children[0]
          const lastChild = treeNode.children[treeNode.children.length - 1]
          treeNode.x = (firstChild.x + lastChild.x) / 2
        }
      }

      allNodes.push(treeNode)
      return treeNode
    }

    // 1. Build the main tree(s)
    if (roots.length > 0) {
      let totalRootWidth = 0
      const rootWidths: number[] = []
      roots.forEach((root: any) => {
        const rootW = calculateSubtreeWidth(root)
        rootWidths.push(rootW)
        totalRootWidth += rootW
      })

      // Center the main tree(s) horizontally
      const mainTreeStartX = -totalRootWidth / 2
      let currentX = mainTreeStartX
      roots.forEach((root: any, index: number) => {
        const rw = rootWidths[index]
        positionSubtree(root, currentX + rw / 2, 60, rw)
        currentX += rw
      })
    }

    // 2. Build isolated nodes row below the main tree
    // Find the lowest Y coordinate of the main tree to place isolated nodes below it
    let maxTreeY = 60;
    if (allNodes.length > 0) {
      maxTreeY = Math.max(...allNodes.map(n => n.y))
    }

    // Add 100px padding below the tree for separation
    const isolatedRowStartY = maxTreeY + levelHeight + 100;
    
    let totalIsolatedWidth = 0;
    const isolatedWidths: number[] = [];
    isolatedNodes.forEach((node: any) => {
      const bW = getBlockWidth(node);
      isolatedWidths.push(bW);
      totalIsolatedWidth += bW + minNodeSpacing;
    });
    // Remove the trailing spacing for accurate width
    if (totalIsolatedWidth > 0) {
      totalIsolatedWidth -= minNodeSpacing;
    }
    
    // Start drawing from left to center the entire isolated row
    let currentIsolatedX = -totalIsolatedWidth / 2;
    
    isolatedNodes.forEach((node: any, index) => {
      const bW = isolatedWidths[index];
      const treeNode: TreeNode = {
        id: node.id,
        data: node,
        children: [],
        x: currentIsolatedX + bW / 2, // Place at center of its allocated width
        y: isolatedRowStartY,
        width: bW,
        blockWidth: bW
      }
      allNodes.push(treeNode)
      currentIsolatedX += bW + minNodeSpacing;
    })

    // Draw links between parents and children (stepped layout paths)
    const linkPaths = g.append("g").selectAll("path").data(allLinks).enter().append("path")
      .attr("stroke", "#323232ff")
      .attr("stroke-opacity", 0.8)
      .attr("stroke-width", 2)
      .attr("fill", "none")
      .attr("marker-end", "url(#arrowhead)")
      .attr("d", (d: any) => {
        const sourceX = d.source.x
        const sourceY = d.source.y + nodeHeight / 2
        const targetX = d.target.x
        const targetY = d.target.y - nodeHeight / 2 
        const midY = sourceY + (targetY - sourceY) / 2
        return `M${sourceX},${sourceY} L${sourceX},${midY} L${targetX},${midY} L${targetX},${targetY}`
      })

    // Draw family node groups
    const nodeGroups = g.append("g").selectAll("g").data(allNodes).enter().append("g")
      .attr("transform", (d: TreeNode) => `translate(${d.x - d.blockWidth / 2}, ${d.y - nodeHeight / 2})`)
      .style("cursor", "default")

    // Draw background container cards for families (covers spouses too)
    nodeGroups.append("rect")
      .attr("width", (d: TreeNode) => d.blockWidth)
      .attr("height", nodeHeight)
      .attr("rx", 12)
      .attr("ry", 12)
      .attr("fill", "#efefe7ff")
      .attr("stroke", "#e2e8f0")
      .attr("stroke-width", 1)

    const fontSize = width < 768 ? "10px" : "12px"
    const maxNameLength = width < 768 ? 15 : 18
    const textY = avatarY + avatarSize + (width < 768 ? 15 : 20)

    // Render individual members within the family block (primary node & spouses)
    nodeGroups.each(function(d: TreeNode) {
      const group = d3.select(this)
      const people = [d.data, ...d.data.spouses]
      
      people.forEach((person, pIndex) => {
        const pX = pIndex * (baseNodeWidth + 10)
        
        // Person card rect with data-id for partial updates
        group.append("rect")
           .attr("x", pX)
           .attr("y", 0)
           .attr("width", baseNodeWidth)
           .attr("height", nodeHeight)
           .attr("rx", 12)
           .attr("ry", 12)
           .attr("fill", getPersonColor(person.id))
           .attr("data-id", person.id)
           .attr("class", "person-card")
           .attr("stroke", focusedPerson === person.id ? "#ff6b6b" : "none")
           .attr("stroke-width", focusedPerson === person.id ? 3 : 0)
           .style("cursor", "pointer")
           .on("click", (event) => {
             event.stopPropagation()
             onNodeClick(person.id)
           })

        const cPhotoUrl = person.photoUrl || "/placeholder-user.jpg"
        
        // Border ring around avatar circle
        group.append("circle")
           .attr("cx", pX + baseNodeWidth / 2)
           .attr("cy", avatarY + avatarSize / 2)
           .attr("r", avatarSize / 2 + 2)
           .attr("fill", "#fff")
           .attr("stroke", "#e5e7eb")
           .attr("stroke-width", 2)
           .style("pointer-events", "none")

        // Avatar image with data-id for partial updates
        group.append("image")
           .attr("x", pX + baseNodeWidth / 2 - avatarSize / 2)
           .attr("y", avatarY)
           .attr("width", avatarSize)
           .attr("height", avatarSize)
           .attr("href", cPhotoUrl)
           .attr("data-id", person.id)
           .attr("clip-path", `url(#avatar-clip)`)
           .attr("preserveAspectRatio", "xMidYMid slice")
           .style("pointer-events", "none")
           .on("error", function() {
              d3.select(this).attr("href", "/placeholder-user.jpg")
           })

        const pName = person.name || "Unknown"
        const displayName = pName.length > maxNameLength ? "..." + pName.substring(pName.length - (maxNameLength - 3)) : pName

        // Name text with data-id for partial updates
        group.append("text")
           .text(displayName)
           .attr("font-size", fontSize)
           .attr("text-anchor", "middle")
           .attr("x", pX + baseNodeWidth / 2)
           .attr("y", textY)
           .attr("data-id", person.id)
           .attr("class", "person-name")
           .style("pointer-events", "none")
           .style("font-weight", "600")
           .attr("fill", "#1f2937")
      })
    })

    // Setup D3 zoom and pan gestures
    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.1, 3]).on("zoom", (event) => {
      g.attr("transform", event.transform)
      savedTransformRef.current = event.transform
    })

    zoomRef.current = zoom
    svg.call(zoom)

    // Click vào vùng trống của cây (các node đã stopPropagation) -> bỏ highlight.
    // Chỉ gọi khi đang có focus để tránh vẽ lại thừa.
    svg.on("click", () => {
      if (focusedPerson) onBackgroundClick?.()
    })

    // Calculate default scale and transform to fit the graph inside the viewport on load
    if (allNodes.length > 0) {
      const xExtent = d3.extent(allNodes, (d: TreeNode) => d.x) as [number, number]
      const yExtent = d3.extent(allNodes, (d: TreeNode) => d.y) as [number, number]

      const dx = xExtent[1] - xExtent[0] + baseNodeWidth + 100
      const dy = yExtent[1] - yExtent[0] + nodeHeight + 100
      const scale = Math.min((width - margin.left - margin.right) / dx, (height - margin.top - margin.bottom) / dy, 0.8)
      const centerX = (xExtent[0] + xExtent[1]) / 2

      // Anchor the top of the tree to the top margin instead of vertical-centering
      const defaultTransform = d3.zoomIdentity.translate(width / 2, margin.top + nodeHeight / 2).scale(scale).translate(-centerX, -yExtent[0])

      if (isInitialRender.current) {
        initialTransformRef.current = defaultTransform
        isInitialRender.current = false
        if (savedTransformRef.current) {
          svg.call(zoom.transform, savedTransformRef.current)
        } else {
          savedTransformRef.current = defaultTransform
          svg.call(zoom.transform, defaultTransform)
        }
      } else if (focusedPerson && lastFocusedRef.current === focusedPerson && focusTransformRef.current) {
        // Đang focus đúng người này: vẽ lại thì khôi phục thẳng về vị trí focus,
        // không lấy savedTransformRef (có thể đang ở giữa chừng transition bị ngắt).
        savedTransformRef.current = focusTransformRef.current
        svg.call(zoom.transform, focusTransformRef.current)
      } else if (savedTransformRef.current) {
        svg.call(zoom.transform, savedTransformRef.current)
      } else {
        svg.call(zoom.transform, defaultTransform)
      }
    }

    // Auto-zoom vào một thành viên CHỈ khi focus đổi sang người mới. Sau lần
    // zoom đầu, người dùng có thể kéo/zoom/chọn node khác mà không bị giật về
    // người cũ mỗi lần vẽ lại. Khi focus bị xóa (null) thì reset ref để lần sau
    // chọn lại đúng người đó vẫn zoom được.
    if (!focusedPerson) {
      lastFocusedRef.current = null
      focusTransformRef.current = null
    } else if (focusedPerson !== lastFocusedRef.current) {
      const focusedNode = allNodes.find((n: TreeNode) => n.data.id === focusedPerson || n.data.spouses.some((s: any) => s.id === focusedPerson))
      if (focusedNode) {
        // Chỉ đánh dấu "đã zoom" khi thực sự tìm thấy node, để render sau vẫn còn cơ hội zoom
        lastFocusedRef.current = focusedPerson
        // Offset ngang nếu người được focus là vợ/chồng nằm trong cùng block
        const pIndex = [focusedNode.data, ...focusedNode.data.spouses].findIndex((p: any) => p.id === focusedPerson);
        const pOffsetX = pIndex >= 0 ? pIndex * (baseNodeWidth + 10) + baseNodeWidth / 2 - focusedNode.blockWidth / 2 : 0;

        const transform = d3.zoomIdentity
          .translate(width / 2, height / 2)
          .scale(1.2)
          .translate(-(focusedNode.x + pOffsetX), -focusedNode.y)
        svg.transition().duration(750).call(zoom.transform, transform)
        savedTransformRef.current = transform
        focusTransformRef.current = transform // nhớ vị trí focus để khôi phục nếu transition bị ngắt
      }
    }
  }, [data.nodes, data.links, focusedPerson, getPersonColor, dimensions, onNodeClick, onBackgroundClick, chartId])


  const handleResetZoom = useCallback(() => {
    if (!svgRef.current || !zoomRef.current || !initialTransformRef.current) return
    const svg = d3.select(svgRef.current)
    svg.transition().duration(750).call(zoomRef.current.transform, initialTransformRef.current)
    savedTransformRef.current = initialTransformRef.current
  }, [])

  // Guard against re-entrant exports (the parent also disables the button, but
  // this keeps the imperative API safe if called directly).
  const isExportingRef = useRef(false)

  // Export the entire family tree (not just the visible viewport) to a PNG download
  const handleExportImage = useCallback(async () => {
    if (!svgRef.current || isExportingRef.current) return
    isExportingRef.current = true
    try {
      const svgNode = svgRef.current
      // The first <g> is the zoom/pan container holding the whole tree
      const gNode = svgNode.querySelector("g") as SVGGElement | null
      if (!gNode) return

      // getBBox() returns the real bounds of the tree in its own coordinate
      // system (ignoring the current zoom/pan transform), so we can capture all of it
      const bbox = gNode.getBBox()
      const padding = 40
      const exportWidth = bbox.width + padding * 2
      const exportHeight = bbox.height + padding * 2

      // Clone the SVG so we don't disturb the on-screen version
      const clone = svgNode.cloneNode(true) as SVGSVGElement
      clone.setAttribute("width", String(exportWidth))
      clone.setAttribute("height", String(exportHeight))
      clone.setAttribute("viewBox", `0 0 ${exportWidth} ${exportHeight}`)

      // Reset the main group's transform so the whole tree sits inside the export area
      const gClone = clone.querySelector("g") as SVGGElement
      gClone.setAttribute("transform", `translate(${-bbox.x + padding}, ${-bbox.y + padding})`)

      // Add a white background (SVG is transparent by default)
      const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
      bgRect.setAttribute("x", "0")
      bgRect.setAttribute("y", "0")
      bgRect.setAttribute("width", String(exportWidth))
      bgRect.setAttribute("height", String(exportHeight))
      bgRect.setAttribute("fill", "#ffffff")
      clone.insertBefore(bgRect, clone.firstChild)

      // Convert every avatar image to a base64 data URL to avoid a tainted canvas.
      // Most nodes share the same href (the placeholder, or a repeated avatar), so
      // we fetch each distinct URL only ONCE and reuse the result. With 300 nodes
      // this turns hundreds of fetches into a handful — the real export bottleneck.
      const images = Array.from(clone.querySelectorAll("image"))
      const dataUrlCache = new Map<string, Promise<string>>()
      await Promise.all(
        images.map(async (img) => {
          const href =
            img.getAttribute("href") ||
            img.getAttributeNS("http://www.w3.org/1999/xlink", "href") ||
            ""
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

      // Serialize the clone and load it into an <img> via a blob URL.
      // Blob URL (not base64) keeps Vietnamese names with accents intact.
      const svgString = new XMLSerializer().serializeToString(clone)
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" })
      const svgUrl = URL.createObjectURL(svgBlob)

      await new Promise<void>((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          // Render at 1x for a crisp image, but cap the canvas area so very large
          // trees (e.g. 300 nodes) don't blow up memory / toBlob time. Browsers
          // also limit max canvas dimensions; staying under ~16M px keeps it safe.
          // const MAX_CANVAS_PIXELS = 16_000_000
          // const scale = Math.min(2, Math.sqrt(MAX_CANVAS_PIXELS / (exportWidth * exportHeight)))
          const scale = 1
          const canvas = document.createElement("canvas")
          canvas.width = exportWidth * scale
          canvas.height = exportHeight * scale
          const ctx = canvas.getContext("2d")
          if (!ctx) {
            reject(new Error("Canvas context unavailable"))
            return
          }
          ctx.scale(scale, scale)
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
    } finally {
      isExportingRef.current = false
    }
  }, [])

  // Expose imperative actions to the parent via ref so toolbar buttons can
  // trigger export/reset without leaking functions onto the global window.
  useImperativeHandle(ref, () => ({
    exportImage: handleExportImage,
    resetZoom: handleResetZoom,
  }), [handleExportImage, handleResetZoom])

  return (
    <div ref={containerRef} className="w-full overflow-hidden">
      <svg ref={svgRef} className="border rounded-lg bg-white w-full"></svg>
      <div className="mt-2 text-xs sm:text-sm text-gray-600 flex items-center justify-center space-x-2 sm:space-x-4 flex-wrap">
        <div className="flex items-center space-x-1">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: "#DBEAFE" }}></div>
          <span>Nam</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: "#FCE7F3" }}></div>
          <span>Nữ</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: "#FEF3C7" }}></div>
          <span>Chưa có quan hệ</span>
        </div>
      </div>
    </div>
  )
})

export default FamilyTreeChart
