import { resolve } from 'pathe'
import type { GraphModel } from '../../shared/types/graph'
import { analyzeRepo } from './analyzer/graph'

let cached: GraphModel | undefined

export function targetRoot() {
  return resolve(useRuntimeConfig().targetRoot || process.cwd())
}

/** Analysis of the target repo, computed once and kept in memory until refreshed. */
export function getAnalysis(refresh = false): GraphModel {
  if (!cached || refresh) cached = analyzeRepo(targetRoot(), useRuntimeConfig().public.repoName || undefined)
  return cached
}
