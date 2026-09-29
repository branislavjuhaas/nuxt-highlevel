<script setup lang="ts">
import type { GraphIndex } from '~/utils/graph-view'
import { DEEP_LOC_PER_EXPORT, DEEP_SURFACE_RATIO, SHALLOW_LOC_PER_EXPORT, SHALLOW_SURFACE_RATIO } from '~/utils/graph-style'

const props = defineProps<{
  index: GraphIndex
  selectedId?: string
}>()

const emit = defineEmits<{
  focus: [id: string]
  close: []
}>()

const groups = computed(() => depthGroups(props.index.nodes.values()))
const sections = computed(() => [
  { title: 'Deep', icon: 'i-lucide-gem', iconClass: 'text-success', entries: groups.value.deep },
  { title: 'Shallow', icon: 'i-lucide-layers-2', iconClass: 'text-muted', entries: groups.value.shallow },
  { title: 'In between', icon: 'i-lucide-box', iconClass: 'text-muted', entries: groups.value.neutral }
].filter(section => section.entries.length))
</script>

<template>
  <aside class="flex h-full w-80 shrink-0 flex-col border-l border-default bg-default">
    <div class="flex items-start gap-2 border-b border-default p-4">
      <h2 class="min-w-0 flex-1 text-lg font-semibold text-highlighted">
        Module depth
      </h2>
      <UButton
        icon="i-lucide-x"
        color="neutral"
        variant="ghost"
        size="sm"
        aria-label="Close depth panel"
        @click="emit('close')"
      />
    </div>

    <div class="flex-1 space-y-5 overflow-y-auto p-4">
      <details class="group text-sm text-muted">
        <summary class="flex cursor-pointer list-none items-center gap-1.5 font-medium text-default [&::-webkit-details-marker]:hidden">
          <UIcon
            name="i-lucide-chevron-right"
            class="size-4 transition-transform group-open:rotate-90"
          />
          What is module depth?
        </summary>
        <dl class="mt-2 space-y-2 pl-5.5">
          <div>
            <dt class="font-medium text-highlighted">
              Interface
            </dt>
            <dd>The names other code imports from a module. The code behind them, callers never have to read.</dd>
          </div>
          <div>
            <dt class="font-medium text-highlighted">
              Deep
            </dt>
            <dd>
              A lot of code behind a few names. Callers learn little and get a lot, and the inside can change
              without breaking them.
            </dd>
          </div>
          <div>
            <dt class="font-medium text-highlighted">
              Shallow
            </dt>
            <dd>
              Nearly as big outside as inside, an extra layer that saves callers almost no work. Merge it into the
              code that uses it, or give it more to do.
            </dd>
          </div>
          <div>
            <dt class="font-medium text-highlighted">
              How it's rated
            </dt>
            <dd>
              <ul class="list-disc pl-4">
                <li>
                  Packages: lines of code per name used from outside, deep from {{ DEEP_LOC_PER_EXPORT }}, shallow
                  under {{ SHALLOW_LOC_PER_EXPORT }}
                </li>
                <li>
                  Areas: share of files used from outside, deep up to {{ DEEP_SURFACE_RATIO * 100 }}%, shallow from
                  {{ SHALLOW_SURFACE_RATIO * 100 }}%
                </li>
              </ul>
            </dd>
          </div>
        </dl>
      </details>
      <p
        v-if="!sections.length"
        class="text-sm text-muted"
      >
        No layers, modules, libs or big enough areas to rate.
      </p>
      <section
        v-for="section in sections"
        :key="section.title"
      >
        <h3 class="mb-2 flex items-center gap-1.5 text-sm font-semibold text-highlighted">
          <UIcon
            :name="section.icon"
            class="size-4"
            :class="section.iconClass"
          />
          {{ section.title }}
          <span class="font-normal text-muted">{{ section.entries.length }}</span>
        </h3>
        <ul class="space-y-1">
          <li
            v-for="{ node, summary } in section.entries"
            :key="node.id"
          >
            <button
              type="button"
              class="w-full rounded-md px-2 py-1.5 text-left hover:bg-elevated"
              :class="{ 'bg-elevated': node.id === selectedId }"
              @click="emit('focus', node.id)"
            >
              <span class="flex items-center gap-1.5">
                <UIcon
                  :name="nodeIcon(node)"
                  class="size-4 shrink-0 text-muted"
                />
                <span class="truncate font-medium text-highlighted">{{ node.label }}</span>
                <span class="ml-auto shrink-0 text-xs text-dimmed">{{ node.loc }} LOC</span>
              </span>
              <span
                class="block truncate font-mono text-xs text-muted"
                :title="node.path"
              >
                <PathText :path="node.path" />
              </span>
              <span class="block text-sm text-muted">{{ summary }}</span>
            </button>
          </li>
        </ul>
      </section>
    </div>
  </aside>
</template>
