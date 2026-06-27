import type { FamilyTreeData, LayoutResult, Sizing, TreeNode } from "./types"
import { SPOUSE_GAP } from "./constants"

// Pure layout computation: turns raw {nodes, links} into positioned tree nodes
// + links + bounds. No React, no D3 DOM — safe to memoise and cheap to re-run.
//
// Algorithm (unchanged from the original implementation):
//  1. Build a node map and wire parent⇄child relationships.
//  2. Merge spouses into a single visual "block" (children re-parented to the
//     primary spouse so connections render once).
//  3. Recursively size + position each subtree, centering parents over children.
//  4. Lay isolated (unconnected) nodes in a row beneath the main tree(s).
export function computeTreeLayout(data: FamilyTreeData, sizing: Sizing): LayoutResult {
  const { baseNodeWidth, minNodeSpacing, levelHeight } = sizing

  const empty: LayoutResult = { nodes: [], links: [], bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 } }
  if (!data.nodes.length) return empty

  // ── Build relationship graph ───────────────────────────────────────
  const nodeMap = new Map<string, any>()
  data.nodes.forEach((node) => {
    nodeMap.set(node.id, { ...node, children: [], parents: [], spouses: [], isPrimary: true, isIsolated: true })
  })

  // Parent → child links (skip spouse links in this pass).
  data.links.forEach((link) => {
    if (link.type === "SPOUSE_OF") return
    const parent = nodeMap.get(link.source)
    const child = nodeMap.get(link.target)
    if (parent && child) {
      if (!parent.children.includes(child)) parent.children.push(child)
      if (!child.parents.includes(parent)) child.parents.push(parent)
      parent.isIsolated = false
      child.isIsolated = false
    }
  })

  // Spouse links: merge the secondary spouse into the primary's block.
  data.links.forEach((link) => {
    if (link.type !== "SPOUSE_OF") return
    const s1 = nodeMap.get(link.source)
    const s2 = nodeMap.get(link.target)
    if (!s1 || !s2) return
    s1.isIsolated = false
    s2.isIsolated = false
    let primary = s1
    let secondary = s2

    // Prefer the spouse with known lineage as the primary for a stable layout.
    if (s2.parents.length > 0 && s1.parents.length === 0) {
      primary = s2
      secondary = s1
    } else if (s1.isPrimary === false && s2.isPrimary === true) {
      primary = s2
      secondary = s1
    }

    if (secondary.isPrimary) {
      secondary.isPrimary = false
      primary.spouses.push(secondary)
      // Re-parent the secondary's children onto the primary so links draw once.
      secondary.children.forEach((c: any) => {
        if (!primary.children.includes(c)) {
          primary.children.push(c)
          if (!c.parents.includes(primary)) c.parents.push(primary)
        }
      })
    }
  })

  const roots = Array.from(nodeMap.values()).filter(
    (n: any) => n.parents.length === 0 && n.isPrimary && !n.isIsolated,
  )
  const isolatedNodes = Array.from(nodeMap.values()).filter((n: any) => n.isIsolated && n.isPrimary)

  const allNodes: TreeNode[] = []
  const allLinks: { source: TreeNode; target: TreeNode }[] = []

  // Width of a single block (primary + merged spouses side by side).
  const getBlockWidth = (node: any) => {
    const total = 1 + node.spouses.length
    return baseNodeWidth * total + (total - 1) * SPOUSE_GAP
  }

  const widthCache = new Map<string, number>()
  const positionedNodes = new Set<string>()

  // Required horizontal width for a subtree (memoised).
  function calculateSubtreeWidth(node: any): number {
    if (widthCache.has(node.id)) return widthCache.get(node.id)!
    const blockW = getBlockWidth(node)
    const primaryChildren = node.children.filter((c: any) => c.isPrimary)
    if (primaryChildren.length === 0) {
      const w = blockW + minNodeSpacing
      widthCache.set(node.id, w)
      return w
    }
    const childrenWidth = primaryChildren.reduce((t: number, c: any) => t + calculateSubtreeWidth(c), 0)
    const w = Math.max(blockW + minNodeSpacing, childrenWidth)
    widthCache.set(node.id, w)
    return w
  }

  function positionSubtree(node: any, x: number, y: number): TreeNode {
    const treeNode: TreeNode = {
      id: node.id,
      data: node,
      children: [],
      x,
      y,
      width: calculateSubtreeWidth(node),
      blockWidth: getBlockWidth(node),
    }

    const primaryChildren = node.children.filter((c: any) => c.isPrimary && !positionedNodes.has(c.id))
    if (primaryChildren.length > 0) {
      const actualChildrenWidth = primaryChildren.reduce((t: number, c: any) => t + calculateSubtreeWidth(c), 0)
      let childX = x - actualChildrenWidth / 2

      primaryChildren.forEach((child: any) => {
        positionedNodes.add(child.id)
        const childWidth = calculateSubtreeWidth(child)
        const childTreeNode = positionSubtree(child, childX + childWidth / 2, y + levelHeight)
        treeNode.children.push(childTreeNode)
        childX += childWidth
        allLinks.push({ source: treeNode, target: childTreeNode })
      })

      // Center the parent block over its children.
      if (treeNode.children.length > 0) {
        const first = treeNode.children[0]
        const last = treeNode.children[treeNode.children.length - 1]
        treeNode.x = (first.x + last.x) / 2
      }
    }

    allNodes.push(treeNode)
    return treeNode
  }

  // ── 1. Main tree(s) ────────────────────────────────────────────────
  if (roots.length > 0) {
    const rootWidths = roots.map((r: any) => calculateSubtreeWidth(r))
    const totalRootWidth = rootWidths.reduce((a, b) => a + b, 0)
    let currentX = -totalRootWidth / 2
    roots.forEach((root: any, i: number) => {
      const rw = rootWidths[i]
      positionSubtree(root, currentX + rw / 2, 60)
      currentX += rw
    })
  }

  // ── 2. Isolated nodes row (beneath the main tree) ──────────────────
  let maxTreeY = 60
  if (allNodes.length > 0) maxTreeY = Math.max(...allNodes.map((n) => n.y))
  const isolatedRowY = maxTreeY + levelHeight + 100

  const isolatedWidths = isolatedNodes.map((n: any) => getBlockWidth(n))
  let totalIsolatedWidth = isolatedWidths.reduce((t, w) => t + w + minNodeSpacing, 0)
  if (totalIsolatedWidth > 0) totalIsolatedWidth -= minNodeSpacing

  let currentIsolatedX = -totalIsolatedWidth / 2
  isolatedNodes.forEach((node: any, i: number) => {
    const bW = isolatedWidths[i]
    allNodes.push({
      id: node.id,
      data: node,
      children: [],
      x: currentIsolatedX + bW / 2,
      y: isolatedRowY,
      width: bW,
      blockWidth: bW,
    })
    currentIsolatedX += bW + minNodeSpacing
  })

  // ── Bounds ─────────────────────────────────────────────────────────
  const xs = allNodes.map((n) => n.x)
  const ys = allNodes.map((n) => n.y)
  const bounds = {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  }

  return { nodes: allNodes, links: allLinks, bounds }
}

// Cheap structural fingerprint: only ids + links (incl. type). Cosmetic edits
// (name/photo/color/level) do NOT change this, so the layout memo stays stable
// and the DOM is not rebuilt — only the appearance layer updates.
export function structuralSignature(data: FamilyTreeData): string {
  const nodes = data.nodes.map((n) => n.id).join(",")
  const links = data.links.map((l) => `${l.source}>${l.target}:${l.type ?? ""}`).join(",")
  return `${nodes}|${links}`
}
