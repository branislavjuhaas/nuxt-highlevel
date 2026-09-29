<script setup lang="ts">
const props = defineProps<{ path: string }>()

// Break opportunities after each `/`, so long paths wrap between folders instead of mid-name.
const segments = computed(() => props.path.split(/(?<=\/)/))
</script>

<template>
  <span class="wrap-anywhere"><template
    v-for="(segment, i) in segments"
    :key="i"
  >{{ segment }}<wbr></template></span>
</template>
