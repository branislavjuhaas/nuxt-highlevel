import type { Graph } from '../types/graph'

export function findCycles(graph: Graph): string[][] {
  return graph.edges.filter(([from, to]) => from === to).map(([from]) => [from])
}
