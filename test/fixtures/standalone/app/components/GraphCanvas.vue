<script setup lang="ts">
import type { Graph } from '#shared/types/graph'

const props = defineProps<{ graph?: Graph }>()
const label = computed(() => formatCount(props.graph?.nodes.length ?? 0))
</script>

<template>
  <section>{{ label }}</section>
</template>
