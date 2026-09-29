import { existsSync, readFileSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'pathe'
import { parseJSON, parseYAML } from 'confbox'
import { globSync } from 'tinyglobby'
import type { PackageKind } from '../../../shared/types/graph'
import { type AstNode, parseScript, propertyName, stringValue, walk } from './ast'

export interface PackageJson {
  name?: string
  keywords?: string[]
  main?: string
  module?: string
  exports?: unknown
  workspaces?: string[] | { packages?: string[] }
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
}

export interface WorkspacePackage {
  id: string
  name: string
  label: string
  /** Absolute directory. */
  dir: string
  /** Directory relative to the root, `.` for the root itself. */
  relDir: string
  kind: PackageKind
  nuxtConfig?: string
  pkg: PackageJson
  /** Package ids. */
  dependencies: string[]
  extends: string[]
  modules: string[]
  externalModules: string[]
}

export interface Workspace {
  root: string
  packages: WorkspacePackage[]
  warnings: string[]
}

const NUXT_CONFIG_NAMES = ['nuxt.config.ts', 'nuxt.config.mts', 'nuxt.config.js', 'nuxt.config.mjs']
const IGNORE = ['**/node_modules/**', '**/.nuxt/**', '**/.output/**', '**/dist/**']

function readJson<T>(file: string): T | undefined {
  try {
    return parseJSON<T>(readFileSync(file, 'utf8'))
  } catch {
    return undefined
  }
}

function workspaceGlobs(root: string, pkg: PackageJson | undefined): string[] | undefined {
  const pnpmFile = join(root, 'pnpm-workspace.yaml')
  if (existsSync(pnpmFile)) {
    let yaml: { packages?: string[] } | undefined
    try {
      yaml = parseYAML(readFileSync(pnpmFile, 'utf8'))
    } catch {
      // empty or broken, fall back to package.json
    }
    if (yaml?.packages?.length) return yaml.packages
  }
  const workspaces = pkg?.workspaces
  if (Array.isArray(workspaces)) return workspaces
  return workspaces?.packages
}

export function findNuxtConfig(dir: string): string | undefined {
  return NUXT_CONFIG_NAMES.map(name => join(dir, name)).find(existsSync)
}

/** Reads `extends` and `modules` from a nuxt.config without executing it. */
export function readNuxtConfig(file: string): { extends: string[], modules: string[] } {
  const result = { extends: [] as string[], modules: [] as string[] }
  const { program } = parseScript(file, readFileSync(file, 'utf8'))
  let config: AstNode | undefined
  walk(program as unknown as AstNode, (node) => {
    if (node.type !== 'ExportDefaultDeclaration') return
    let declaration = node.declaration as AstNode
    if (declaration.type === 'CallExpression') declaration = (declaration.arguments as AstNode[])[0]!
    if (declaration?.type === 'ObjectExpression') config = declaration
  })
  if (!config) return result

  const collect = (value: AstNode): string[] => {
    const single = stringValue(value)
    if (single) return [single]
    if (value.type !== 'ArrayExpression') return []
    return (value.elements as AstNode[]).flatMap((element) => {
      if (!element) return []
      // `[name, options]` tuples
      if (element.type === 'ArrayExpression') return collect((element.elements as AstNode[])[0]!).slice(0, 1)
      const name = stringValue(element)
      return name ? [name] : []
    })
  }
  for (const property of config.properties as AstNode[]) {
    if (property.type !== 'Property') continue
    const name = propertyName(property)
    if (name === 'extends' || name === 'modules') result[name] = collect(property.value as AstNode)
  }
  return result
}

function isNuxtModule(dir: string, pkg: PackageJson): boolean {
  if (pkg.keywords?.includes('nuxt-module')) return true
  const candidates = ['src/module.ts', 'src/module.js', 'module.ts', 'module.js']
  return candidates.some((file) => {
    const path = join(dir, file)
    return existsSync(path) && readFileSync(path, 'utf8').includes('defineNuxtModule')
  })
}

function shortLabel(name: string) {
  return name.replace(/^@[^/]+\//, '')
}

export function discoverWorkspace(rootInput: string): Workspace {
  const root = resolve(rootInput)
  const warnings: string[] = []
  const rootPkg = readJson<PackageJson>(join(root, 'package.json'))
  const globs = workspaceGlobs(root, rootPkg)

  const dirs: string[] = []
  if (globs) {
    const patterns = globs.filter(glob => !glob.startsWith('!')).map(glob => `${glob.replace(/\/$/, '')}/package.json`)
    const ignore = [...IGNORE, ...globs.filter(glob => glob.startsWith('!')).map(glob => `${glob.slice(1)}/**`)]
    for (const file of globSync(patterns, { cwd: root, ignore, absolute: true })) dirs.push(dirname(file))
    // A Nuxt app at the workspace root is a package too.
    if (findNuxtConfig(root)) dirs.push(root)
  } else {
    dirs.push(root)
  }
  const makePackage = (dir: string): WorkspacePackage => {
    const relDir = relative(root, dir) || '.'
    const pkg = readJson<PackageJson>(join(dir, 'package.json')) ?? {}
    const name = pkg.name ?? (relDir === '.' ? basename(dir) : relDir)
    return {
      id: `pkg:${relDir}`,
      name,
      label: shortLabel(pkg.name ?? basename(dir)),
      dir,
      relDir,
      kind: 'lib',
      nuxtConfig: findNuxtConfig(dir),
      pkg,
      dependencies: [],
      extends: [],
      modules: [],
      externalModules: []
    }
  }
  const packages = dirs.map(makePackage)

  // Layers don't need a package.json: Nuxt auto-registers `layers/*` and `extends` can point to any directory.
  const configs = new Map<string, ReturnType<typeof readNuxtConfig>>()
  const autoLayers = new Map<string, string[]>()
  const known = new Map(packages.map(p => [p.dir, p]))
  const queue = packages.filter(p => p.nuxtConfig)
  for (let p = queue.shift(); p; p = queue.shift()) {
    try {
      configs.set(p.id, readNuxtConfig(p.nuxtConfig!))
    } catch (error) {
      warnings.push(`Could not read ${relative(root, p.nuxtConfig!)}: ${(error as Error).message}`)
    }
    const auto = globSync('layers/*/nuxt.config.{ts,mts,js,mjs}', { cwd: p.dir, absolute: true }).map(dirname).sort()
    autoLayers.set(p.id, auto)
    const extended = (configs.get(p.id)?.extends ?? [])
      .filter(entry => entry.startsWith('.'))
      .map(entry => resolve(p!.dir, entry))
      .filter(dir => findNuxtConfig(dir))
    for (const dir of [...auto, ...extended]) {
      if (known.has(dir)) continue
      const layer = makePackage(dir)
      packages.push(layer)
      known.set(dir, layer)
      queue.push(layer)
    }
  }
  packages.sort((a, b) => a.relDir.localeCompare(b.relDir))

  const labelCounts = new Map<string, number>()
  for (const p of packages) labelCounts.set(p.label, (labelCounts.get(p.label) ?? 0) + 1)
  for (const p of packages) {
    if (labelCounts.get(p.label)! > 1) p.label = p.name
  }

  const byName = new Map(packages.map(p => [p.name, p]))
  const owner = (path: string) => packages
    .filter(p => path === p.dir || path.startsWith(`${p.dir}/`))
    .sort((a, b) => b.dir.length - a.dir.length)[0]

  /** Resolves an `extends`/`modules` entry to a workspace package. */
  const resolveReference = (from: WorkspacePackage, entry: string): WorkspacePackage | undefined => {
    if (entry.startsWith('.') || entry.startsWith('/')) return owner(resolve(from.dir, entry))
    const [scopeOrName, maybeName] = entry.split('/')
    const name = scopeOrName!.startsWith('@') ? `${scopeOrName}/${maybeName}` : scopeOrName!
    return byName.get(name)
  }

  const extended = new Set<string>()
  const usedAsModule = new Set<string>()
  for (const p of packages) {
    for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const) {
      for (const dep of Object.keys(p.pkg[field] ?? {})) {
        const target = byName.get(dep)
        if (target && target !== p && !p.dependencies.includes(target.id)) p.dependencies.push(target.id)
      }
    }
    const config = configs.get(p.id)
    if (!config) continue
    const layerTargets = [
      ...config.extends.map(entry => resolveReference(p, entry)),
      ...autoLayers.get(p.id)!.map(dir => known.get(dir))
    ]
    for (const target of layerTargets) {
      if (target && target !== p && !p.extends.includes(target.id)) {
        p.extends.push(target.id)
        extended.add(target.id)
      }
    }
    for (const entry of config.modules) {
      const target = resolveReference(p, entry)
      if (!target) {
        if (!entry.startsWith('.')) p.externalModules.push(entry)
      } else if (target !== p) {
        p.modules.push(target.id)
        usedAsModule.add(target.id)
      }
    }
  }

  for (const p of packages) {
    if (p.nuxtConfig) p.kind = extended.has(p.id) ? 'layer' : 'app'
    else if (usedAsModule.has(p.id) || isNuxtModule(p.dir, p.pkg)) p.kind = 'module'
  }

  return { root, packages, warnings }
}
