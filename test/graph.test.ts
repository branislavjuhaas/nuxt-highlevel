import { describe, expect, it } from 'vitest'
import { analyzeRepo, areaOf } from '../server/utils/analyzer/graph'
import { fixtureRoot } from './fixture'

const WEB = 'pkg:apps/web'

describe('areaOf', () => {
  it('strips the Nuxt srcDir and src/', () => {
    expect(areaOf('app/components/cart/Badge.vue', true)).toEqual({ area: 'components', rest: 'cart/Badge.vue' })
    expect(areaOf('server/api/hello.ts', true)).toEqual({ area: 'server', rest: 'api/hello.ts' })
  })

  it('has no area for files directly in the package or its source dir', () => {
    expect(areaOf('app/app.vue', true)).toEqual({ rest: 'app.vue' })
    expect(areaOf('src/format.ts', false)).toEqual({ rest: 'format.ts' })
    expect(areaOf('module.ts', false)).toEqual({ rest: 'module.ts' })
  })
})

describe('analyzeRepo', () => {
  const model = analyzeRepo(fixtureRoot)
  const has = (from: string, to: string, kind: string) =>
    model.edges.some(e => e.from.endsWith(from) && e.to.endsWith(to) && e.kind === kind)

  it('builds the hierarchy with short labels', () => {
    const packages = model.nodes.filter(n => n.kind === 'package')
    expect(packages.map(n => n.label).sort()).toEqual(['base', 'nuxt-foo', 'promo', 'shop', 'utils', 'web'])
    const children = model.nodes.filter(n => n.parent === WEB).map(n => n.label).sort()
    expect(children).toEqual(['app.vue', 'components', 'composables', 'pages', 'server'])
    expect(model.nodes.find(n => n.id === `${WEB}/file:app.vue`)!.path).toBe('apps/web/app/app.vue')
    const file = model.nodes.find(n => n.id === `${WEB}/area:components/file:TreeNode.vue`)!
    expect(file.label).toBe('TreeNode.vue')
    expect(file.path).toBe('apps/web/app/components/TreeNode.vue')
    expect(model.warnings).toEqual([])
  })

  it('finds explicit and auto-import edges', () => {
    expect(has('file:app.vue', 'file:AppHeader.vue', 'import')).toBe(true)
    expect(has('file:index.vue', 'file:ProductList.vue', 'import')).toBe(true)
    expect(has('file:index.vue', 'pkg:apps/web/layers/promo/area:components/file:PromoBanner.vue', 'import')).toBe(true)
    expect(has('file:index.vue', 'file:useCart.ts', 'import')).toBe(true)
    expect(has('file:index.vue', 'area:runtime/file:composables/useFoo.ts', 'import')).toBe(true)
    expect(has('file:index.vue', 'file:index.ts', 'import')).toBe(true)
    expect(has('pkg:packages/utils/file:index.ts', 'file:format.ts', 'import')).toBe(true)
    expect(has('file:api/hello.ts', 'file:utils/greet.ts', 'import')).toBe(true)
    // borrowed registry: layer files resolve through the app extending them
    expect(has('file:ProductList.vue', 'file:useTheme.ts', 'import')).toBe(true)
    // `useState` comes from Nuxt itself, not from the repo
    expect(model.edges.filter(e => e.kind === 'import' && e.from.endsWith('CartBadge.vue'))).toEqual([])
  })

  it('marks names used without an import statement as auto', () => {
    const edge = (from: string, to: string) => model.edges.find(e => e.from.endsWith(from) && e.to.endsWith(to))!
    expect(edge('file:index.vue', 'file:useCart.ts').auto).toEqual(['useCart'])
    expect(edge('file:app.vue', 'file:AppHeader.vue').auto).toEqual(['AppHeader'])
    expect(edge('pkg:packages/utils/file:index.ts', 'file:format.ts').auto).toBeUndefined()
  })

  it('keeps package-level edges', () => {
    expect(has(WEB, 'pkg:layers/base', 'extends')).toBe(true)
    expect(has(WEB, 'pkg:packages/nuxt-foo', 'module')).toBe(true)
    expect(has(WEB, 'pkg:packages/utils', 'dependency')).toBe(true)
  })

  it('detects the component cycle', () => {
    expect(model.cycles).toEqual([[`${WEB}/area:components/file:TreeBranch.vue`, `${WEB}/area:components/file:TreeNode.vue`]])
    expect(model.nodes.find(n => n.id === WEB)!.inCycle).toBe(true)
    expect(model.nodes.find(n => n.id === 'pkg:packages/utils')!.inCycle).toBe(false)
  })

  it('flags the base → feature violation', () => {
    const violations = model.edges.filter(e => e.violation)
    expect(violations).toEqual([expect.objectContaining({
      from: 'pkg:layers/base/area:components/file:AppHeader.vue',
      to: 'pkg:layers/shop/area:components/file:CartBadge.vue',
      kind: 'import',
      lines: [8],
      violation: 'base must not depend on feature'
    })])
    expect(model.rulesSource).toBe('nuxt-highlevel.json')
    expect(model.nodes.find(n => n.id === 'pkg:packages/nuxt-foo')!.tier).toBe('base')
  })

  it('computes metrics', () => {
    const utils = model.nodes.find(n => n.id === 'pkg:packages/utils')!
    expect(utils.files).toBe(3)
    // only src/index.ts is used from outside
    expect(utils.surface).toBe(1)
    expect(utils.fanOut).toBe(0)
    expect(utils.fanIn).toBe(2)
  })
})

describe('analyzeRepo without .nuxt/', () => {
  it('warns that auto-imported dependencies are missing', () => {
    const model = analyzeRepo(`${fixtureRoot}/apps/web/layers/promo`)
    expect(model.warnings).toEqual([expect.stringContaining('no .nuxt/ found, auto-imported dependencies are missing')])
  })
})
