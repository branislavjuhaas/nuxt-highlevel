export type NodeKind = 'repo' | 'package' | 'area' | 'file'
export type PackageKind = 'app' | 'layer' | 'module' | 'lib'
/** `import` connects files (explicit and Nuxt auto-imports), the rest are declared between packages. */
export type EdgeKind = 'import' | 'dependency' | 'extends' | 'module'

export interface GraphNode {
  id: string
  kind: NodeKind
  /** Short display label, never a full path. */
  label: string
  parent: string | null
  /** Path relative to the analyzed root. */
  path: string
  packageKind?: PackageKind
  /** Full package name from package.json. */
  packageName?: string
  tier?: string
  tierReason?: string
  /** Nuxt modules used by the package that live outside the repo. */
  externalModules?: string[]
  /** Number of files inside (1 for a file). */
  files: number
  loc: number
  /** Files inside this node used from outside of it. */
  surface: number
  /** Distinct names inside this node imported from outside of it. */
  exports: number
  /** Distinct nodes of the same kind this node depends on / is used by. */
  fanOut: number
  fanIn: number
  /** Part of a dependency cycle between files. */
  inCycle: boolean
}

export interface GraphEdge {
  from: string
  to: string
  kind: EdgeKind
  /** Imported names for file edges. */
  names?: string[]
  /** The subset of `names` Nuxt auto-imports, used without an import statement. */
  auto?: string[]
  /** 1-based lines in the `from` file where the dependency is imported or first used. */
  lines?: number[]
  /** Text of the tier rule this edge breaks. */
  violation?: string
}

export interface TierRule {
  from: string
  disallow: string[]
}

export interface GraphModel {
  root: string
  repoName: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  rules: TierRule[]
  /** Where the tiers and rules came from. */
  rulesSource: 'default' | 'nuxt-highlevel.json'
  /** File-level cycles as lists of file ids. */
  cycles: string[][]
  warnings: string[]
  generatedAt: string
}
