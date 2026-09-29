import { existsSync, readFileSync } from 'node:fs'
import { parseJSONC } from 'confbox'
import { dirname, isAbsolute, join, resolve } from 'pathe'
import { resolveFile } from './resolve'

export interface NuxtRegistry {
  /** Component name (incl. `Lazy*`) → absolute file. */
  components: Map<string, string>
  /** Auto-imported identifier in app code → absolute file. */
  imports: Map<string, string>
  /** Auto-imported identifier in Nitro code → absolute file. */
  serverImports: Map<string, string>
  /** tsconfig `paths` from `.nuxt/`, longest key first. */
  aliases: [string, string][]
}

const COMPONENT_RE = /^\s*(?:export const\s+)?['"]?([\w$]+)['"]?\s*:\s*(?:\w+<\s*)?typeof import\((['"])(.+?)\2\)/gm
const IMPORT_RE = /const\s+([\w$]+)\s*:\s*typeof import\((['"])(.+?)\2\)/g

function readText(file: string) {
  return existsSync(file) ? readFileSync(file, 'utf8') : undefined
}

/** Maps names to files that exist, skipping virtual (`#app/...`) and dependency sources. */
function collect(file: string, re: RegExp): Map<string, string> {
  const map = new Map<string, string>()
  const text = readText(file)
  if (!text) return map
  for (const match of text.matchAll(re)) {
    const [, name, , source] = match
    if (map.has(name!) || !(source!.startsWith('.') || isAbsolute(source!))) continue
    if (source!.includes('/node_modules/')) continue
    const path = resolveFile(resolve(dirname(file), source!))
    if (path) map.set(name!, path)
  }
  return map
}

function readAliases(nuxtDir: string): [string, string][] {
  const aliases = new Map<string, string>()
  for (const name of ['tsconfig.app.json', 'tsconfig.server.json', 'tsconfig.json']) {
    const text = readText(join(nuxtDir, name))
    if (!text) continue
    const paths = parseJSONC<{ compilerOptions?: { paths?: Record<string, string[]> } }>(text).compilerOptions?.paths ?? {}
    for (const [key, targets] of Object.entries(paths)) {
      const target = targets[0]
      if (!target || aliases.has(key) || target.includes('node_modules')) continue
      const absolute = resolve(nuxtDir, target)
      // Skip `#build`, `#imports` and friends, they point into `.nuxt/` itself.
      if (absolute === nuxtDir || absolute.startsWith(`${nuxtDir}/`)) continue
      aliases.set(key, absolute)
    }
  }
  return [...aliases].sort((a, b) => b[0].length - a[0].length)
}

/** Reads the auto-import registry Nuxt generated for an app or layer, if `.nuxt/` exists. */
export function readNuxtRegistry(dir: string): NuxtRegistry | undefined {
  const nuxtDir = join(dir, '.nuxt')
  const componentsFile = [join(nuxtDir, 'types/components.d.ts'), join(nuxtDir, 'components.d.ts')].find(existsSync)
  if (!componentsFile) return
  return {
    components: collect(componentsFile, COMPONENT_RE),
    imports: collect(join(nuxtDir, 'types/imports.d.ts'), IMPORT_RE),
    serverImports: collect(join(nuxtDir, 'types/nitro-imports.d.ts'), IMPORT_RE),
    aliases: readAliases(nuxtDir)
  }
}

export function resolveAlias(aliases: [string, string][], specifier: string): string | undefined {
  for (const [key, target] of aliases) {
    if (key.endsWith('/*')) {
      const prefix = key.slice(0, -1)
      if (specifier.startsWith(prefix)) return target.replace('*', specifier.slice(prefix.length))
    } else if (specifier === key) {
      return target
    }
  }
}
