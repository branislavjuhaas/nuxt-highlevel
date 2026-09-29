import { addImports, createResolver, defineNuxtModule } from "@nuxt/kit";

export default defineNuxtModule({
  meta: { name: "nuxt-foo" },
  setup() {
    const { resolve } = createResolver(import.meta.url);
    addImports({ name: "useFoo", from: resolve("./runtime/composables/useFoo") });
  },
});
