export interface Graph {
  nodes: string[];
  edges: [string, string][];
  cycles?: string[][];
}
