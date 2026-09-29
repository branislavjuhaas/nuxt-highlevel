<script setup lang="ts">
defineProps<{ depth: number }>();
</script>

<template>
  <div>
    <tree-branch v-if="depth < 2" :depth="depth + 1" />
  </div>
</template>
