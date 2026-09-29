<script setup lang="ts">
const config = useRuntimeConfig()

useHead({
  title: config.public.repoName ? `${config.public.repoName} · nuxt-highlevel` : 'nuxt-highlevel',
  link: [{ rel: 'icon', href: '/favicon.ico' }],
  htmlAttrs: { lang: 'en' }
})
</script>

<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>
