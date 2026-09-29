import type { Graph } from "#shared/types/graph";

export function useGraph() {
  const { data: graph, refresh } = useFetch<Graph>("/api/graph");
  return { graph, refresh };
}
