import type { Graph } from '#shared/types/graph'

export function buildGraph(): Graph {
  const graph: Graph = { nodes: [], edges: [] }
  return { ...graph, cycles: findCycles(graph) }
}
