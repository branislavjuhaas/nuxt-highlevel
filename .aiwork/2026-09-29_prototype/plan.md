---
status: agent-done
references:
  - "Intent: ./intent.md"
  - "Use cases: ./source-note.md"
  - https://research.lukastrumm.com/nuxt-dependency-visualization/
  - https://github.com/antoine-coulon/skott
  - https://ui.nuxt.com
---

# Plan: nuxt-highlevel prototype

A Node 24 CLI. Run it in any repo, it analyzes the repo and serves a Nuxt UI app showing the architecture as a drillable graph.

```sh
cd ~/code/some-monorepo
nuxt-highlevel            # analyze cwd, start server, open browser
nuxt-highlevel ../other   # analyze another root
nuxt-highlevel --port 4777 --no-open --prepare
```

Versions checked on 2026-09-29: nuxt 4.5.2, @nuxt/ui 4.11.2, create-nuxt 3.37.0, @vueuse/nuxt 15.0.0, @vue-flow/core 1.48.2, elkjs 0.12.0, oxc-parser 0.152.0, citty 0.2.2, launch-editor 2.14.1. Local Node is v24.21.0.

## Key decisions

1. **One package: a Nuxt app plus a thin bin.** The analyzer lives in Nitro (`server/utils/analyzer/`) and runs in-process on the target repo. The CLI only resolves args, sets runtime config via env and starts the built Nitro server (`.output/server/index.mjs`). No second build pipeline.
   - Runtime config: `NUXT_TARGET_ROOT`, `NUXT_PUBLIC_REPO_NAME`.
   - Dev loop: `NUXT_TARGET_ROOT=~/code/x vp run dev` with the same code.
   - Install globally with `vp link` / `npm link` for the prototype. Publishing is out of scope.
2. **Bin stays plain `.mjs`.** Node's type stripping does not apply to files under `node_modules`, so the bin can't be `.ts` once installed. It stays tiny: citty for args, `node:child_process` or a direct `import()` of the Nitro entry, then open the browser.
3. **Auto-imports come from Nuxt, not guesswork.** For each Nuxt app/layer, read the registries Nuxt generates in `.nuxt/`: `components.d.ts` and `types/imports.d.ts` (name → source file). If `.nuxt/` is missing, `--prepare` runs the target's own `nuxi prepare`, otherwise the UI warns that auto-import edges are incomplete. This closes the main gap in the existing tools (hidden auto-import edges).
   - Rejected: `loadNuxt()` from our own `@nuxt/kit`. Version skew with the target's Nuxt, slow, side effects.
4. **Parsing:** `@vue/compiler-sfc` splits SFCs. Script blocks and `.ts` files go through `oxc-parser` (explicit imports, identifiers). The template AST supplies used component tags. Identifiers and tags are matched against the auto-import registry and become edges with `kind: 'auto'`, explicit ones get `kind: 'import'`. Aliases (`~`, `@`, `#layers/*`, `#imports`) resolve via the generated `.nuxt/tsconfig.json` paths.
5. **Graph model: hierarchical and aggregated.** This avoids huge, unreadable graphs.
   - Levels: `repo → package (app | layer | module | lib) → area (components, composables, pages, layouts, server, stores, utils, …) → file`.
   - Edges are stored at file level and **aggregated up** (package→package with a count and kinds). The view only ever shows one level's children plus aggregated edges to their siblings.
   - Node labels are short: package name, area name, component/file basename. The full path goes only in the tooltip and side panel.
6. **Visualization:** Vue Flow + elkjs (`layered`, direction chosen by aspect ratio) for a readable, compact layout. Drill-down: double-click a node to go into it, with a breadcrumb back (`UBreadcrumb`). No free-form "show everything" mode in v1.
7. **Minimal UI surface** (a complaint about current tools is "too many choices"): graph canvas, breadcrumb, a right `USlideover` / panel with node details, one search (`UCommandPalette`, ⌘K), one toggle for "include auto-import edges". No settings page.
8. **Files ↔ nodes:** the detail panel lists the node's files with an "Open in editor" action (`launch-editor` through a Nitro route, `POST /api/open { path }`, restricted to paths under the target root).
9. **Zero config.** Workspace discovery comes from `pnpm-workspace.yaml` / `package.json#workspaces`, or falls back to the single root. Package classification:
   - **app**: has `nuxt.config.*` and is not extended by another workspace package.
   - **layer**: has `nuxt.config.*` and is referenced in someone's `extends`.
   - **module**: exports `defineNuxtModule` or has the `nuxt-module` keyword.
   - **lib**: everything else.
   - Package edges: workspace `dependencies`, Nuxt `extends` and Nuxt `modules`. `nuxt.config` is read statically with oxc, never executed.
10. **Custom dependency rules, based on tiers.** Each package gets a tier, and rules say which tiers must not depend on which. The same rules apply to aggregated package edges and to file edges that cross packages.
    - Built-in defaults, so nothing is required: tiers `app`, `feature` and `base`. Packages named or located under `base|common|core|shared|ui|utils` are `base`, apps are `app`, and everything else is `feature`. Default rules: `base` must not depend on `feature` or `app`, and `feature` must not depend on `app`.
    - Optional `nuxt-highlevel.json` in the target root overrides both the tier assignment (globs on package name or path) and the rules. It's JSON, so it's read without executing any code:
      ```json
      {
        "tiers": {
          "base": ["layers/base", "layers/common", "packages/*-utils"],
          "feature": ["layers/*", "modules/*"],
          "app": ["apps/*"]
        },
        "rules": [
          { "from": "base", "disallow": ["feature", "app"] },
          { "from": "feature", "disallow": ["app"] }
        ]
      }
      ```
    - The first matching glob wins. The detail panel shows each package's tier and why it got it (default name match or config glob). A violating edge is red, and its tooltip names the rule it breaks.
11. **No DB.** Analysis is computed on startup and cached in memory, with a `POST /api/refresh` button. SQLite/Drizzle are not needed for this prototype.

## Nuxt app setup

- Scaffold: `vpx create-nuxt@latest . -t ui --packageManager pnpm --gitInit` (the `ui` template is the official Nuxt UI starter, `nuxt-ui-templates/starter`).
- Modules: `@nuxt/ui` (brings `@nuxt/icon`, `@nuxt/fonts`, color mode), `@vueuse/nuxt`, `@nuxt/eslint`, `@nuxt/test-utils`.
- Extra deps: `@vue-flow/core`, `@vue-flow/controls`, `@vue-flow/minimap`, `elkjs`, `oxc-parser`, `@vue/compiler-sfc`, `citty`, `launch-editor`, `tinyglobby`, `pathe`, `pkg-types`.
- TypeScript strict, Vitest for the analyzer.
- VueUse in practice: `useMagicKeys` (shortcuts), `useStorage` (last drill path per repo), `useElementSize` (layout direction), `refDebounced` (search).

## Layout

```
bin/nuxt-highlevel.mjs
app/
  pages/index.vue            # graph view, drill path in ?path=
  components/Graph*.vue      # canvas, node types, edge styles
  components/NodePanel.vue
  composables/useGraph.ts    # fetch, drill state, aggregation selectors
  composables/useElkLayout.ts
server/
  api/graph.get.ts
  api/refresh.post.ts
  api/open.post.ts
  utils/analyzer/
    workspace.ts             # packages + classification + package edges
    nuxt-registry.ts         # .nuxt d.ts → auto-import map, aliases
    files.ts                 # per-file parse → edges
    graph.ts                 # hierarchy, aggregation, cycles, metrics
    rules.ts                 # tiers, nuxt-highlevel.json, violations
shared/types/graph.ts        # GraphNode, GraphEdge, NodeKind, EdgeKind
test/fixtures/               # tiny monorepo: app + layer + lib + local module
```

## Steps

1. **Scaffold.** Create the ui template, add modules and deps, `bin` entry in `package.json`, `engines.node >=24`. Check: `vp run dev` shows the starter page.
2. **Fixture repo.** Build `test/fixtures/mono`: pnpm workspace, `apps/web` (extends `layers/base`, uses the local module `packages/nuxt-foo`, depends on `packages/utils`), auto-imported components and composables, one deliberate cycle, and a `base` layer that imports from a `feature` layer (a rule violation), and a `nuxt-highlevel.json` that retiers one package. Run `nuxi prepare` in it so `.nuxt/` exists.
3. **Workspace analyzer** (`workspace.ts`) with Vitest against the fixture: packages, kinds and package-level edges.
4. **Nuxt registry + file analyzer** (`nuxt-registry.ts`, `files.ts`) with Vitest. Explicit and auto edges must appear, e.g. `app.vue → components/Header.vue (auto)`.
5. **Graph builder** (`graph.ts`): hierarchy ids (`pkg:web/area:components/file:Header.vue`), edge aggregation by level, Tarjan cycles, fan-in/fan-out per node. Tests.
6. **API:** `GET /api/graph` returns the full model once (the client aggregates), `refresh`, and `open`. Guard `open` against paths outside the root.
7. **Graph UI:** Vue Flow custom nodes (kind icon, short label, counts badge), elkjs layout, drill-down plus breadcrumb, edge styles per kind (import solid, auto dashed, extends/module distinct colors), edge width by count.
8. **Detail panel + search:** node info, files with open-in-editor, incoming/outgoing lists, ⌘K search jumping to a node (auto-drill to its parent).
9. **Good-practice signals (lightweight):**
   - Cycles highlighted in red.
   - Tier rules (decision 10): `rules.ts` loads `nuxt-highlevel.json` or the defaults, assigns tiers, and marks violating edges. Tests cover the defaults, config overrides and first-match-wins.
   - Metrics badges: fan-in, fan-out, and a "deep module" hint (files/LOC inside vs. exported/used surface).
   - All of it read-only. Config is edited by hand, not in the UI.
10. **CLI:** `bin/nuxt-highlevel.mjs` resolves the root, checks for `.nuxt/` (offers `--prepare`), picks a free port, starts the built server and opens the browser. `prepack` runs `nuxt build`. Check: `vp link --global` (or `npm link`), then run it in the fixture and in one real repo.
11. **Dogfood** on 1–2 real repos from `~/code`. Record what's unreadable or missing in `notes.md`.

## Verification

- `vp run test`: analyzer unit tests against the fixture (edge counts and kinds are asserted).
- `vp run lint` and `vp run typecheck`.
- Behaviour: run the CLI in the fixture. Package view shows 4 packages with extends/module/dep edges. Drilling into `web` shows areas. Drilling into components shows auto-import edges. The cycle and the base → feature violation are flagged. Removing `nuxt-highlevel.json` and pressing refresh falls back to the default tiers. "Open in editor" opens the file.

## Out of scope for the prototype

Publishing to npm, a watch mode, editing tiers/rules in the UI, file-level rules inside one package, non-Nuxt frameworks, bundle analysis (`nuxi analyze` already covers it), and ESLint enforcement (`eslint-plugin-nuxt-layers` covers it).

## Risks / open questions

- `.nuxt/` shape can differ across Nuxt 3 vs 4 targets, so parse defensively and test on both if a Nuxt 3 repo is at hand.
- Server-side auto-imports (`server/utils`, Nitro `#imports`) live in `.nuxt/types/nitro-imports.d.ts`. Include them in step 4 if cheap, otherwise defer.
- The `vp` toolchain inside a Nuxt project: confirm `vp run dev/build` just proxies the package scripts. Otherwise fall back to pnpm.
