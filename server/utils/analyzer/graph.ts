import { readFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "pathe";
import { globSync } from "tinyglobby";
import type { EdgeKind, GraphEdge, GraphModel, GraphNode } from "../../../shared/types/graph";
import { findCycles } from "../../../shared/utils/cycles";
import { type FileScan, scanFile } from "./files";
import { type NuxtRegistry, readNuxtRegistry, resolveAlias } from "./nuxt-registry";
import { resolveFile } from "./resolve";
import { assignTier, DEFAULT_RULES, findViolation, loadTierConfig } from "./rules";
import { discoverWorkspace, type WorkspacePackage } from "./workspace";

const SOURCE_GLOB = "**/*.{vue,ts,tsx,js,jsx,mjs,mts,cjs}";
const IGNORE = [
  "**/node_modules/**",
  "**/.*/**",
  "**/dist/**",
  "**/coverage/**",
  "**/public/**",
  "**/test/**",
  "**/tests/**",
  "**/__tests__/**",
  "**/playground/**",
  "**/*.d.ts",
  "**/*.test.*",
  "**/*.spec.*",
  "**/*.config.*",
];

interface SourceFile {
  id: string;
  abs: string;
  pkg: WorkspacePackage;
  isServer: boolean;
  scan: FileScan;
}

/** Splits a package-relative path into an area and the path inside it. Top-level files have no area. */
export function areaOf(relInPkg: string, isNuxt: boolean): { area?: string; rest: string } {
  let path = relInPkg;
  for (const srcDir of isNuxt ? ["app/", "src/"] : ["src/"]) {
    if (path.startsWith(srcDir)) {
      path = path.slice(srcDir.length);
      break;
    }
  }
  const slash = path.indexOf("/");
  if (slash === -1) return { rest: path };
  return { area: path.slice(0, slash), rest: path.slice(slash + 1) };
}

function fileLabel(rest: string) {
  const name = basename(rest);
  // `index.vue` alone says nothing, keep its folder.
  if (/^index\./.test(name) && rest.includes("/")) return `${basename(dirname(rest))}/${name}`;
  return name;
}

function packageEntry(pkg: WorkspacePackage): string | undefined {
  const { exports, module, main } = pkg.pkg;
  let entry: unknown = exports;
  if (entry && typeof entry === "object") entry = (entry as Record<string, unknown>)["."] ?? entry;
  if (entry && typeof entry === "object") {
    const conditions = entry as Record<string, unknown>;
    entry = conditions.import ?? conditions.default ?? conditions.types;
  }
  const candidates = [
    typeof entry === "string" ? entry : undefined,
    module,
    main,
    "src/index",
    "index",
  ].filter(Boolean) as string[];
  for (const candidate of candidates) {
    const file = resolveFile(join(pkg.dir, candidate));
    if (file) return file;
  }
}

export function analyzeRepo(rootInput: string, repoName?: string): GraphModel {
  const workspace = discoverWorkspace(rootInput);
  const { root, packages } = workspace;
  const warnings = [...workspace.warnings];
  const tierConfig = loadTierConfig(root);
  warnings.push(...tierConfig.warnings);
  const rules = tierConfig.config?.rules ?? DEFAULT_RULES;
  const pkgById = new Map(packages.map((p) => [p.id, p]));
  const byName = new Map(packages.map((p) => [p.name, p]));

  // Layers and modules have no `.nuxt/` of their own, they borrow the registry of an app using them.
  const registries = new Map<string, NuxtRegistry>();
  for (const p of packages) {
    const registry = p.nuxtConfig && readNuxtRegistry(p.dir);
    if (registry) registries.set(p.id, registry);
  }
  for (const app of packages.filter((p) => p.kind === "app" && registries.has(p.id))) {
    const queue = [...app.extends, ...app.modules];
    for (let id = queue.shift(); id; id = queue.shift()) {
      if (registries.has(id)) continue;
      registries.set(id, registries.get(app.id)!);
      queue.push(...pkgById.get(id)!.extends, ...pkgById.get(id)!.modules);
    }
  }
  for (const p of packages) {
    if (p.nuxtConfig && !registries.has(p.id)) {
      warnings.push(
        `${p.relDir}: no .nuxt/ found, auto-imported dependencies are missing. Install its dependencies so \`nuxi prepare\` can run, then refresh.`,
      );
    }
  }

  const nodes = new Map<string, GraphNode>();
  const addNode = (
    node: Omit<GraphNode, "files" | "loc" | "surface" | "exports" | "fanIn" | "fanOut" | "inCycle">,
  ) => {
    const full: GraphNode = {
      ...node,
      files: 0,
      loc: 0,
      surface: 0,
      exports: 0,
      fanIn: 0,
      fanOut: 0,
      inCycle: false,
    };
    nodes.set(node.id, full);
    return full;
  };
  addNode({ id: "repo", kind: "repo", label: repoName || basename(root), parent: null, path: "." });

  const tiers = new Map<string, string>();
  for (const p of packages) {
    const { tier, reason } = assignTier(p, tierConfig.config);
    tiers.set(p.id, tier);
    addNode({
      id: p.id,
      kind: "package",
      label: p.label,
      parent: "repo",
      path: p.relDir,
      packageKind: p.kind,
      packageName: p.name,
      tier,
      tierReason: reason,
      externalModules: p.externalModules,
    });
  }

  // Files, attributed to the innermost package containing them.
  const owner = (path: string) =>
    packages
      .filter((p) => path.startsWith(p.dir === "/" ? "/" : `${p.dir}/`))
      .sort((a, b) => b.dir.length - a.dir.length)[0];
  const files: SourceFile[] = [];
  const fileByAbs = new Map<string, SourceFile>();
  for (const p of packages) {
    for (const abs of globSync(SOURCE_GLOB, {
      cwd: p.dir,
      ignore: IGNORE,
      absolute: true,
    }).sort()) {
      if (owner(abs) !== p) continue;
      const relInPkg = relative(p.dir, abs);
      const { area, rest } = areaOf(relInPkg, Boolean(p.nuxtConfig));
      const parent = area ? `${p.id}/area:${area}` : p.id;
      if (area && !nodes.has(parent)) {
        addNode({
          id: parent,
          kind: "area",
          label: area,
          parent: p.id,
          path:
            relative(root, join(p.dir, relInPkg.slice(0, relInPkg.length - rest.length))) || ".",
        });
      }
      let scan: FileScan;
      try {
        scan = scanFile(abs, readFileSync(abs, "utf8"));
      } catch (error) {
        warnings.push(`Could not parse ${relative(root, abs)}: ${(error as Error).message}`);
        continue;
      }
      const id = `${parent}/file:${rest}`;
      addNode({ id, kind: "file", label: fileLabel(rest), parent, path: relative(root, abs) });
      const file = { id, abs, pkg: p, isServer: relInPkg.startsWith("server/"), scan };
      files.push(file);
      fileByAbs.set(abs, file);
    }
  }

  // File edges
  const edgeMap = new Map<string, GraphEdge>();
  const addEdge = (
    from: string,
    to: string,
    kind: EdgeKind,
    names: string[],
    line: number,
    auto = false,
  ) => {
    if (from === to) return;
    const key = `${from}|${to}|${kind}`;
    const edge = edgeMap.get(key) ?? { from, to, kind, names: [], auto: [], lines: [] };
    for (const name of names) {
      if (!edge.names!.includes(name)) edge.names!.push(name);
      if (auto && !edge.auto!.includes(name)) edge.auto!.push(name);
    }
    if (!edge.lines!.includes(line)) edge.lines!.push(line);
    edgeMap.set(key, edge);
  };

  const resolveSpecifier = (
    file: SourceFile,
    specifier: string,
    registry?: NuxtRegistry,
  ): string | undefined => {
    if (specifier.startsWith(".")) return resolveFile(resolve(dirname(file.abs), specifier));
    const aliased = registry && resolveAlias(registry.aliases, specifier);
    if (aliased) return resolveFile(aliased);
    const parts = specifier.split("/");
    const nameLength = specifier.startsWith("@") ? 2 : 1;
    const target = byName.get(parts.slice(0, nameLength).join("/"));
    if (!target) return;
    const subpath = parts.slice(nameLength).join("/");
    if (!subpath) return packageEntry(target);
    return resolveFile(join(target.dir, subpath)) ?? resolveFile(join(target.dir, "src", subpath));
  };

  for (const file of files) {
    const registry = registries.get(file.pkg.id);
    const autoImports = file.isServer ? registry?.serverImports : registry?.imports;
    for (const { specifier, names, line } of file.scan.imports) {
      if (registry && (specifier === "#imports" || specifier === "#components")) {
        for (const name of names) {
          const target = fileByAbs.get(
            autoImports?.get(name) ?? registry.components.get(name) ?? "",
          );
          if (target) addEdge(file.id, target.id, "import", [name], line);
        }
        continue;
      }
      const target = fileByAbs.get(resolveSpecifier(file, specifier, registry) ?? "");
      if (target) addEdge(file.id, target.id, "import", names, line);
    }
    if (!registry) continue;
    for (const [name, line] of file.scan.identifiers) {
      const target = fileByAbs.get(autoImports?.get(name) ?? "");
      if (target) addEdge(file.id, target.id, "import", [name], line, true);
    }
    for (const [name, line] of file.scan.components) {
      const target = fileByAbs.get(registry.components.get(name) ?? "");
      if (target) addEdge(file.id, target.id, "import", [name], line, true);
    }
  }

  const fileToPkg = new Map(files.map((f) => [f.id, f.pkg.id]));
  const edges = [...edgeMap.values()];
  for (const edge of edges) {
    if (!edge.names!.length) delete edge.names;
    if (!edge.auto!.length) delete edge.auto;
    edge.lines!.sort((a, b) => a - b);
  }
  for (const p of packages) {
    for (const [kind, targets] of [
      ["dependency", p.dependencies],
      ["extends", p.extends],
      ["module", p.modules],
    ] as const) {
      for (const to of targets) edges.push({ from: p.id, to, kind });
    }
  }
  for (const edge of edges) {
    const fromPkg = fileToPkg.get(edge.from) ?? edge.from;
    const toPkg = fileToPkg.get(edge.to) ?? edge.to;
    if (fromPkg === toPkg) continue;
    const violation = findViolation(tiers.get(fromPkg)!, tiers.get(toPkg)!, rules);
    if (violation) edge.violation = violation;
  }

  // Metrics: sizes roll up, fan-in/out and surface are counted per level.
  const ancestors = (id: string) => {
    const chain: string[] = [];
    for (let node = nodes.get(id); node && node.kind !== "repo"; node = nodes.get(node.parent!))
      chain.push(node.id);
    return chain;
  };
  for (const file of files) {
    for (const id of ancestors(file.id)) {
      const node = nodes.get(id)!;
      node.files++;
      node.loc += file.scan.loc;
    }
  }
  const fanOut = new Map<string, Set<string>>();
  const fanIn = new Map<string, Set<string>>();
  const surface = new Map<string, Set<string>>();
  const exports = new Map<string, Set<string>>();
  const add = (map: Map<string, Set<string>>, key: string, value: string) => {
    if (!map.has(key)) map.set(key, new Set());
    map.get(key)!.add(value);
  };
  for (const edge of edges) {
    const from = ancestors(edge.from);
    const to = ancestors(edge.to);
    // Chains are [file, area, package], [file, package] or [package]; align them from the top.
    // Top-level files sit one level higher than files in areas, so files are counted file to file.
    from.reverse();
    to.reverse();
    if (nodes.get(edge.from)!.kind === "file" && nodes.get(edge.to)!.kind === "file") {
      add(fanOut, edge.from, edge.to);
      add(fanIn, edge.to, edge.from);
    }
    for (let level = 0; level < Math.min(from.length, to.length); level++) {
      if (from[level] === to[level]) continue;
      if (nodes.get(from[level]!)!.kind !== "file") add(fanOut, from[level]!, to[level]!);
      if (nodes.get(to[level]!)!.kind !== "file") add(fanIn, to[level]!, from[level]!);
      if (edge.kind === "import") {
        for (const container of to.slice(level, -1)) {
          add(surface, container, edge.to);
          for (const name of edge.names?.length ? edge.names : ["*"])
            add(exports, container, `${edge.to}#${name}`);
        }
      }
    }
  }
  for (const node of nodes.values()) {
    node.fanOut = fanOut.get(node.id)?.size ?? 0;
    node.fanIn = fanIn.get(node.id)?.size ?? 0;
    node.surface =
      node.kind === "file" ? Math.min(node.fanIn, 1) : (surface.get(node.id)?.size ?? 0);
    node.exports = exports.get(node.id)?.size ?? 0;
  }

  const fileEdges = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (edge.kind === "import") add(fileEdges, edge.from, edge.to);
  }
  const cycles = findCycles(
    files.map((f) => f.id),
    fileEdges,
  );
  for (const id of cycles.flat()) {
    for (const ancestor of ancestors(id)) nodes.get(ancestor)!.inCycle = true;
  }

  return {
    root,
    repoName: repoName || basename(root),
    nodes: [...nodes.values()],
    edges,
    rules,
    rulesSource: tierConfig.config ? "nuxt-highlevel.json" : "default",
    cycles,
    warnings,
    generatedAt: new Date().toISOString(),
  };
}
