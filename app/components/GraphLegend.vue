<script setup lang="ts">
const items = [
  { label: 'import', stroke: EDGE_COLORS.import },
  { label: 'auto-import', stroke: EDGE_COLORS.auto, dash: '6 4' },
  { label: 'package dependency', stroke: EDGE_COLORS.dependency, dash: '2 4' },
  { label: 'extends (layer)', stroke: EDGE_COLORS.extends },
  { label: 'Nuxt module', stroke: EDGE_COLORS.module },
  { label: 'rule violation or cycle back-edge', stroke: EDGE_COLORS.problem }
]
</script>

<template>
  <ul class="w-fit space-y-1 rounded-md border border-default bg-default/90 px-3 py-2 text-xs text-muted backdrop-blur">
    <li
      v-for="item in items"
      :key="item.label"
      class="flex items-center gap-2"
    >
      <svg
        width="28"
        height="6"
        aria-hidden="true"
      >
        <line
          x1="0"
          y1="3"
          x2="28"
          y2="3"
          :stroke="item.stroke"
          stroke-width="2"
          :stroke-dasharray="item.dash"
        />
      </svg>
      {{ item.label }}
    </li>
  </ul>
</template>
