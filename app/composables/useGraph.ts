import type { GraphModel } from '#shared/types/graph'

export function useGraph() {
  const { data: model, status, error } = useFetch<GraphModel>('/api/graph', { key: 'graph' })
  const index = computed(() => model.value ? indexGraph(model.value) : undefined)
  const refreshing = ref(false)

  async function reanalyze() {
    refreshing.value = true
    try {
      model.value = await $fetch<GraphModel>('/api/refresh', { method: 'POST' })
    } finally {
      refreshing.value = false
    }
  }

  return { model, index, status, error, refreshing, reanalyze }
}
