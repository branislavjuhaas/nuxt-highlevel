export default defineNuxtConfig({
  extends: ["../../layers/base", "../../layers/shop"],
  modules: ["../../packages/nuxt-foo/src/module"],
  compatibilityDate: "2026-06-30",
});
