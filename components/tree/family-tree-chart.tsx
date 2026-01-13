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
  width: number // Width needed for this subtree
}

// Store zoom transform outside component to persist across re-renders
let savedTransform: d3.ZoomTransform | null = null
let initialTransform: d3.ZoomTransform | null = null

export default function FamilyTreeChart({ data, onNodeClick, focusedPerson, getPersonColor, onResetZoom }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height:600 })
  const isInitialRender = useRef(true)

  // Expose reset zoom function to parent
  useEffect(() => {
    if (onResetZoom) {
      // Make handleResetZoom available to parent
      const resetFunc = () => {
        if (!svgRef.current || !zoomRef.current || !initialTransform) return
        const svg = d3.select(svgRef.current)
        svg.transition().duration(750).call(zoomRef.current.transform, initialTransform)
        savedTransform = initialTransform
      }
      // Store it in a way parent can access
      ;(window as any).familyTreeResetZoom = resetFunc
    }
  }, [onResetZoom])

  // Update canvas size based on container
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth
        const containerHeight = Math.max(500, window.innerHeight * 0.6)

        setDimensions({
          width: Math.max(500, containerWidth - 40),
          height: containerHeight,
        })
      }
    }

    // Initial size
    updateDimensions()

    // Listen for window resize
    window.addEventListener("resize", updateDimensions)

    // Cleanup
    return () => window.removeEventListener("resize", updateDimensions)
  }, [])

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const { width, height } = dimensions
    const margin = { top: 40, right: 40, bottom: 40, left: 40 }

    svg.attr("width", width).attr("height", height)

    // Add arrow marker definition
    const defs = svg.append("defs")
    defs
      .append("marker")
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

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`)

    // Node dimensions - responsive based on screen size
    const nodeWidth = width < 1024 ? 120 : 130
    const nodeHeight = width < 1024 ? 70 : 80
    const avatarSize = width < 1024 ? 32 : 40
    const minNodeSpacing = width < 768 ? 15 : 20
    const levelHeight = width < 768 ? 110 : 140

    // Avatar positioning
    const avatarX = (nodeWidth - avatarSize) / 2
    const avatarY = width < 768 ? 8 : 10

    // Create hierarchical structure
    const nodeMap = new Map()
    data.nodes.forEach((node) => {
      nodeMap.set(node.id, { ...node, children: [], parents: [] })
    })

    // Build parent-child relationships
    data.links.forEach((link) => {
      const parent = nodeMap.get(link.source)
      const child = nodeMap.get(link.target)
      if (parent && child) {
        parent.children.push(child)
        child.parents.push(parent)
      }
    })

    // Find root nodes (nodes with no parents)
    const roots = Array.from(nodeMap.values()).filter((node: any) => node.parents.length === 0)

    const allNodes: TreeNode[] = []
    const allLinks: any[] = []

    // Separate isolated nodes (nodes with no relationships) from connected nodes
    const isolatedNodes = Array.from(nodeMap.values()).filter(
      (node: any) => node.children.length === 0 && node.parents.length === 0
    )

    // Constants for isolated nodes column
    const isolatedColumnWidth = nodeWidth + 40
    const isolatedColumnX = -(width - margin.left - margin.right) / 2 + isolatedColumnWidth / 2
    const isolatedStartY = 60
    const isolatedVerticalSpacing = nodeHeight + 15

    // Position isolated nodes in a vertical column on the left
    isolatedNodes.forEach((node: any, index) => {
      const treeNode: TreeNode = {
        id: node.id,
        data: node,
        children: [],
        x: isolatedColumnX,
        y: isolatedStartY + index * isolatedVerticalSpacing,
        width: nodeWidth,
      }
      allNodes.push(treeNode)
    })

    // Function to calculate subtree width
    function calculateSubtreeWidth(node: any): number {
      if (node.children.length === 0) {
        return nodeWidth + minNodeSpacing
      }

      // Calculate total width needed for all children
      const childrenWidth = node.children.reduce((total: number, child: any) => {
        return total + calculateSubtreeWidth(child)
      }, 0)

      // Return the maximum of node width or children width
      return Math.max(nodeWidth + minNodeSpacing, childrenWidth)
    }

    // Function to position nodes in a subtree
    function positionSubtree(node: any, x: number, y: number, availableWidth: number): TreeNode {
      const treeNode: TreeNode = {
        id: node.id,
        data: node,
        children: [],
        x: x,
        y: y,
        width: calculateSubtreeWidth(node),
      }

      if (node.children.length > 0) {
        // Calculate positions for children
        let childX = x - treeNode.width / 2

        node.children.forEach((child: any) => {
          const childWidth = calculateSubtreeWidth(child)
          const childTreeNode = positionSubtree(child, childX + childWidth / 2, y + levelHeight, childWidth)
          treeNode.children.push(childTreeNode)
          childX += childWidth

          // Add link from parent to child
          allLinks.push({
            source: treeNode,
            target: childTreeNode,
          })
        })

        // Center parent over children
        if (treeNode.children.length > 0) {
          const firstChild = treeNode.children[0]
          const lastChild = treeNode.children[treeNode.children.length - 1]
          treeNode.x = (firstChild.x + lastChild.x) / 2
        }
      }

      allNodes.push(treeNode)
      return treeNode
    }

    // Process connected nodes (excluding isolated nodes)
    const rootsWithRelationships = roots.filter((root: any) => root.children.length > 0 || root.parents.length > 0)

    if (rootsWithRelationships.length > 0) {
      let totalRootWidth = 0
      const rootWidths: number[] = []

      // Calculate width needed for each root tree
      rootsWithRelationships.forEach((root: any) => {
        const rootWidth = calculateSubtreeWidth(root)
        rootWidths.push(rootWidth)
        totalRootWidth += rootWidth
      })

      // Calculate the starting X position for the main tree
      const mainTreeStartX = isolatedColumnWidth + 50 - totalRootWidth / 2
      
      // Position each root tree in the main area
      let currentX = mainTreeStartX
      rootsWithRelationships.forEach((root: any, index: number) => {
        const rootWidth = rootWidths[index]
        positionSubtree(root, currentX + rootWidth / 2, 60, rootWidth)
        currentX += rootWidth
      })
    }

    // Create links with proper elbow connections
    const link = g
      .append("g")
      .selectAll("path")
      .data(allLinks)
      .enter()
      .append("path")
      .attr("stroke", "#666")
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

    // Add clip path for circular avatars
    allNodes.forEach((node: TreeNode, index: number) => {
      defs
        .append("clipPath")
        .attr("id", `avatar-clip-${index}`)
        .append("circle")
        .attr("cx", avatarX + avatarSize / 2)
        .attr("cy", avatarY + avatarSize / 2)
        .attr("r", avatarSize / 2)
    })

    // Create node groups for better organization
    const nodeGroups = g
      .append("g")
      .selectAll("g")
      .data(allNodes)
      .enter()
      .append("g")
      .attr("transform", (d: TreeNode) => `translate(${d.x - nodeWidth / 2}, ${d.y - nodeHeight / 2})`)
      .style("cursor", "pointer")

    // Add rectangular backgrounds
    nodeGroups
      .append("rect")
      .attr("width", nodeWidth)
      .attr("height", nodeHeight)
      .attr("rx", 12)
      .attr("ry", 12)
      .attr("fill", (d: TreeNode) => getPersonColor(d.data.id))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      // .attr("filter", "drop-shadow(0px 2px 4px rgba(0,0,0,0.1))") // Optional shadow

    // Add avatar images
    nodeGroups.each(function(d: TreeNode, index: number) {
      const group = d3.select(this)
      const photoUrl = d.data.photoUrl || "/placeholder-user.jpg"
      
      // Add circular border for avatar
      group
        .append("circle")
        .attr("cx", nodeWidth / 2)
        .attr("cy", avatarY + avatarSize / 2)
        .attr("r", avatarSize / 2 + 2)
        .attr("fill", "#fff")
        .attr("stroke", "#e5e7eb")
        .attr("stroke-width", 2)

      // Add avatar image with clip path
      group
        .append("image")
        .attr("x", avatarX)
        .attr("y", avatarY)
        .attr("width", avatarSize)
        .attr("height", avatarSize)
        .attr("href", photoUrl)
        .attr("clip-path", `url(#avatar-clip-${index})`)
        .attr("preserveAspectRatio", "xMidYMid slice")
        .on("error", function() {
          // Fallback to placeholder if image fails to load
          d3.select(this).attr("href", "/placeholder-user.jpg")
        })
    })

    // Add labels with responsive font size - positioned below avatar
    const fontSize = width < 768 ? "10px" : "12px"
    const maxNameLength = width < 768 ? 15 : 18
    
    // Position text relative to avatar for consistent spacing
    const textY = avatarY + avatarSize + (width < 768 ? 15 : 20)

    nodeGroups
      .append("text")
      .text((d: TreeNode) => {
        const name = d.data.id || d.data.name || "Unknown"
        return name.length > maxNameLength ? name.substring(0, maxNameLength - 3) + "..." : name
      })
      .attr("font-size", fontSize)
      .attr("text-anchor", "middle")
      .attr("x", nodeWidth / 2)
      .attr("y", textY)
      .style("pointer-events", "none")
      .style("font-weight", "600")
      .attr("fill", "#1f2937") // Text color

    // Handle node clicks
    nodeGroups.on("click", (event, d: TreeNode) => {
      onNodeClick(d.data.id)
    })

    // Highlight focused person
    if (focusedPerson) {
      nodeGroups.select("rect")
        .attr("stroke", function(this: any) {
          const d = d3.select(this.parentNode).datum() as TreeNode
          return d.data.id === focusedPerson ? "#ff6b6b" : "#fff"
        })
        .attr("stroke-width", function(this: any) {
          const d = d3.select(this.parentNode).datum() as TreeNode
          return d.data.id === focusedPerson ? 4 : 2
        })
    }

    // Store nodes for later access
    const allNodesWithPositions = allNodes

    // Add zoom and pan functionality
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform)
        savedTransform = event.transform
      })

    zoomRef.current = zoom
    svg.call(zoom)

    // Auto-fit to show all nodes (only on initial render)
    if (allNodes.length > 0) {
      const xExtent = d3.extent(allNodes, (d: TreeNode) => d.x) as [number, number]
      const yExtent = d3.extent(allNodes, (d: TreeNode) => d.y) as [number, number]

      const dx = xExtent[1] - xExtent[0] + nodeWidth + 100
      const dy = yExtent[1] - yExtent[0] + nodeHeight + 100

      const scale = Math.min((width - margin.left - margin.right) / dx, (height - margin.top - margin.bottom) / dy, 0.8)

      const centerX = (xExtent[0] + xExtent[1]) / 2
      const centerY = (yExtent[0] + yExtent[1]) / 2

      const defaultTransform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(scale)
        .translate(-centerX, -centerY)

      // Save initial transform for reset button
      if (isInitialRender.current) {
        initialTransform = defaultTransform
        savedTransform = defaultTransform
        svg.call(zoom.transform, defaultTransform)
        isInitialRender.current = false
      } else if (savedTransform) {
        // Restore saved transform
        svg.call(zoom.transform, savedTransform)
      } else {
        svg.call(zoom.transform, defaultTransform)
      }
    }

    // Highlight focused person and zoom to them if specified
    if (focusedPerson) {
      nodeGroups.select("rect")
        .attr("stroke", function(this: any) {
          const d = d3.select(this.parentNode).datum() as TreeNode
          return d.data.id === focusedPerson ? "#ff6b6b" : "#fff"
        })
        .attr("stroke-width", function(this: any) {
          const d = d3.select(this.parentNode).datum() as TreeNode
          return d.data.id === focusedPerson ? 4 : 2
        })

      // Zoom to focused person
      const focusedNode = allNodesWithPositions.find((n: TreeNode) => n.data.id === focusedPerson)
      if (focusedNode) {
        const transform = d3.zoomIdentity
          .translate(width / 2, height / 2)
          .scale(1.2)
          .translate(-focusedNode.x, -focusedNode.y)
        
        svg
          .transition()
          .duration(750)
          .call(zoom.transform, transform)
        
        savedTransform = transform
      }
    }
  }, [data, focusedPerson, getPersonColor, onNodeClick, dimensions])

  // Reset zoom function
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
          <span>Male</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: "#FCE7F3" }}></div>
          <span>Female</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: "#FEF3C7" }}></div>
          <span>No relationships</span>
        </div>
      </div>
    </div>
  )
}
