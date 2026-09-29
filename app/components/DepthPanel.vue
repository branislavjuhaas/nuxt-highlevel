<script setup lang="ts">
import type { GraphIndex } from '~/utils/graph-view'

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
      <div class="min-w-0 flex-1">
        <h2 class="text-lg font-semibold text-highlighted">
          Module depth
        </h2>
        <p class="mt-1 text-sm text-muted">
          Small interface over a lot of code is deep, the reverse is shallow.
        </p>
      </div>
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
            v-for="{ node, text } in section.entries"
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
              <span class="block text-sm text-muted">{{ text }}</span>
            </button>
          </li>
        </ul>
      </section>
    </div>
  </aside>
</template>
