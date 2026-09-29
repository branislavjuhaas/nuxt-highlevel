import { describe, expect, it } from 'vitest'
import { edgeEndLabels } from '../app/utils/graph-style'

describe('edgeEndLabels', () => {
  it('keeps labels that differ', () => {
    expect(edgeEndLabels({ label: 'a.ts', path: 'src/a.ts' }, { label: 'b.ts', path: 'src/b.ts' })).toEqual(['a.ts', 'b.ts'])
  })

  it('shows short paths whole when labels clash', () => {
    expect(edgeEndLabels(
      { label: 'graph.ts', path: 'app/utils/graph.ts' },
      { label: 'graph.ts', path: 'server/utils/analyzer/graph.ts' }
    )).toEqual(['app/utils/graph.ts', 'server/utils/analyzer/graph.ts'])
  })

  it('drops the shared leading folders of long paths', () => {
    expect(edgeEndLabels(
      { label: 'graph.ts', path: 'packages/core/src/runtime/server/utils/graph.ts' },
      { label: 'graph.ts', path: 'packages/core/src/runtime/shared/graph.ts' }
    )).toEqual(['…/server/utils/graph.ts', '…/shared/graph.ts'])
  })
})
