import type { EdgeKind, GraphEdge, GraphModel, GraphNode } from '#shared/types/graph'
import { findCycles } from '#shared/utils/cycles'

export interface GraphIndex {
  model: GraphModel
  nodes: Map<string, GraphNode>
  children: Map<string, GraphNode[]>
  /** Ids from the repo node down to the node itself. */
  chain: (id: string) => string[]
}

export interface ViewNode {
  node: GraphNode
  /** Outside the current level, shown because something inside connects to it. */
  ghost: boolean
  /** Package label for ghost areas and files, which are ambiguous on their own. */
  context?: string
}

export interface ViewEdge {
  id: string
  source: string
  target: string
  count: number
  kinds: Partial<Record<EdgeKind, number>>
  violations: string[]
  inCycle: boolean
  edges: GraphEdge[]
}

export interface GraphView {
  nodes: ViewNode[]
  edges: ViewEdge[]
}

export function indexGraph(model: GraphModel): GraphIndex {
  const nodes = new Map(model.nodes.map(n => [n.id, n]))
  const children = new Map<string, GraphNode[]>()
  for (const node of model.nodes) {
    if (!node.parent) continue
    if (!children.has(node.parent)) children.set(node.parent, [])
    children.get(node.parent)!.push(node)
  }
  const chains = new Map<string, string[]>()
  const chain = (id: string): string[] => {
    let result = chains.get(id)
    if (!result) {
      const parent = nodes.get(id)?.parent
      result = parent ? [...chain(parent), id] : [id]
      chains.set(id, result)
    }
    return result
  }
  return { model, nodes, children, chain }
}

/**
 * One level of the graph: the children of `parentId` plus edges between them, aggregated from file edges.
 * Edges leaving the level end in ghost nodes, the outside node closest to the current level.
 */
export function buildView(index: GraphIndex, parentId: string, options: { includeAuto: boolean }): GraphView {
  const parentChain = index.chain(parentId)
  const nodes = new Map<string, ViewNode>()
  for (const node of index.children.get(parentId) ?? []) nodes.set(node.id, { node, ghost: false })

  const place = (id: string): string | undefined => {
    const chain = index.chain(id)
    let common = 0
    while (common < parentChain.length && chain[common] === parentChain[common]) common++
    // Inside: the child of the current parent. Outside: the child of the common ancestor.
    // Undefined when the endpoint is the parent itself or one of its ancestors.
    const placed = chain[common]
    if (placed && common < parentChain.length && !nodes.has(placed)) {
      const node = index.nodes.get(placed)!
      const context = node.kind === 'area' || node.kind === 'file' ? index.nodes.get(chain[1]!)?.label : undefined
      nodes.set(placed, { node, ghost: true, context })
    }
    return placed
  }

  const edges = new Map<string, ViewEdge>()
  for (const edge of index.model.edges) {
    if (edge.kind === 'auto' && !options.includeAuto) continue
    const source = place(edge.from)
    const target = place(edge.to)
    if (!source || !target || source === target) continue
    if (nodes.get(source)!.ghost && nodes.get(target)!.ghost) continue
    const id = `${source}->${target}`
    const view = edges.get(id) ?? { id, source, target, count: 0, kinds: {}, violations: [], inCycle: false, edges: [] }
    view.count++
    view.kinds[edge.kind] = (view.kinds[edge.kind] ?? 0) + 1
    if (edge.violation && !view.violations.includes(edge.violation)) view.violations.push(edge.violation)
    view.edges.push(edge)
    edges.set(id, view)
  }

  const adjacency = new Map<string, Set<string>>()
  for (const edge of edges.values()) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set())
    adjacency.get(edge.source)!.add(edge.target)
  }
  const cycleOf = new Map<string, number>()
  findCycles([...nodes.keys()], adjacency).forEach((cycle, i) => cycle.forEach(id => cycleOf.set(id, i)))
  for (const edge of edges.values()) {
    edge.inCycle = cycleOf.has(edge.source) && cycleOf.get(edge.source) === cycleOf.get(edge.target)
  }

  // Ghosts garbage-collected by the `both ghost` skip above never get an edge, drop them.
  const connected = new Set([...edges.values()].flatMap(e => [e.source, e.target]))
  for (const [id, view] of nodes) {
    if (view.ghost && !connected.has(id)) nodes.delete(id)
  }
  return { nodes: [...nodes.values()], edges: [...edges.values()] }
}

/** All file nodes below a node, or the node itself for a file. */
export function filesOf(index: GraphIndex, id: string): GraphNode[] {
  const node = index.nodes.get(id)
  if (!node) return []
  if (node.kind === 'file') return [node]
  return (index.children.get(id) ?? []).flatMap(child => filesOf(index, child.id))
}

/** Where browsing starts: the repo, or its only package, which would just repeat the repo. */
export function topLevel(index: GraphIndex): string {
  const packages = index.children.get('repo') ?? []
  return packages.length === 1 ? packages[0]!.id : 'repo'
}
