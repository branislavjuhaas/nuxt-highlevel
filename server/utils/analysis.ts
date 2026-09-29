import { resolve } from 'pathe'
import type { GraphModel } from '../../shared/types/graph'
import { analyzeRepo } from './analyzer/graph'
import { prepareApps } from './analyzer/prepare'

let cached: Promise<GraphModel> | undefined

export function targetRoot() {
  return resolve(useRuntimeConfig().targetRoot || process.cwd())
}

async function analyze(): Promise<GraphModel> {
  const root = targetRoot()
  const prepareWarnings = await prepareApps(root)
  const graph = analyzeRepo(root, useRuntimeConfig().public.repoName || undefined)
  graph.warnings.unshift(...prepareWarnings)
  return graph
}

/** Analysis of the target repo, computed once and kept in memory until refreshed. */
export function getAnalysis(refresh = false): Promise<GraphModel> {
  if (!cached || refresh) {
    cached = analyze()
    // Don't cache a failure, the next request retries.
    cached.catch(() => (cached = undefined))
  }
  return cached
}
