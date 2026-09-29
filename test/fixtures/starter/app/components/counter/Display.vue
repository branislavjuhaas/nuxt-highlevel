<script setup lang="ts">
const { count } = useCounter();
</script>

<template>
  <output>{{ formatCount(count) }}</output>
</template>
