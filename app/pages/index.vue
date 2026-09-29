<script setup lang="ts">
import type { BreadcrumbItem } from '@nuxt/ui'
import { useStorage } from '@vueuse/core'
import type { ViewEdge } from '~/utils/graph-view'

const route = useRoute()
const router = useRouter()
const { model, index, status, error, refreshing, reanalyze } = useGraph()
const { open: openInEditor } = useOpenInEditor()

const includeAuto = useStorage('nuxt-highlevel:include-auto', true)
const lastPath = useStorage<Record<string, string>>('nuxt-highlevel:last-path', {})
const searchOpen = ref(false)
const selectedId = ref<string>()
const selectedEdge = ref<ViewEdge>()

// Drill path lives in the URL, the last one per repo is restored on the next visit.
const parentId = computed(() => {
  const path = route.query.path
  return typeof path === 'string' && index.value?.nodes.has(path) ? path : 'repo'
})
watch(model, (value) => {
  const saved = value && lastPath.value[value.root]
  if (saved && !route.query.path && index.value?.nodes.has(saved)) router.replace({ query: { path: saved } })
}, { once: true })
watch(parentId, (id) => {
  if (model.value) lastPath.value = { ...lastPath.value, [model.value.root]: id }
})

const view = computed(() => index.value && buildView(index.value, parentId.value, { includeAuto: includeAuto.value }))
const selectedNode = computed(() => selectedId.value ? index.value?.nodes.get(selectedId.value) : undefined)

const breadcrumb = computed<BreadcrumbItem[]>(() => index.value?.chain(parentId.value).map((id) => {
  const node = index.value!.nodes.get(id)!
  return { label: node.label, icon: nodeIcon(node), to: { query: { path: id } } }
}) ?? [])

function clearSelection() {
  selectedId.value = undefined
  selectedEdge.value = undefined
}

function select(id: string) {
  selectedEdge.value = undefined
  selectedId.value = id
}

function selectEdge(edge: ViewEdge) {
  selectedId.value = edge.id
  selectedEdge.value = edge
}

function drill(id: string) {
  clearSelection()
  router.push({ query: { path: id } })
}

/** Shows a node in its own level and selects it. */
function focus(id: string) {
  const node = index.value?.nodes.get(id)
  if (!node) return
  if (node.parent && node.parent !== parentId.value) router.push({ query: { path: node.parent } })
  select(id)
}

function activate(id: string) {
  const node = index.value?.nodes.get(id)
  const inView = view.value?.nodes.find(n => n.node.id === id)
  if (!node || !inView) return
  if (inView.ghost) focus(id)
  else if (node.kind === 'file') openInEditor(node.path)
  else drill(id)
}

function goUp() {
  const parent = index.value?.nodes.get(parentId.value)?.parent
  if (parent) drill(parent)
}

const activeElement = useActiveElement()
const typing = computed(() => ['INPUT', 'TEXTAREA'].includes(activeElement.value?.tagName ?? '') || activeElement.value?.isContentEditable)
const keys = useMagicKeys({
  passive: false,
  onEventFired(event) {
    if (event.type === 'keydown' && (event.metaKey || event.ctrlKey) && event.key === 'k') event.preventDefault()
  }
})
whenever(() => keys['Meta+K']!.value || keys['Ctrl+K']!.value, () => searchOpen.value = true)
whenever(() => keys.Escape!.value && !searchOpen.value, clearSelection)
whenever(() => keys.Backspace!.value && !typing.value && !searchOpen.value, goUp)
</script>

<template>
  <div class="flex h-dvh flex-col">
    <header class="flex h-14 shrink-0 items-center gap-3 border-b border-default px-4">
      <UBreadcrumb
        :items="breadcrumb"
        class="min-w-0 flex-1"
      />

      <UPopover v-if="model?.warnings.length">
        <UButton
          :label="`${model.warnings.length} warning${model.warnings.length > 1 ? 's' : ''}`"
          icon="i-lucide-info"
          color="warning"
          variant="soft"
          size="sm"
        />
        <template #content>
          <ul class="max-w-md space-y-2 p-3 text-sm">
            <li
              v-for="warning in model.warnings"
              :key="warning"
            >
              {{ warning }}
            </li>
          </ul>
        </template>
      </UPopover>

      <UButton
        label="Search"
        icon="i-lucide-search"
        color="neutral"
        variant="outline"
        size="sm"
        @click="searchOpen = true"
      >
        <template #trailing>
          <UKbd
            value="meta"
            size="sm"
          />
          <UKbd
            value="K"
            size="sm"
          />
        </template>
      </UButton>
      <USwitch
        v-model="includeAuto"
        label="Auto-imports"
        size="sm"
      />
      <UTooltip :text="`Re-analyze ${model?.root ?? ''}`">
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          size="sm"
          aria-label="Re-analyze"
          :loading="refreshing"
          @click="reanalyze"
        />
      </UTooltip>
      <UColorModeButton size="sm" />
    </header>

    <div class="flex min-h-0 flex-1">
      <main class="relative min-w-0 flex-1">
        <div
          v-if="status === 'pending'"
          class="flex h-full items-center justify-center gap-2 text-muted"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-5 animate-spin"
          />
          Analyzing…
        </div>
        <div
          v-else-if="error"
          class="p-6"
        >
          <UAlert
            color="error"
            icon="i-lucide-circle-x"
            title="Analysis failed"
            :description="error.statusMessage ?? error.message"
          />
        </div>
        <template v-else-if="view && index">
          <div
            v-if="!view.nodes.length"
            class="flex h-full items-center justify-center text-muted"
          >
            Nothing to show here.
          </div>
          <GraphCanvas
            v-else
            :view="view"
            :selected-id="selectedId"
            @select="select"
            @select-edge="selectEdge"
            @activate="activate"
            @clear="clearSelection"
          />
          <div class="pointer-events-none absolute bottom-3 left-3 space-y-2">
            <GraphLegend class="pointer-events-auto" />
            <p class="text-xs text-dimmed">
              Double-click to open · Backspace to go up · Tiers from {{ model?.rulesSource }}
            </p>
          </div>
          <GraphSearch
            v-model:open="searchOpen"
            :index="index"
            @select="focus"
          />
        </template>
      </main>

      <NodePanel
        v-if="index && view && (selectedNode || selectedEdge)"
        :index="index"
        :view="view"
        :node="selectedNode"
        :edge="selectedEdge"
        @focus="focus"
        @drill="drill"
        @close="clearSelection"
      />
    </div>
  </div>
</template>
