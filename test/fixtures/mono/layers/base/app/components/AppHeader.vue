<script setup lang="ts">
const theme = useTheme();
</script>

<template>
  <header :class="theme">
    <!-- deliberate rule violation: base layer uses a feature layer component -->
    <CartBadge />
  </header>
</template>
