import { addImports, createResolver, defineNuxtModule } from "@nuxt/kit";

export default defineNuxtModule({
  meta: { name: "stats" },
  setup() {
    const { resolve } = createResolver(import.meta.url);
    addImports({ name: "useStats", from: resolve("./runtime/useStats") });
  },
});
