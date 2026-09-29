# Implementation notes

- **Needs a human check: "Open in editor".** The `/api/open` guards were verified: 403 for paths outside the root, 415 for non-JSON requests. The actual editor launch wasn't triggered, to avoid popping windows on your desktop.
- **Fixture has 6 packages, not 4.** The base → feature violation needed a feature package (`layers/shop`), and the auto-registered layer case needed `apps/web/layers/promo`.
- **`@vue/compiler-dom` instead of `@vue/compiler-sfc`.** Bundling compiler-sfc into Nitro pulls in `consolidate`'s optional template engines and fails at runtime. compiler-dom in `parseMode: 'sfc'` gives the same blocks and template AST.
- **Global install is `vp add -g <dir>`, not `vp link --global`.** pnpm 12's `link` has no global mode. `vp add -g` installs a copy, so rerun it after each `vp run build`. `npm link` lands in vite-plus's Node bin dir, which isn't on PATH.
- **Cycle colouring deviates from "cycles in red".** At aggregated levels only the back-edges of a cycle are red, otherwise layered repos turn fully red (see `notes.md`). Nodes containing file cycles still get the red cycle badge.
- **`@nuxt/test-utils` dropped.** The analyzer and the view aggregation are plain functions tested with Vitest in node, so the Nuxt test environment wasn't needed.
