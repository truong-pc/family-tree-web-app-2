"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import * as d3 from "d3"
import { Button } from "@/components/ui/button"
import { RotateCcw } from "lucide-react"

interface FamilyTreeData {
  nodes: Array<{ id: string; gender: string; [key: string]: any }>
  links: Array<{ source: string; target: string; [key: string]: any }>
}

interface Props {
  data: FamilyTreeData
  onNodeClick: (personName: string) => void
  focusedPerson: string | null
  getPersonColor: (name: string) => string
  onResetZoom?: () => void
}

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

let savedTransform: d3.ZoomTransform | null = null
let initialTransform: d3.ZoomTransform | null = null

export default function FamilyTreeChart({ data, onNodeClick, focusedPerson, getPersonColor, onResetZoom }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const isInitialRender = useRef(true)
  const isStructureBuilt = useRef(false)

  useEffect(() => {
    if (onResetZoom) {
      const resetFunc = () => {
        if (!svgRef.current || !zoomRef.current || !initialTransform) return
        const svg = d3.select(svgRef.current)
        svg.transition().duration(750).call(zoomRef.current.transform, initialTransform)
        savedTransform = initialTransform
      }
      ;(window as any).familyTreeResetZoom = resetFunc
    }
  }, [onResetZoom])

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

  // Effect A — Full structural rebuild (only when tree STRUCTURE or dimensions change)
  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const { width, height } = dimensions
    const margin = { top: 40, right: 40, bottom: 40, left: 40 }
    svg.attr("width", width).attr("height", height)

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

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`)

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

    // 1st Pass: Process parent-child relationships
    data.links.forEach((link) => {
      if (link.type === "SPOUSE_OF") return; // Skip spouse links in this pass
      const parent = nodeMap.get(link.source)
      const child = nodeMap.get(link.target)
      if (parent && child) {
        parent.children.push(child)
        child.parents.push(parent)
        parent.isIsolated = false // Node is no longer isolated if it has a relationship
        child.isIsolated = false
      }
    })

    // 2nd Pass: Process spouse relationships to merge spouses into a single visual block
    data.links.forEach((link) => {
      if (link.type !== "SPOUSE_OF") return; // Only process spouse links
      const s1 = nodeMap.get(link.source)
      const s2 = nodeMap.get(link.target)
      if (s1 && s2) {
        s1.isIsolated = false
        s2.isIsolated = false
        let primary = s1
        let secondary = s2

        // Determine which node is primary. The node with parents is usually primary
        // to maintain the correct lineage flow from top to bottom.
        if (s2.parents.length > 0 && s1.parents.length === 0) {
          primary = s2; secondary = s1;
        } else if (s1.isPrimary === false && s2.isPrimary === true) {
          primary = s2; secondary = s1;
        }

        if (secondary.isPrimary) {
          secondary.isPrimary = false // Mark as secondary so it's drawn inside primary's block
          primary.spouses.push(secondary)
          // Merge children so both spouses share the same children links visually
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

    const roots = Array.from(nodeMap.values()).filter((node: any) => node.parents.length === 0 && node.isPrimary && !node.isIsolated)
    const isolatedNodes = Array.from(nodeMap.values()).filter((node: any) => node.isIsolated && node.isPrimary)

    const allNodes: TreeNode[] = []
    const allLinks: any[] = []

    // Helper to calculate the width of a node including its spouses
    function getBlockWidth(node: any) {
      const totalPeople = 1 + node.spouses.length
      return baseNodeWidth * totalPeople + (totalPeople - 1) * 10
    }

    // Helper to calculate the required width for a subtree
    function calculateSubtreeWidth(node: any): number {
      const blockW = getBlockWidth(node)
      if (node.children.length === 0) return blockW + minNodeSpacing

      const childrenWidth = node.children.reduce((total: number, child: any) => {
        return total + calculateSubtreeWidth(child)
      }, 0)
      return Math.max(blockW + minNodeSpacing, childrenWidth)
    }

    // Recursively position nodes in the tree structure
    function positionSubtree(node: any, x: number, y: number, availableWidth: number): TreeNode {
      const bW = getBlockWidth(node)
      const treeNode: TreeNode = {
        id: node.id,
        data: node,
        children: [],
        x: x,
        y: y,
        width: calculateSubtreeWidth(node),
        blockWidth: bW
      }

      if (node.children.length > 0) {
        let childX = x - treeNode.width / 2

        node.children.forEach((child: any) => {
          const childWidth = calculateSubtreeWidth(child)
          const childTreeNode = positionSubtree(child, childX + childWidth / 2, y + levelHeight, childWidth)
          treeNode.children.push(childTreeNode)
          childX += childWidth

          allLinks.push({
            source: treeNode,
            target: childTreeNode,
          })
        })

        // Re-center parent above children
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

    const nodeGroups = g.append("g").selectAll("g").data(allNodes).enter().append("g")
      .attr("transform", (d: TreeNode) => `translate(${d.x - d.blockWidth / 2}, ${d.y - nodeHeight / 2})`)
      .style("cursor", "default")

    // The grouped frame
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

    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.1, 3]).on("zoom", (event) => {
      g.attr("transform", event.transform)
      savedTransform = event.transform
    })

    zoomRef.current = zoom
    svg.call(zoom)

    if (allNodes.length > 0) {
      const xExtent = d3.extent(allNodes, (d: TreeNode) => d.x) as [number, number]
      const yExtent = d3.extent(allNodes, (d: TreeNode) => d.y) as [number, number]

      const dx = xExtent[1] - xExtent[0] + baseNodeWidth + 100
      const dy = yExtent[1] - yExtent[0] + nodeHeight + 100
      const scale = Math.min((width - margin.left - margin.right) / dx, (height - margin.top - margin.bottom) / dy, 0.8)
      const centerX = (xExtent[0] + xExtent[1]) / 2
      const centerY = (yExtent[0] + yExtent[1]) / 2

      const defaultTransform = d3.zoomIdentity.translate(width / 2, height / 2).scale(scale).translate(-centerX, -centerY)

      if (isInitialRender.current) {
        initialTransform = defaultTransform
        savedTransform = defaultTransform
        svg.call(zoom.transform, defaultTransform)
        isInitialRender.current = false
      } else if (savedTransform) {
        svg.call(zoom.transform, savedTransform)
      } else {
        svg.call(zoom.transform, defaultTransform)
      }
    }

    if (focusedPerson) {
      const focusedNode = allNodes.find((n: TreeNode) => n.data.id === focusedPerson || n.data.spouses.some((s: any) => s.id === focusedPerson))
      if (focusedNode) {
        // Find specific person offset if needed
        const pIndex = [focusedNode.data, ...focusedNode.data.spouses].findIndex((p: any) => p.id === focusedPerson);
        const pOffsetX = pIndex >= 0 ? pIndex * (baseNodeWidth + 10) + baseNodeWidth / 2 - focusedNode.blockWidth / 2 : 0;
        
        const transform = d3.zoomIdentity
          .translate(width / 2, height / 2)
          .scale(1.2)
          .translate(-(focusedNode.x + pOffsetX), -focusedNode.y)
        svg.transition().duration(750).call(zoom.transform, transform)
        savedTransform = transform
      }
    }

    isStructureBuilt.current = true
  }, [data.links, dimensions, onNodeClick])

  // Effect B — Partial update (only when node DATA changes, not structure)
  useEffect(() => {
    if (!svgRef.current || !isStructureBuilt.current) return

    const svg = d3.select(svgRef.current)
    const { width } = dimensions
    const maxNameLength = width < 768 ? 15 : 18

    data.nodes.forEach((node) => {
      const nodeId = node.id
      const isFocused = focusedPerson === nodeId

      // Update person card fill color and focused border
      svg.selectAll(`rect.person-card[data-id="${nodeId}"]`)
        .attr("fill", getPersonColor(nodeId))
        .attr("stroke", isFocused ? "#ff6b6b" : "none")
        .attr("stroke-width", isFocused ? 3 : 0)

      // Update name text
      const pName = node.name || "Unknown"
      const displayName = pName.length > maxNameLength ? "..." + pName.substring(pName.length - (maxNameLength - 3)) : pName
      svg.selectAll(`text.person-name[data-id="${nodeId}"]`)
        .text(displayName)

      // Update avatar image
      svg.selectAll(`image[data-id="${nodeId}"]`)
        .attr("href", node.photoUrl || "/placeholder-user.jpg")
    })
  }, [data.nodes, focusedPerson, getPersonColor, dimensions])

  const handleResetZoom = useCallback(() => {
    if (!svgRef.current || !zoomRef.current || !initialTransform) return
    const svg = d3.select(svgRef.current)
    svg.transition().duration(750).call(zoomRef.current.transform, initialTransform)
    savedTransform = initialTransform
  }, [])

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
}
