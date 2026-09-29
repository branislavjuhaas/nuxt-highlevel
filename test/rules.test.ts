import { describe, expect, it } from "vite-plus/test";
import {
  assignTier,
  DEFAULT_RULES,
  findViolation,
  loadTierConfig,
} from "../server/utils/analyzer/rules";
import { fixtureRoot } from "./fixture";

describe("assignTier", () => {
  it("uses defaults without a config", () => {
    expect(assignTier({ name: "@mono/web", relDir: "apps/web", kind: "app" }).tier).toBe("app");
    expect(assignTier({ name: "@mono/base", relDir: "layers/base", kind: "layer" })).toEqual({
      tier: "base",
      reason: 'default: name or path contains "base"',
    });
    expect(
      assignTier({ name: "date-utils", relDir: "packages/date-utils", kind: "lib" }).tier,
    ).toBe("base");
    expect(assignTier({ name: "nuxt-foo", relDir: "packages/nuxt-foo", kind: "module" }).tier).toBe(
      "feature",
    );
  });

  it("lets the config override tiers, first match wins", () => {
    const { config } = loadTierConfig(fixtureRoot);
    // `layers/base` matches both `base` and `feature` (`layers/*`) globs.
    expect(
      assignTier({ name: "@mono/base", relDir: "layers/base", kind: "layer" }, config),
    ).toEqual({ tier: "base", reason: 'nuxt-highlevel.json: "layers/base"' });
    expect(
      assignTier({ name: "@mono/shop", relDir: "layers/shop", kind: "layer" }, config).tier,
    ).toBe("feature");
    // matched by package name, retiered from the default `feature`
    expect(
      assignTier({ name: "nuxt-foo", relDir: "packages/nuxt-foo", kind: "module" }, config),
    ).toEqual({ tier: "base", reason: 'nuxt-highlevel.json: "nuxt-foo"' });
  });

  it("falls back to defaults for packages no glob matches", () => {
    expect(
      assignTier({ name: "x", relDir: "tools/x", kind: "lib" }, { tiers: { base: ["packages/*"] } })
        .tier,
    ).toBe("feature");
  });
});

describe("findViolation", () => {
  it("flags disallowed tier pairs only", () => {
    expect(findViolation("base", "feature", DEFAULT_RULES)).toBe("base must not depend on feature");
    expect(findViolation("feature", "app", DEFAULT_RULES)).toBe("feature must not depend on app");
    expect(findViolation("feature", "base", DEFAULT_RULES)).toBeUndefined();
    expect(findViolation("app", "feature", DEFAULT_RULES)).toBeUndefined();
  });
});
