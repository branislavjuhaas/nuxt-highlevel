import { existsSync, readFileSync } from 'node:fs'
import { join } from 'pathe'
import picomatch from 'picomatch'
import type { PackageKind, TierRule } from '../../../shared/types/graph'

export const CONFIG_FILE = 'nuxt-highlevel.json'

export interface TierConfig {
  /** Tier name → globs matched against package path or name. First match wins. */
  tiers?: Record<string, string[]>
  rules?: TierRule[]
}

export const DEFAULT_RULES: TierRule[] = [
  { from: 'base', disallow: ['feature', 'app'] },
  { from: 'feature', disallow: ['app'] }
]

const BASE_NAMES = new Set(['base', 'common', 'core', 'shared', 'ui', 'utils'])

export interface TierPackage {
  name: string
  relDir: string
  kind: PackageKind
}

export function loadTierConfig(root: string): { config?: TierConfig, warnings: string[] } {
  const file = join(root, CONFIG_FILE)
  if (!existsSync(file)) return { warnings: [] }
  try {
    return { config: JSON.parse(readFileSync(file, 'utf8')) as TierConfig, warnings: [] }
  } catch (error) {
    return { warnings: [`Ignoring ${CONFIG_FILE}: ${(error as Error).message}`] }
  }
}

function defaultTier(pkg: TierPackage): { tier: string, reason: string } {
  if (pkg.kind === 'app') return { tier: 'app', reason: 'default: Nuxt app' }
  const tokens = [...pkg.relDir.split(/[/._-]/), ...pkg.name.split(/[@/._-]/)]
  const match = tokens.find(token => BASE_NAMES.has(token))
  if (match) return { tier: 'base', reason: `default: name or path contains "${match}"` }
  return { tier: 'feature', reason: 'default: everything else is feature' }
}

export function assignTier(pkg: TierPackage, config?: TierConfig): { tier: string, reason: string } {
  for (const [tier, globs] of Object.entries(config?.tiers ?? {})) {
    for (const glob of globs) {
      const isMatch = picomatch(glob)
      if (isMatch(pkg.relDir) || isMatch(pkg.name)) return { tier, reason: `${CONFIG_FILE}: "${glob}"` }
    }
  }
  return defaultTier(pkg)
}

/** Returns the rule text when `from` must not depend on `to`. */
export function findViolation(fromTier: string, toTier: string, rules: TierRule[]): string | undefined {
  if (fromTier === toTier) return
  const rule = rules.find(r => r.from === fromTier && r.disallow.includes(toTier))
  if (rule) return `${fromTier} must not depend on ${toTier}`
}
