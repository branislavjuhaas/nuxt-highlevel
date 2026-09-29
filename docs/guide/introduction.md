# Introduction

**Nuxt Highlevel** is an advanced architecture visualization and analysis tool built specifically for Nuxt monorepos, multi-layer applications, internal modules, and packages.

As Nuxt applications grow, maintaining clear architectural boundaries becomes challenging. Layers import from each other, components and composables are auto-imported implicitly, and circular dependencies or tier boundary violations can creep in unnoticed. Nuxt Highlevel solves this by providing an interactive, drillable architecture graph that reveals how your code connects from the repository level down to individual files.

## Key Capabilities

- **Automatic Package Discovery**: Detects apps, layers, modules, and packages across monorepo workspaces (pnpm, npm, yarn, bun) and standalone applications.
- **Auto-Import Resolution**: Unlike traditional static analysis tools that miss Nuxt's magic auto-imports, Nuxt Highlevel parses generated `.nuxt/` registries to connect components, composables, and utils across packages.
- **Tier-Based Rule Enforcement**: Categorizes packages into `base`, `feature`, and `app` tiers (with customizable rules in `nuxt-highlevel.json`) and flags illegal dependency violations in red.
- **File-Level Drilldown**: Double-click any package or layer to enter its interior, inspect file relationships, surface metrics, lines of code (LOC), and fan-in/fan-out statistics.
- **Circular Dependency Detection**: Automatically identifies file-level dependency cycles.
- **Modern Interactive UI**: Built with Nuxt 4, Vue Flow, and ELK.js for smooth graph rendering and layout. Includes keyboard shortcuts (`Cmd+K` search, `Backspace` to go up) and direct "Open in Editor" support.
