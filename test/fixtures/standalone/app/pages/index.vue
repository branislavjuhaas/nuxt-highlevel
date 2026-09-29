<script setup lang="ts">
const { graph, refresh } = useGraph()
const stats = useStats()
</script>

<template>
  <div>
    <UiButton @click="refresh">
      Refresh
    </UiButton>
    <GraphCanvas :graph="graph" />
    <NodePanel :count="stats.nodes" />
  </div>
</template>
