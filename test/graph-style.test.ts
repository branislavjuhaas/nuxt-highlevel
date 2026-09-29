import { describe, expect, it } from "vite-plus/test";
import type { GraphNode } from "../shared/types/graph";
import { depthGroups, depthHint, edgeEndLabels } from "../app/utils/graph-style";

describe("edgeEndLabels", () => {
  it("keeps labels that differ", () => {
    expect(
      edgeEndLabels({ label: "a.ts", path: "src/a.ts" }, { label: "b.ts", path: "src/b.ts" }),
    ).toEqual(["a.ts", "b.ts"]);
  });

  it("shows short paths whole when labels clash", () => {
    expect(
      edgeEndLabels(
        { label: "graph.ts", path: "app/utils/graph.ts" },
        { label: "graph.ts", path: "server/utils/analyzer/graph.ts" },
      ),
    ).toEqual(["app/utils/graph.ts", "server/utils/analyzer/graph.ts"]);
  });

  it("drops the shared leading folders of long paths", () => {
    expect(
      edgeEndLabels(
        { label: "graph.ts", path: "packages/core/src/runtime/server/utils/graph.ts" },
        { label: "graph.ts", path: "packages/core/src/runtime/shared/graph.ts" },
      ),
    ).toEqual(["…/server/utils/graph.ts", "…/shared/graph.ts"]);
  });
});

describe("depthHint", () => {
  const node = (fields: Partial<GraphNode>): GraphNode => ({
    id: "x",
    kind: "package",
    label: "x",
    parent: null,
    path: "x",
    packageKind: "layer",
    files: 5,
    loc: 100,
    surface: 1,
    exports: 1,
    fanIn: 1,
    fanOut: 0,
    inCycle: false,
    ...fields,
  });

  it("shows for every layer, module and lib, however small", () => {
    expect(depthHint(node({ files: 1, loc: 300, exports: 2 }))).toEqual({
      tone: "deep",
      text: "Deep: 2 names used from outside, backed by 300 lines",
      summary: "2 names used from outside",
    });
    expect(depthHint(node({ packageKind: "module", loc: 30, exports: 3 }))).toEqual({
      tone: "shallow",
      text: "Shallow: 3 names used from outside, backed by only 30 lines",
      summary: "3 names used from outside",
    });
    expect(depthHint(node({ packageKind: "lib", loc: 80, exports: 2 }))?.tone).toBe("neutral");
  });

  it("explains packages nothing imports from", () => {
    expect(depthHint(node({ surface: 0, exports: 0 }))?.text).toMatch(
      /^No code imported from outside/,
    );
  });

  it("skips the app, files, and areas nothing imports from", () => {
    expect(depthHint(node({ packageKind: "app", exports: 0 }))).toBeUndefined();
    expect(depthHint(node({ kind: "file" }))).toBeUndefined();
    expect(depthHint(node({ kind: "area", files: 10, surface: 0, exports: 0 }))).toBeUndefined();
    expect(depthHint(node({ kind: "area", files: 10, surface: 2 }))).toMatchObject({
      tone: "deep",
      summary: "2 of 10 files used from outside",
    });
  });

  it("groups rated nodes by tone, biggest first", () => {
    const groups = depthGroups([
      node({ id: "small", loc: 300, exports: 1 }),
      node({ id: "big", loc: 900, exports: 2 }),
      node({ id: "thin", loc: 10, exports: 2 }),
      node({ id: "app", packageKind: "app" }),
    ]);
    expect(groups.deep.map((e) => e.node.id)).toEqual(["big", "small"]);
    expect(groups.shallow.map((e) => e.node.id)).toEqual(["thin"]);
    expect(groups.neutral).toEqual([]);
  });
});
