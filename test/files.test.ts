import { describe, expect, it } from 'vitest'
import { scanFile } from '../server/utils/analyzer/files'
import { readNuxtRegistry, resolveAlias } from '../server/utils/analyzer/nuxt-registry'
import { fixtureRoot } from './fixture'

describe('readNuxtRegistry', () => {
  const registry = readNuxtRegistry(`${fixtureRoot}/apps/web`)!

  it('maps components, including those from layers', () => {
    expect(registry.components.get('TreeNode')).toBe(`${fixtureRoot}/apps/web/app/components/TreeNode.vue`)
    expect(registry.components.get('LazyCartBadge')).toBe(`${fixtureRoot}/layers/shop/app/components/CartBadge.vue`)
    // Nuxt's own components live in node_modules and are skipped.
    expect(registry.components.has('NuxtPage')).toBe(false)
  })

  it('maps app and server auto-imports to files', () => {
    expect(registry.imports.get('useTheme')).toBe(`${fixtureRoot}/layers/base/app/composables/useTheme.ts`)
    expect(registry.imports.get('useFoo')).toBe(`${fixtureRoot}/packages/nuxt-foo/src/runtime/composables/useFoo.ts`)
    expect(registry.imports.has('useState')).toBe(false)
    expect(registry.serverImports.get('greet')).toBe(`${fixtureRoot}/apps/web/server/utils/greet.ts`)
  })

  it('resolves aliases', () => {
    expect(resolveAlias(registry.aliases, '~/composables/useCart')).toBe(`${fixtureRoot}/apps/web/app/composables/useCart`)
    expect(resolveAlias(registry.aliases, '~~/server/utils/greet')).toBe(`${fixtureRoot}/apps/web/server/utils/greet`)
    expect(resolveAlias(registry.aliases, 'vue')).toBeUndefined()
  })

  it('returns nothing without .nuxt/', () => {
    expect(readNuxtRegistry(`${fixtureRoot}/layers/base`)).toBeUndefined()
  })
})

describe('scanFile', () => {
  it('collects imports, identifiers and component tags from an SFC', () => {
    const scan = scanFile('Page.vue', `
<script setup lang="ts">
import { formatPrice } from '@mono/utils'
const local = useCart()
const lazy = () => import('./Lazy.vue')
</script>
<template>
  <tree-branch :depth="1" />
  <ProductList v-if="isReady(local)" />
  <div>{{ formatTotal(local) }}</div>
</template>`)
    expect(scan.imports).toEqual([
      { specifier: '@mono/utils', names: ['formatPrice'] },
      { specifier: './Lazy.vue', names: [] }
    ])
    expect([...scan.components].sort()).toEqual(['ProductList', 'TreeBranch'])
    expect(scan.identifiers).toContain('useCart')
    expect(scan.identifiers).toContain('isReady')
    expect(scan.identifiers).toContain('formatTotal')
    // declared locally or imported explicitly
    expect(scan.identifiers).not.toContain('formatPrice')
  })

  it('ignores member properties in template expressions', () => {
    const scan = scanFile('Item.vue', '<template><p>{{ item.useCart }}</p></template>')
    expect(scan.identifiers).toContain('item')
    expect(scan.identifiers).not.toContain('useCart')
  })

  it('ignores property names and collects re-exports', () => {
    const scan = scanFile('index.ts', `export { a } from './a'\nexport * from './b'\nconst x = obj.useNotThis({ alsoNot: 1 })`)
    expect(scan.imports.map(i => i.specifier)).toEqual(['./a', './b'])
    expect(scan.identifiers).toContain('obj')
    expect(scan.identifiers).not.toContain('useNotThis')
    expect(scan.identifiers).not.toContain('alsoNot')
  })
})
