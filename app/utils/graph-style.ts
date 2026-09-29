import type { GraphNode } from '#shared/types/graph'
import type { ViewEdge } from './graph-view'

export const EDGE_COLORS = {
  import: '#94a3b8',
  dependency: '#94a3b8',
  extends: '#8b5cf6',
  module: '#0ea5e9',
  problem: '#ef4444'
} as const

export function nodeIcon(node: GraphNode) {
  if (node.kind === 'repo') return 'i-lucide-box'
  if (node.kind === 'area') return 'i-lucide-folder'
  if (node.kind === 'file') return node.path.endsWith('.vue') ? 'i-simple-icons-vuedotjs' : 'i-lucide-file-code'
  return {
    app: 'i-lucide-app-window',
    layer: 'i-lucide-layers',
    module: 'i-lucide-puzzle',
    lib: 'i-lucide-package'
  }[node.packageKind ?? 'lib']
}

export function tierColor(tier?: string) {
  if (tier === 'app') return 'primary' as const
  if (tier === 'feature') return 'info' as const
  if (tier === 'base') return 'neutral' as const
  return 'warning' as const
}

const files = (count: number) => `${count} ${count === 1 ? 'file' : 'files'}`

export function nodeSubtitle(node: GraphNode) {
  if (node.kind === 'package') return `${node.packageKind} · ${files(node.files)}`
  if (node.kind === 'area') return `${files(node.files)} · ${node.loc} loc`
  return `${node.loc} loc`
}

/** Line style: kind decides color and dash, count decides width, problems turn it red. */
export function edgeStyle(edge: ViewEdge, cycleBreaker: boolean) {
  const { kinds } = edge
  let stroke: string = EDGE_COLORS.import
  let strokeDasharray: string | undefined
  if (kinds.extends) {
    stroke = EDGE_COLORS.extends
  } else if (kinds.module) {
    stroke = EDGE_COLORS.module
  } else if (!kinds.import) {
    strokeDasharray = '2 4'
  }
  if (edge.violations.length || cycleBreaker) stroke = EDGE_COLORS.problem
  return { stroke, strokeDasharray, strokeWidth: 1.25 + Math.log2(edge.count) }
}

export function edgeSummary(edge: ViewEdge) {
  const parts = Object.entries(edge.kinds).map(([kind, count]) => `${count}× ${kind}`)
  const auto = edge.edges.filter(e => e.auto?.length).length
  if (auto) parts.push(`${auto} via Nuxt auto-import (no import statement)`)
  return [parts.join(', '), ...edge.violations, ...(edge.inCycle ? ['part of a cycle'] : [])].join(' · ')
}

/** Hint about module depth: small surface over many files is good, the reverse is shallow. */
export function depthHint(node: GraphNode) {
  if (node.kind === 'file' || node.files < 4) return
  const ratio = node.surface / node.files
  if (ratio <= 0.25) return { deep: true, text: `Deep: only ${node.surface} of ${node.files} files are used from outside` }
  if (ratio >= 0.75) return { deep: false, text: `Shallow: ${node.surface} of ${node.files} files are used from outside` }
}

const SHORT_PATH = 40

/**
 * Labels for both ends of an edge. When they'd read the same (two `graph.ts`), shows the paths instead:
 * whole if short, otherwise from the first folder where they part ways.
 */
export function edgeEndLabels(from: { label: string, path: string }, to: { label: string, path: string }): [string, string] {
  if (from.label !== to.label) return [from.label, to.label]
  if (from.path.length <= SHORT_PATH && to.path.length <= SHORT_PATH) return [from.path, to.path]
  const a = from.path.split('/')
  const b = to.path.split('/')
  let common = 0
  while (common < Math.min(a.length, b.length) - 1 && a[common] === b[common]) common++
  const trim = (parts: string[]) => `${common ? '…/' : ''}${parts.slice(common).join('/')}`
  return [trim(a), trim(b)]
}
