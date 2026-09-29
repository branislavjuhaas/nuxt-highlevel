import ELK from "elkjs/lib/elk.bundled.js";
import type { ElkNode } from "elkjs/lib/elk-api";

export type LayoutDirection = "RIGHT" | "DOWN";

export interface LayoutInput {
  /** Partitions are laid out in order along the layout direction. Nodes in a box take the box's partition. */
  nodes: { id: string; width: number; height: number; partition: number; box?: string }[];
  edges: { id: string; source: string; target: string }[];
}

export interface LayoutResult {
  direction: LayoutDirection;
  /** Nodes in a box are relative to the box. */
  positions: Map<string, { x: number; y: number }>;
  boxes: Map<string, { x: number; y: number; width: number; height: number }>;
}

/** Room around a box's nodes, with its label on top. */
export const BOX_PADDING = { top: 36, side: 14 };

const elk = new ELK();

function toElk(nodes: LayoutInput["nodes"]): ElkNode[] {
  const partitioned = (partition: number) => ({ "elk.partitioning.partition": String(partition) });
  const boxes = new Map<string, ElkNode>();
  const top: ElkNode[] = [];
  for (const { partition, box, ...node } of nodes) {
    if (!box) {
      top.push({ ...node, layoutOptions: partitioned(partition) });
      continue;
    }
    if (!boxes.has(box)) {
      const { top: padTop, side } = BOX_PADDING;
      const elkBox: ElkNode = {
        id: box,
        children: [],
        layoutOptions: {
          ...partitioned(partition),
          "elk.padding": `[top=${padTop},left=${side},bottom=${side},right=${side}]`,
        },
      };
      boxes.set(box, elkBox);
      top.push(elkBox);
    }
    boxes.get(box)!.children!.push(node);
  }
  return top;
}

async function run(input: LayoutInput, direction: LayoutDirection, aspectRatio: number) {
  const graph: ElkNode = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": direction,
      "elk.aspectRatio": String(aspectRatio),
      "elk.separateConnectedComponents": "true",
      "elk.spacing.componentComponent": "48",
      "elk.spacing.nodeNode": "28",
      "elk.layered.spacing.nodeNodeBetweenLayers": "72",
      "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
      "elk.partitioning.activate": "true",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
    },
    children: toElk(input.nodes),
    edges: input.edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  };
  return elk.layout(graph);
}

/**
 * Lays out the graph in both directions and keeps the one whose shape fits the canvas best,
 * so graphs don't end up as a thin strip.
 */
export function useElkLayout() {
  async function layout(
    input: LayoutInput,
    canvas: { width: number; height: number },
  ): Promise<LayoutResult> {
    const aspectRatio = canvas.width && canvas.height ? canvas.width / canvas.height : 1.6;
    const results = await Promise.all(
      (["RIGHT", "DOWN"] as const).map(async (direction) => ({
        direction,
        graph: await run(input, direction, aspectRatio),
      })),
    );
    const misfit = ({ graph }: (typeof results)[number]) =>
      Math.abs(Math.log((graph.width || 1) / (graph.height || 1) / aspectRatio));
    const best = results.reduce((a, b) => (misfit(b) < misfit(a) ? b : a));
    const positions = new Map<string, { x: number; y: number }>();
    const boxes: LayoutResult["boxes"] = new Map();
    for (const child of best.graph.children ?? []) {
      const at = { x: child.x ?? 0, y: child.y ?? 0 };
      if (!child.children?.length) positions.set(child.id, at);
      else {
        boxes.set(child.id, { ...at, width: child.width ?? 0, height: child.height ?? 0 });
        for (const inner of child.children)
          positions.set(inner.id, { x: inner.x ?? 0, y: inner.y ?? 0 });
      }
    }
    return { direction: best.direction, positions, boxes };
  }
  return { layout };
}
