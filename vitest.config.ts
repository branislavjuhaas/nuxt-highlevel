import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";

export default defineConfig({
  resolve: {
    alias: { "#shared": fileURLToPath(new URL("./shared", import.meta.url)) },
  },
  test: {
    include: ["test/**/*.test.ts"],
    globalSetup: ["test/prepare-fixture.ts"],
    testTimeout: 30_000,
  },
});
