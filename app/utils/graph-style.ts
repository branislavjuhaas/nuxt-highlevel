import type { GraphNode } from "#shared/types/graph";
import type { ViewEdge } from "./graph-view";

export const EDGE_COLORS = {
  import: "#94a3b8",
  dependency: "#94a3b8",
  extends: "#8b5cf6",
  module: "#0ea5e9",
  problem: "#ef4444",
} as const;

export function nodeIcon(node: GraphNode) {
  if (node.kind === "repo") return "i-lucide-box";
  if (node.kind === "area") return "i-lucide-folder";
  if (node.kind === "file")
    return node.path.endsWith(".vue") ? "i-simple-icons-vuedotjs" : "i-lucide-file-code";
  return {
    app: "i-lucide-app-window",
    layer: "i-lucide-layers",
    module: "i-lucide-puzzle",
    lib: "i-lucide-package",
  }[node.packageKind ?? "lib"];
}

export function tierColor(tier?: string) {
  if (tier === "app") return "primary" as const;
  if (tier === "feature") return "info" as const;
  if (tier === "base") return "neutral" as const;
  return "warning" as const;
}

const files = (count: number) => `${count} ${count === 1 ? "file" : "files"}`;

export function nodeSubtitle(node: GraphNode) {
  if (node.kind === "package") return `${node.packageKind} · ${files(node.files)}`;
  if (node.kind === "area") return `${files(node.files)} · ${node.loc} loc`;
  return `${node.loc} loc`;
}

/** Line style: kind decides color and dash, count decides width, problems turn it red. */
export function edgeStyle(edge: ViewEdge, cycleBreaker: boolean) {
  const { kinds } = edge;
  let stroke: string = EDGE_COLORS.import;
  let strokeDasharray: string | undefined;
  if (kinds.extends) {
    stroke = EDGE_COLORS.extends;
  } else if (kinds.module) {
    stroke = EDGE_COLORS.module;
  } else if (!kinds.import) {
    strokeDasharray = "2 4";
  }
  if (edge.violations.length || cycleBreaker) stroke = EDGE_COLORS.problem;
  return { stroke, strokeDasharray, strokeWidth: 1.25 + Math.log2(edge.count) };
}

export function edgeSummary(edge: ViewEdge) {
  const parts = Object.entries(edge.kinds).map(([kind, count]) => `${count}× ${kind}`);
  const auto = edge.edges.filter((e) => e.auto?.length).length;
  if (auto) parts.push(`${auto} via Nuxt auto-import (no import statement)`);
  return [parts.join(", "), ...edge.violations, ...(edge.inCycle ? ["part of a cycle"] : [])].join(
    " · ",
  );
}

export type DepthTone = "deep" | "shallow" | "neutral";

/** Lines of code per name used from outside, the bounds of a deep and a shallow package. */
export const DEEP_LOC_PER_EXPORT = 60;
export const SHALLOW_LOC_PER_EXPORT = 20;
/** Share of an area's files used from outside, the bounds of a deep and a shallow area. */
export const DEEP_SURFACE_RATIO = 0.25;
export const SHALLOW_SURFACE_RATIO = 0.75;

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export interface DepthHint {
  tone: DepthTone;
  /** Standalone sentence, verdict included. */
  text: string;
  /** Just the interface, for lists that already show the verdict and the lines of code. */
  summary: string;
}

/**
 * Hint about module depth: a small interface over a lot of code is good, the reverse is shallow.
 * Packages other than the app always get one, measured by names used from outside against lines of code.
 * Areas get one only when they're big enough and imported from outside, measured in files.
 */
export function depthHint(node: GraphNode): DepthHint | undefined {
  if (node.kind === "package" && node.packageKind !== "app") {
    if (!node.exports) {
      const text =
        "No code imported from outside, it only contributes through Nuxt (pages, plugins, config, …)";
      return { tone: "neutral", text, summary: text };
    }
    const summary = `${plural(node.exports, "name")} used from outside`;
    const perExport = node.loc / node.exports;
    if (perExport >= DEEP_LOC_PER_EXPORT)
      return {
        tone: "deep",
        text: `Deep: ${summary}, backed by ${plural(node.loc, "line")}`,
        summary,
      };
    if (perExport < SHALLOW_LOC_PER_EXPORT)
      return {
        tone: "shallow",
        text: `Shallow: ${summary}, backed by only ${plural(node.loc, "line")}`,
        summary,
      };
    return { tone: "neutral", text: `${summary}, backed by ${plural(node.loc, "line")}`, summary };
  }
  if (node.kind !== "area" || node.files < 4 || !node.surface) return;
  const ratio = node.surface / node.files;
  const summary = `${node.surface} of ${node.files} files used from outside`;
  if (ratio <= DEEP_SURFACE_RATIO)
    return {
      tone: "deep",
      text: `Deep: only ${node.surface} of ${node.files} files are used from outside`,
      summary,
    };
  if (ratio >= SHALLOW_SURFACE_RATIO)
    return {
      tone: "shallow",
      text: `Shallow: ${node.surface} of ${node.files} files are used from outside`,
      summary,
    };
}

export interface DepthEntry {
  node: GraphNode;
  summary: string;
}

/** Every node with a depth hint, grouped by tone, biggest first. */
export function depthGroups(nodes: Iterable<GraphNode>) {
  const groups: Record<DepthTone, DepthEntry[]> = { deep: [], shallow: [], neutral: [] };
  for (const node of nodes) {
    const hint = depthHint(node);
    if (hint) groups[hint.tone].push({ node, summary: hint.summary });
  }
  for (const entries of Object.values(groups)) entries.sort((a, b) => b.node.loc - a.node.loc);
  return groups;
}

const SHORT_PATH = 40;

/**
 * Labels for both ends of an edge. When they'd read the same (two `graph.ts`), shows the paths instead:
 * whole if short, otherwise from the first folder where they part ways.
 */
export function edgeEndLabels(
  from: { label: string; path: string },
  to: { label: string; path: string },
): [string, string] {
  if (from.label !== to.label) return [from.label, to.label];
  if (from.path.length <= SHORT_PATH && to.path.length <= SHORT_PATH) return [from.path, to.path];
  const a = from.path.split("/");
  const b = to.path.split("/");
  let common = 0;
  while (common < Math.min(a.length, b.length) - 1 && a[common] === b[common]) common++;
  const trim = (parts: string[]) => `${common ? "…/" : ""}${parts.slice(common).join("/")}`;
  return [trim(a), trim(b)];
}
