import { describe, expect, it } from "vite-plus/test";
import { analyzeRepo, areaOf } from "../server/utils/analyzer/graph";
import { fixtureRoot, legacyFixtureRoot, starterFixtureRoot } from "./fixture";

const WEB = "pkg:apps/web";

describe("areaOf", () => {
  it("strips the Nuxt srcDir and src/", () => {
    expect(areaOf("app/components/cart/Badge.vue", true)).toEqual({
      area: "components",
      rest: "cart/Badge.vue",
    });
    expect(areaOf("server/api/hello.ts", true)).toEqual({ area: "server", rest: "api/hello.ts" });
  });

  it("has no area for files directly in the package or its source dir", () => {
    expect(areaOf("app/app.vue", true)).toEqual({ rest: "app.vue" });
    expect(areaOf("src/format.ts", false)).toEqual({ rest: "format.ts" });
    expect(areaOf("module.ts", false)).toEqual({ rest: "module.ts" });
  });
});

describe("analyzeRepo", () => {
  const model = analyzeRepo(fixtureRoot);
  const has = (from: string, to: string, kind: string) =>
    model.edges.some((e) => e.from.endsWith(from) && e.to.endsWith(to) && e.kind === kind);

  it("builds the hierarchy with short labels", () => {
    const packages = model.nodes.filter((n) => n.kind === "package");
    expect(packages.map((n) => n.label).sort()).toEqual([
      "base",
      "nuxt-foo",
      "promo",
      "shop",
      "utils",
      "web",
    ]);
    const children = model.nodes
      .filter((n) => n.parent === WEB)
      .map((n) => n.label)
      .sort();
    expect(children).toEqual(["app.vue", "components", "composables", "pages", "server"]);
    expect(model.nodes.find((n) => n.id === `${WEB}/file:app.vue`)!.path).toBe(
      "apps/web/app/app.vue",
    );
    const file = model.nodes.find((n) => n.id === `${WEB}/area:components/file:TreeNode.vue`)!;
    expect(file.label).toBe("TreeNode.vue");
    expect(file.path).toBe("apps/web/app/components/TreeNode.vue");
    expect(model.warnings).toEqual([]);
  });

  it("finds explicit and auto-import edges", () => {
    expect(has("file:app.vue", "file:AppHeader.vue", "import")).toBe(true);
    expect(has("file:index.vue", "file:ProductList.vue", "import")).toBe(true);
    expect(
      has(
        "file:index.vue",
        "pkg:apps/web/layers/promo/area:components/file:PromoBanner.vue",
        "import",
      ),
    ).toBe(true);
    expect(has("file:index.vue", "file:useCart.ts", "import")).toBe(true);
    expect(has("file:index.vue", "area:runtime/file:composables/useFoo.ts", "import")).toBe(true);
    expect(has("file:index.vue", "file:index.ts", "import")).toBe(true);
    expect(has("pkg:packages/utils/file:index.ts", "file:format.ts", "import")).toBe(true);
    expect(has("file:api/hello.ts", "file:utils/greet.ts", "import")).toBe(true);
    // borrowed registry: layer files resolve through the app extending them
    expect(has("file:ProductList.vue", "file:useTheme.ts", "import")).toBe(true);
    // `useState` comes from Nuxt itself, not from the repo
    expect(
      model.edges.filter((e) => e.kind === "import" && e.from.endsWith("CartBadge.vue")),
    ).toEqual([]);
  });

  it("marks names used without an import statement as auto", () => {
    const edge = (from: string, to: string) =>
      model.edges.find((e) => e.from.endsWith(from) && e.to.endsWith(to))!;
    expect(edge("file:index.vue", "file:useCart.ts").auto).toEqual(["useCart"]);
    expect(edge("file:app.vue", "file:AppHeader.vue").auto).toEqual(["AppHeader"]);
    expect(edge("pkg:packages/utils/file:index.ts", "file:format.ts").auto).toBeUndefined();
  });

  it("keeps package-level edges", () => {
    expect(has(WEB, "pkg:layers/base", "extends")).toBe(true);
    expect(has(WEB, "pkg:packages/nuxt-foo", "module")).toBe(true);
    expect(has(WEB, "pkg:packages/utils", "dependency")).toBe(true);
  });

  it("detects the component cycle", () => {
    expect(model.cycles).toEqual([
      [`${WEB}/area:components/file:TreeBranch.vue`, `${WEB}/area:components/file:TreeNode.vue`],
    ]);
    expect(model.nodes.find((n) => n.id === WEB)!.inCycle).toBe(true);
    expect(model.nodes.find((n) => n.id === "pkg:packages/utils")!.inCycle).toBe(false);
  });

  it("flags the base → feature violation", () => {
    const violations = model.edges.filter((e) => e.violation);
    expect(violations).toEqual([
      expect.objectContaining({
        from: "pkg:layers/base/area:components/file:AppHeader.vue",
        to: "pkg:layers/shop/area:components/file:CartBadge.vue",
        kind: "import",
        lines: [8],
        violation: "base must not depend on feature",
      }),
    ]);
    expect(model.rulesSource).toBe("nuxt-highlevel.json");
    expect(model.nodes.find((n) => n.id === "pkg:packages/nuxt-foo")!.tier).toBe("base");
  });

  it("computes metrics", () => {
    const utils = model.nodes.find((n) => n.id === "pkg:packages/utils")!;
    expect(utils.files).toBe(3);
    // only src/index.ts is used from outside, for formatPrice and sum
    expect(utils.surface).toBe(1);
    expect(utils.exports).toBe(2);
    expect(utils.fanOut).toBe(0);
    expect(utils.fanIn).toBe(2);
  });
});

describe("analyzeRepo without .nuxt/", () => {
  it("warns that auto-imported dependencies are missing", () => {
    const model = analyzeRepo(`${fixtureRoot}/apps/web/layers/promo`);
    expect(model.warnings).toEqual([
      expect.stringContaining("no .nuxt/ found, auto-imported dependencies are missing"),
    ]);
  });
});

describe("analyzeRepo on a starter app (auto-imports only)", () => {
  const model = analyzeRepo(starterFixtureRoot);
  const edges = model.edges
    .map((e) => `${e.from.replace(/.*file:/, "")} → ${e.to.replace(/.*file:/, "")}`)
    .sort();

  it("resolves every dependency through the auto-import registry", () => {
    expect(model.warnings).toEqual([]);
    expect(edges).toEqual([
      "AppHeader.vue → useAppTitle.ts",
      "counter/Controls.vue → useCounter.ts",
      "counter/Display.vue → format.ts",
      "counter/Display.vue → useCounter.ts",
      "default.vue → AppHeader.vue",
      "index.vue → counter/Controls.vue",
      "index.vue → counter/Display.vue",
      "useAppTitle.ts → format.ts",
    ]);
    expect(model.edges.every((e) => e.auto?.length)).toBe(true);
  });

  it("maps prefixed component names to nested files", () => {
    const edge = model.edges.find((e) => e.to.endsWith("file:counter/Display.vue"))!;
    expect(edge.auto).toEqual(["CounterDisplay"]);
  });
});

describe("analyzeRepo on a Nuxt 3 layout (no app/ dir)", () => {
  const model = analyzeRepo(legacyFixtureRoot);

  it("uses the package root as srcDir", () => {
    const areas = model.nodes
      .filter((n) => n.kind === "area")
      .map((n) => n.label)
      .sort();
    expect(areas).toEqual(["components", "composables", "pages", "server", "utils"]);
    expect(model.nodes.find((n) => n.id === "pkg:./area:components/file:TodoList.vue")!.path).toBe(
      "components/TodoList.vue",
    );
    expect(model.warnings).toEqual([]);
  });

  it("resolves auto-imports from root-level dirs", () => {
    const has = (from: string, to: string) =>
      model.edges.some((e) => e.from.endsWith(from) && e.to.endsWith(to));
    expect(has("file:index.vue", "file:TodoList.vue")).toBe(true);
    expect(has("file:index.vue", "file:useTodos.ts")).toBe(true);
    expect(has("file:TodoList.vue", "file:checkbox.ts")).toBe(true);
    expect(has("file:api/todos.get.ts", "file:utils/todos.ts")).toBe(true);
  });
});
