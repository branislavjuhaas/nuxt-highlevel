import ELK from 'elkjs/lib/elk.bundled.js'
import type { ElkNode } from 'elkjs/lib/elk-api'

export type LayoutDirection = 'RIGHT' | 'DOWN'

export interface LayoutInput {
  /** Partitions are laid out in order along the layout direction. */
  nodes: { id: string, width: number, height: number, partition: number }[]
  edges: { id: string, source: string, target: string }[]
}

export interface LayoutResult {
  direction: LayoutDirection
  positions: Map<string, { x: number, y: number }>
}

const elk = new ELK()

async function run(input: LayoutInput, direction: LayoutDirection, aspectRatio: number) {
  const graph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.aspectRatio': String(aspectRatio),
      'elk.separateConnectedComponents': 'true',
      'elk.spacing.componentComponent': '48',
      'elk.spacing.nodeNode': '28',
      'elk.layered.spacing.nodeNodeBetweenLayers': '72',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.partitioning.activate': 'true'
    },
    children: input.nodes.map(({ partition, ...n }) => ({ ...n, layoutOptions: { 'elk.partitioning.partition': String(partition) } })),
    edges: input.edges.map(e => ({ id: e.id, sources: [e.source], targets: [e.target] }))
  }
  return elk.layout(graph)
}

/**
 * Lays out the graph in both directions and keeps the one whose shape fits the canvas best,
 * so graphs don't end up as a thin strip.
 */
export function useElkLayout() {
  async function layout(input: LayoutInput, canvas: { width: number, height: number }): Promise<LayoutResult> {
    const aspectRatio = canvas.width && canvas.height ? canvas.width / canvas.height : 1.6
    const results = await Promise.all((['RIGHT', 'DOWN'] as const).map(async direction => ({ direction, graph: await run(input, direction, aspectRatio) })))
    const misfit = ({ graph }: (typeof results)[number]) => Math.abs(Math.log((graph.width || 1) / (graph.height || 1) / aspectRatio))
    const best = results.reduce((a, b) => misfit(b) < misfit(a) ? b : a)
    const positions = new Map((best.graph.children ?? []).map(child => [child.id, { x: child.x ?? 0, y: child.y ?? 0 }]))
    return { direction: best.direction, positions }
  }
  return { layout }
}
