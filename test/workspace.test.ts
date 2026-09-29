import { describe, expect, it } from 'vitest'
import { discoverWorkspace, readNuxtConfig } from '../server/utils/analyzer/workspace'
import { fixtureRoot } from './fixture'

describe('discoverWorkspace', () => {
  const { packages, warnings } = discoverWorkspace(fixtureRoot)
  const byDir = Object.fromEntries(packages.map(p => [p.relDir, p]))

  it('finds the workspace packages', () => {
    expect(Object.keys(byDir).sort()).toEqual(['apps/web', 'apps/web/layers/promo', 'layers/base', 'layers/shop', 'packages/nuxt-foo', 'packages/utils'])
    expect(warnings).toEqual([])
  })

  it('classifies packages', () => {
    expect(byDir['apps/web']!.kind).toBe('app')
    expect(byDir['layers/base']!.kind).toBe('layer')
    expect(byDir['layers/shop']!.kind).toBe('layer')
    // auto-registered from `layers/`, no package.json
    expect(byDir['apps/web/layers/promo']!.kind).toBe('layer')
    expect(byDir['apps/web/layers/promo']!.label).toBe('promo')
    expect(byDir['packages/nuxt-foo']!.kind).toBe('module')
    expect(byDir['packages/utils']!.kind).toBe('lib')
  })

  it('uses short labels', () => {
    expect(byDir['apps/web']!.label).toBe('web')
    expect(byDir['apps/web']!.name).toBe('@mono/web')
  })

  it('collects package edges', () => {
    const web = byDir['apps/web']!
    expect(web.extends).toEqual(['pkg:layers/base', 'pkg:layers/shop', 'pkg:apps/web/layers/promo'])
    expect(web.modules).toEqual(['pkg:packages/nuxt-foo'])
    expect(web.dependencies.sort()).toEqual(['pkg:layers/base', 'pkg:layers/shop', 'pkg:packages/nuxt-foo', 'pkg:packages/utils'])
    expect(byDir['layers/shop']!.dependencies.sort()).toEqual(['pkg:layers/base', 'pkg:packages/utils'])
  })
})

describe('readNuxtConfig', () => {
  it('reads extends and modules statically', () => {
    expect(readNuxtConfig(`${fixtureRoot}/apps/web/nuxt.config.ts`)).toEqual({
      extends: ['../../layers/base', '../../layers/shop'],
      modules: ['../../packages/nuxt-foo/src/module']
    })
  })
})
