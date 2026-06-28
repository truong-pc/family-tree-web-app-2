// Shared types for the family-tree graph module.

// Raw graph data fed to the chart (already normalised by the store: ids are strings).
export interface FamilyTreeData {
  nodes: Array<{ id: string; gender: string; [key: string]: any }>
  links: Array<{ source: string; target: string; [key: string]: any }>
}

// A positioned node produced by the layout pass. `data` is the merged node
// (with `spouses`, `children`, etc.) — `x`/`y` are layout coordinates.
export interface TreeNode {
  id: string
  data: any
  children: TreeNode[]
  x: number
  y: number
  width: number
  blockWidth: number
}

export interface TreeLink {
  source: TreeNode
  target: TreeNode
}

export interface LayoutBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

// Result of the pure layout computation — no DOM, safe to memoise.
export interface LayoutResult {
  nodes: TreeNode[]
  links: TreeLink[]
  bounds: LayoutBounds
}

// Responsive sizing config derived from the available width.
export interface Sizing {
  baseNodeWidth: number
  nodeHeight: number
  avatarSize: number
  minNodeSpacing: number
  levelHeight: number
  avatarY: number
  fontSize: string
  badgeFontSize: string
  maxNameLength: number
  nameY: number
  badgeY: number
}

// Imperative actions the parent can trigger via a ref (toolbar buttons).
export interface FamilyTreeChartHandle {
  exportImage: () => Promise<void>
  resetZoom: () => void
}
