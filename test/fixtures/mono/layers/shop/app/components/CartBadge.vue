<script setup lang="ts">
const count = useState("cart-count", () => 0);
</script>

<template>
  <span>{{ count }}</span>
</template>
