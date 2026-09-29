import { describe, expect, it } from "vite-plus/test";
import type { GraphModel, GraphNode } from "../shared/types/graph";
import { buildView, filesOf, indexGraph, topLevel } from "../app/utils/graph-view";
import { analyzeRepo } from "../server/utils/analyzer/graph";
import { fixtureRoot } from "./fixture";

const index = indexGraph(analyzeRepo(fixtureRoot));
const WEB = "pkg:apps/web";

describe("buildView", () => {
  it("aggregates file edges to package edges at the top level", () => {
    const view = buildView(index, "repo");
    expect(view.nodes.map((n) => n.node.label).sort((a, b) => a.localeCompare(b))).toEqual([
      "base",
      "nuxt-foo",
      "promo",
      "shop",
      "utils",
      "web",
    ]);
    expect(view.nodes.every((n) => !n.ghost)).toBe(true);

    const webToBase = view.edges.find((e) => e.id === `${WEB}->pkg:layers/base`)!;
    expect(webToBase.kinds).toEqual({ import: 1, dependency: 1, extends: 1 });

    const baseToShop = view.edges.find((e) => e.id === "pkg:layers/base->pkg:layers/shop")!;
    expect(baseToShop.violations).toEqual(["base must not depend on feature"]);
    // shop uses base's useTheme, base uses shop's CartBadge
    expect(baseToShop.inCycle).toBe(true);
  });

  it("shows areas inside a package with ghosts for the outside", () => {
    const view = buildView(index, WEB);
    const inside = view.nodes
      .filter((n) => !n.ghost)
      .map((n) => n.node.label)
      .sort((a, b) => a.localeCompare(b));
    expect(inside).toEqual(["app.vue", "components", "composables", "pages", "server"]);
    const ghosts = view.nodes
      .filter((n) => n.ghost)
      .map((n) => n.node.id)
      .sort((a, b) => a.localeCompare(b));
    expect(ghosts).toEqual([
      "pkg:apps/web/layers/promo",
      "pkg:layers/base",
      "pkg:layers/shop",
      "pkg:packages/nuxt-foo",
      "pkg:packages/utils",
    ]);
    // package-level declared edges start at the package itself and don't show here
    expect(view.edges.every((e) => !e.kinds.extends)).toBe(true);
  });

  it("shows the component cycle at file level", () => {
    const view = buildView(index, `${WEB}/area:components`);
    const cycle = view.edges
      .filter((e) => e.inCycle)
      .map((e) => e.id)
      .sort((a, b) => a.localeCompare(b));
    expect(cycle).toEqual([
      `${WEB}/area:components/file:TreeBranch.vue->${WEB}/area:components/file:TreeNode.vue`,
      `${WEB}/area:components/file:TreeNode.vue->${WEB}/area:components/file:TreeBranch.vue`,
    ]);
    // pages/index.vue uses TreeNode: a ghost area from the same package
    const ghost = view.nodes.find((n) => n.ghost)!;
    expect(ghost.node.id).toBe(`${WEB}/area:pages`);
    expect(ghost.group).toEqual({ id: WEB, label: "Other areas in web" });
  });
});

describe("filesOf", () => {
  it("lists files below a node", () => {
    expect(filesOf(index, "pkg:packages/utils").map((f) => f.label)).toEqual([
      "format.ts",
      "index.ts",
      "math.ts",
    ]);
  });
});

describe("topLevel", () => {
  const node = (id: string, kind: GraphNode["kind"], parent: string | null): GraphNode => ({
    id,
    kind,
    label: id,
    parent,
    path: ".",
    files: 0,
    loc: 0,
    surface: 0,
    exports: 0,
    fanIn: 0,
    fanOut: 0,
    inCycle: false,
  });
  const single = indexGraph({
    nodes: [node("repo", "repo", null), node("pkg:.", "package", "repo")],
    edges: [],
  } as unknown as GraphModel);

  it("starts at the repo when it has several packages", () => {
    expect(topLevel(index)).toBe("repo");
  });

  it("starts at the package when it is the only one", () => {
    expect(topLevel(single)).toBe("pkg:.");
  });
});
