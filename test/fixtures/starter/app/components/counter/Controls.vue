<script setup lang="ts">
const { increment, reset } = useCounter();
</script>

<template>
  <div>
    <button @click="increment">+1</button>
    <button @click="reset">Reset</button>
  </div>
</template>
