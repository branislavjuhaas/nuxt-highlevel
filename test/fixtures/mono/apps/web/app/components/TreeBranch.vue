<script setup lang="ts">
defineProps<{ depth: number }>()
</script>

<template>
  <TreeNode :depth="depth" />
</template>
