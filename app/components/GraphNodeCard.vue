<script setup lang="ts">
import { Handle, Position } from "@vue-flow/core";
import type { LayoutDirection } from "~/composables/useElkLayout";
import type { ViewNode } from "~/utils/graph-view";

const props = defineProps<{
  data: ViewNode & { direction: LayoutDirection; selected: boolean };
}>();

const node = computed(() => props.data.node);
const vertical = computed(() => props.data.direction === "DOWN");
</script>

<template>
  <div
    class="flex h-16 w-full items-center gap-2.5 rounded-lg border bg-default px-3 shadow-sm transition-colors"
    :class="[
      data.ghost ? 'border-dashed border-muted opacity-60' : 'border-default',
      data.selected ? 'ring-2 ring-primary' : 'hover:border-accented',
      node.inCycle && !data.ghost ? 'border-error/60' : '',
    ]"
    :title="node.path"
  >
    <Handle
      type="target"
      :position="vertical ? Position.Top : Position.Left"
      :connectable="false"
    />
    <UIcon :name="nodeIcon(node)" class="size-5 shrink-0 text-muted" />
    <div class="min-w-0 flex-1">
      <div class="truncate text-sm font-medium text-highlighted">
        {{ node.label }}
      </div>
      <div class="truncate text-xs text-muted">
        {{
          data.ghost ? `outside${data.context ? ` · in ${data.context}` : ""}` : nodeSubtitle(node)
        }}
      </div>
    </div>
    <div class="flex shrink-0 flex-col items-end gap-1">
      <UBadge
        v-if="node.tier"
        :label="node.tier"
        :color="tierColor(node.tier)"
        variant="subtle"
        size="sm"
      />
      <UIcon
        v-if="node.inCycle && !data.ghost"
        name="i-lucide-refresh-cw"
        class="size-3.5 text-error"
      />
    </div>
    <Handle
      type="source"
      :position="vertical ? Position.Bottom : Position.Right"
      :connectable="false"
    />
  </div>
</template>
