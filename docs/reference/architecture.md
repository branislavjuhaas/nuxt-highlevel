# Analyzer Architecture

Nuxt Highlevel is architected around a robust server-side analysis engine and a high-performance Vue Flow frontend.

## Server-Side Analyzer Engine

Located in `server/utils/analyzer/`, the analysis pipeline consists of several modular steps:

1. **`workspace.ts`**: Discovers workspace monorepos (via `pnpm-workspace.yaml`, package workspaces, or `nuxt.config`) and standalone applications, mapping packages, layers, modules, and standalone libraries.
2. **`files.ts`**: Scans files inside each package, computing Lines of Code (LOC), surface area (exported/used files), and file types.
3. **`ast.ts`**: Uses `oxc-parser` to parse JavaScript, TypeScript, and Vue SFC files at lightning speed, extracting explicit import statements and symbol references.
4. **`nuxt-registry.ts`**: Inspects generated `.nuxt/` directories to extract auto-import registries, component mappings, and module relationships.
5. **`resolve.ts`**: Resolves import paths and auto-imports across packages, connecting files and packages into a unified graph.
6. **`rules.ts` & `cycles.ts`**: Assigns packages to tiers (built-in or from `nuxt-highlevel.json`), validates tier dependency rules, and detects circular dependencies.
7. **`graph.ts`**: Combines nodes, edges, cycles, and warnings into a final `GraphModel`.

---

## Frontend Visualization

Located in `app/`, the frontend provides a rich interactive experience:

- **Nuxt 4 & Nuxt UI**: Built using Nuxt 4 and Tailwind CSS-powered Nuxt UI components.
- **Vue Flow & ELK.js (`useElkLayout.ts`)**: Automatic hierarchical node layouting via ELK.js combined with Vue Flow for pan, zoom, and interactive graph rendering.
- **Drill-Down Navigation**: Navigate from Repository $\rightarrow$ Package/Layer $\rightarrow$ Area $\rightarrow$ File. URL query parameters (`?path=...`) preserve navigation history and support bookmarking/sharing.
- **Interactive Inspector (`NodePanel.vue`)**: Click any node or edge to inspect metadata, dependencies, fan-in/fan-out counts, surface files, and jump directly to your editor.
- **Quick Search (`GraphSearch.vue`)**: Press `Cmd+K` or `Ctrl+K` to search across all nodes instantly.
