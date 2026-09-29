<script setup lang="ts">
import type { GraphEdge, GraphNode } from '#shared/types/graph'
import type { GraphIndex, GraphView, ViewEdge } from '~/utils/graph-view'

const props = defineProps<{
  index: GraphIndex
  view: GraphView
  node?: GraphNode
  edge?: ViewEdge
}>()

const emit = defineEmits<{
  focus: [id: string]
  drill: [id: string]
  close: []
}>()

const { open } = useOpenInEditor()
const { show: showCode } = useCodeViewer()
const linesLabel = (lines: number[]) => `${lines.length > 1 ? 'Lines' : 'Line'} ${lines.join(', ')}`
const label = (id: string) => props.index.nodes.get(id)?.label ?? id
const pathOf = (id: string) => props.index.nodes.get(id)?.path ?? id
const endLabels = (e: GraphEdge) => edgeEndLabels({ label: label(e.from), path: pathOf(e.from) }, { label: label(e.to), path: pathOf(e.to) })

const outgoing = computed(() => props.view.edges.filter(e => e.source === props.node?.id))
const incoming = computed(() => props.view.edges.filter(e => e.target === props.node?.id))
const violations = computed(() => [...new Set([...outgoing.value, ...incoming.value].flatMap(e => e.violations))])
const files = computed(() => props.node ? filesOf(props.index, props.node.id) : [])
const hint = computed(() => props.node && depthHint(props.node))
const hasChildren = computed(() => props.node && (props.index.children.get(props.node.id)?.length ?? 0) > 0)

const FILE_LIMIT = 200
</script>

<template>
  <aside class="flex h-full w-96 shrink-0 flex-col border-l border-default bg-default">
    <div class="flex items-start gap-2 border-b border-default p-4">
      <div class="min-w-0 flex-1">
        <template v-if="node">
          <div class="flex items-center gap-2">
            <UIcon
              :name="nodeIcon(node)"
              class="size-5 shrink-0 text-muted"
            />
            <h2 class="truncate text-lg font-semibold text-highlighted">
              {{ node.label }}
            </h2>
          </div>
          <p
            class="mt-1 font-mono text-sm text-muted"
            :title="node.path"
          >
            <PathText :path="node.path" />
          </p>
        </template>
        <template v-else-if="edge">
          <h2 class="font-semibold text-highlighted">
            {{ label(edge.source) }} → {{ label(edge.target) }}
          </h2>
          <p class="mt-1 text-sm text-muted">
            {{ edgeSummary(edge) }}
          </p>
        </template>
      </div>
      <UButton
        icon="i-lucide-x"
        color="neutral"
        variant="ghost"
        size="sm"
        aria-label="Close panel"
        @click="emit('close')"
      />
    </div>

    <div class="flex-1 space-y-5 overflow-y-auto p-4 text-base">
      <template v-if="node">
        <div class="flex flex-wrap gap-2">
          <UButton
            v-if="hasChildren"
            label="Open"
            icon="i-lucide-zoom-in"
            size="sm"
            @click="emit('drill', node.id)"
          />
          <template v-if="node.kind === 'file'">
            <UButton
              label="View code"
              icon="i-lucide-code"
              size="sm"
              @click="showCode({ path: node.path, lines: [] })"
            />
            <UButton
              label="Open in editor"
              icon="i-lucide-square-pen"
              color="neutral"
              variant="outline"
              size="sm"
              @click="open(node.path)"
            />
          </template>
        </div>

        <dl
          v-if="node.kind === 'package'"
          class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5"
        >
          <dt class="text-muted">
            Package
          </dt>
          <dd class="truncate font-mono text-sm leading-5">
            {{ node.packageName }}
          </dd>
          <dt class="text-muted">
            Kind
          </dt>
          <dd>{{ node.packageKind }}</dd>
          <dt class="text-muted">
            Tier
          </dt>
          <dd>
            <UBadge
              :label="node.tier"
              :color="tierColor(node.tier)"
              variant="subtle"
              size="sm"
            />
            <span class="ml-2 text-sm text-muted">{{ node.tierReason }}</span>
          </dd>
          <template v-if="node.externalModules?.length">
            <dt class="text-muted">
              Modules
            </dt>
            <dd class="font-mono text-sm leading-5">
              {{ node.externalModules.join(', ') }}
            </dd>
          </template>
        </dl>

        <div class="grid grid-cols-3 gap-2">
          <div
            v-for="metric in [
              { label: 'Files', value: node.files },
              { label: 'LOC', value: node.loc },
              { label: 'Used from outside', value: node.kind === 'file' ? '–' : node.surface },
              { label: 'Fan-in', value: node.fanIn },
              { label: 'Fan-out', value: node.fanOut }
            ]"
            :key="metric.label"
            class="rounded-md bg-elevated px-2 py-1.5"
          >
            <div class="text-sm text-muted">
              {{ metric.label }}
            </div>
            <div class="font-semibold text-highlighted">
              {{ metric.value }}
            </div>
          </div>
        </div>

        <UAlert
          v-if="hint"
          :icon="hint.deep ? 'i-lucide-gem' : 'i-lucide-layers-2'"
          :color="hint.deep ? 'success' : 'neutral'"
          variant="subtle"
          :description="hint.text"
        />
        <UAlert
          v-if="node.inCycle"
          icon="i-lucide-refresh-cw"
          color="error"
          variant="subtle"
          :description="node.kind === 'file' ? 'This file is part of a dependency cycle.' : 'Contains files in a dependency cycle.'"
        />
        <UAlert
          v-for="violation in violations"
          :key="violation"
          icon="i-lucide-triangle-alert"
          color="error"
          variant="subtle"
          :title="violation"
          description="See the red edges."
        />

        <section
          v-for="list in [
            { title: 'Depends on', edges: outgoing, other: (e: ViewEdge) => e.target },
            { title: 'Used by', edges: incoming, other: (e: ViewEdge) => e.source }
          ]"
          :key="list.title"
        >
          <h3 class="mb-1.5 text-sm font-semibold tracking-wide text-muted uppercase">
            {{ list.title }} ({{ list.edges.length }})
          </h3>
          <ul class="space-y-0.5">
            <li
              v-for="e in list.edges"
              :key="e.id"
            >
              <button
                class="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left hover:bg-elevated"
                :title="`${pathOf(list.other(e))}\n${edgeSummary(e)}`"
                @click="emit('focus', list.other(e))"
              >
                <span
                  class="truncate"
                  :class="e.violations.length || e.inCycle ? 'text-error' : ''"
                >{{ label(list.other(e)) }}</span>
                <span class="ml-auto shrink-0 text-sm text-muted">{{ e.count }}</span>
              </button>
            </li>
          </ul>
        </section>

        <section v-if="node.kind !== 'file'">
          <h3 class="mb-1.5 text-sm font-semibold tracking-wide text-muted uppercase">
            Files ({{ files.length }})
          </h3>
          <ul class="space-y-0.5">
            <li
              v-for="file in files.slice(0, FILE_LIMIT)"
              :key="file.id"
              class="flex items-center gap-1"
            >
              <button
                class="min-w-0 flex-1 truncate rounded px-1.5 py-1 text-left hover:bg-elevated"
                :title="file.path"
                @click="emit('focus', file.id)"
              >
                {{ file.label }}
              </button>
            </li>
          </ul>
          <p
            v-if="files.length > FILE_LIMIT"
            class="mt-1 text-sm text-muted"
          >
            and {{ files.length - FILE_LIMIT }} more
          </p>
        </section>
      </template>

      <template v-else-if="edge">
        <UAlert
          v-for="violation in edge.violations"
          :key="violation"
          icon="i-lucide-triangle-alert"
          color="error"
          variant="subtle"
          :title="violation"
        />
        <section>
          <h3 class="mb-1.5 text-sm font-semibold tracking-wide text-muted uppercase">
            Dependencies ({{ edge.edges.length }})
          </h3>
          <ul class="space-y-2">
            <li
              v-for="(e, i) in edge.edges"
              :key="i"
              class="rounded-md bg-elevated px-2 py-1.5"
            >
              <div class="flex items-center gap-1.5">
                <UTooltip
                  v-if="e.auto?.length"
                  :text="e.auto.length === e.names?.length ? 'Nuxt auto-import: used without an import statement' : 'Partly auto-imported: highlighted names have no import statement'"
                >
                  <UBadge
                    label="auto-import"
                    variant="subtle"
                    color="primary"
                    size="sm"
                  />
                </UTooltip>
                <UBadge
                  v-if="!e.auto?.length || e.auto.length < (e.names?.length ?? 0)"
                  :label="e.kind"
                  variant="outline"
                  color="neutral"
                  size="sm"
                />
                <span
                  v-if="e.violation"
                  class="text-sm text-error"
                >{{ e.violation }}</span>
              </div>
              <div class="mt-1">
                <button
                  class="text-left hover:underline"
                  :title="pathOf(e.from)"
                  @click="emit('focus', e.from)"
                >
                  <PathText :path="endLabels(e)[0]" />
                </button>
              </div>
              <div class="flex gap-1">
                <span class="text-muted">→</span>
                <button
                  class="min-w-0 text-left hover:underline"
                  :title="pathOf(e.to)"
                  @click="emit('focus', e.to)"
                >
                  <PathText :path="endLabels(e)[1]" />
                </button>
              </div>
              <div
                v-if="e.names?.length"
                class="mt-0.5 font-mono text-sm wrap-break-word text-muted"
              >
                <span
                  v-for="name in e.names"
                  :key="name"
                  class="after:content-[',_'] last:after:content-none"
                  :class="{ 'text-primary': e.auto?.includes(name) }"
                  :title="e.auto?.includes(name) ? 'auto-imported, no import statement' : undefined"
                >{{ name }}</span>
              </div>
              <UButton
                v-if="e.lines?.length"
                :label="linesLabel(e.lines)"
                icon="i-lucide-code"
                size="xs"
                class="mt-1.5"
                :title="`Show in ${pathOf(e.from)}`"
                @click="showCode({ path: pathOf(e.from), lines: e.lines, names: e.names })"
              />
            </li>
          </ul>
        </section>
      </template>
    </div>
  </aside>
</template>
