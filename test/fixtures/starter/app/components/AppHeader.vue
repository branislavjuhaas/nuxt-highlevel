<script setup lang="ts">
const title = useAppTitle()
</script>

<template>
  <header>
    <NuxtLink to="/">
      {{ title }}
    </NuxtLink>
    <NuxtLink to="/about">
      About
    </NuxtLink>
  </header>
</template>
