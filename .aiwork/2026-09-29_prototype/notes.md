# Dogfood notes

Ran the CLI on jedlik-nejedlik, lance-hours-kit, chrono-albums-2 and nuxt-anatomy (2026-09-29).

## Fixed during dogfooding

- Nuxt 4 auto-registers `layers/*` directories without a `package.json` or an `extends` entry. That's how three of the four repos are structured. The first version showed each of them as a single package. Such layers are now packages, and their app gets an `extends` edge to them.
- An empty `pnpm-workspace.yaml` (only `allowBuilds`) crashed the analysis.
- A layered repo is one big cycle at package level (layers use each other through auto-imports), so every edge was red. Now only a cycle's back-edges are red: the edges the layout had to reverse, which are the candidates to cut.
- Ghost nodes (outside the current level) ended up in the middle of the layout. They are now pinned to the sides: users before, dependencies after.

## Still unreadable or missing

- lance-hours-kit top level: 11 packages with about 60 aggregated edges is still dense, and edges cross behind nodes. Worth trying: edge bundling, or hiding `dependency`/`extends` edges when file edges already connect the same pair.
- Edge count chips sometimes overlap.
- Layers → root app edges in lance-hours-kit and core (base) → email/dashboard (feature) show up as violations. They look like real findings but haven't been checked in the code.
- The CLI hint "N nuxt.config without .nuxt/" counts layers that borrow their app's registry, so it overstates the problem. The UI warning is the accurate one.
- Isolated areas (no edges, e.g. `layouts`, `middleware`) get packed into a corner. That's fine, but they could be grouped.
- The legend (bottom-left) can cover a node after fit-to-view. It should be collapsible, or fit-to-view should leave room for it.
