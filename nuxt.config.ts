// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ["@nuxt/eslint", "@nuxt/ui", "@vueuse/nuxt"],

  // The graph is client-only (Vue Flow + elkjs), there is nothing to render on the server.
  ssr: false,

  devtools: {
    enabled: true,
  },

  css: [
    "~/assets/css/main.css",
    "@vue-flow/core/dist/style.css",
    "@vue-flow/core/dist/theme-default.css",
    "@vue-flow/controls/dist/style.css",
    "@vue-flow/minimap/dist/style.css",
  ],

  runtimeConfig: {
    // Repo to analyze, set by the CLI via NUXT_TARGET_ROOT. Empty means cwd.
    targetRoot: "",
    editor: "",
    nuxtPrepare: "",
    public: {
      repoName: "",
    },
  },

  compatibilityDate: "2026-06-30",

  typescript: {
    strict: true,
  },

  eslint: {
    config: {
      // Formatting is vp fmt's job.
      stylistic: false,
    },
  },
});
