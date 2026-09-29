<script setup lang="ts">
defineProps<{ count: number }>();
const track = useTrack();
</script>

<template>
  <aside @click="track('panel')">
    {{ formatCount(count) }}
  </aside>
</template>
