import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { prepareApps } from "../server/utils/analyzer/prepare";
import { standaloneFixtureRoot } from "./fixture";

describe("prepareApps", () => {
  it("regenerates the registry with the app's own nuxi", async () => {
    const imports = join(standaloneFixtureRoot, ".nuxt/types/imports.d.ts");
    rmSync(imports);
    expect(await prepareApps(standaloneFixtureRoot)).toEqual([]);
    expect(existsSync(imports)).toBe(true);
  }, 120_000);
});
