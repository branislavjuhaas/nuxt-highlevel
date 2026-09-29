# nuxt-highlevel

Architecture view of a Nuxt (mono)repo: apps, layers, modules and packages, drillable down to single files. Auto-import edges come from the registries Nuxt generates in `.nuxt/`.

```sh
nuxt-highlevel                      # analyze cwd, start server, open browser
nuxt-highlevel ../other-repo        # analyze another root
nuxt-highlevel --port 4777 --no-open
```

Before each analysis (startup and Refresh), every app in the target runs its own `nuxi prepare`, so new composables and components show up. Layers and modules borrow the registry of the app using them. Auto-imports are regular import edges. If an app can't be prepared (Nuxt not installed), its auto-imported dependencies are missing and the UI warns about it.

## Install

```sh
pnpm install
pnpm build
pnpm add -g "$PWD"   # or run locally via pnpm dev
```

The `--prepare` flag automatically executes `nuxi prepare` on target directories if auto-import edges are missing.

```sh
nuxt-highlevel --prepare
```

## Tier rules

Every package gets a tier. Built-in defaults: Nuxt apps are `app`, packages whose name or path contains `base`, `common`, `core`, `shared`, `ui` or `utils` are `base`, everything else is `feature`. `base` must not depend on `feature` or `app`, and `feature` must not depend on `app`. Violating edges are red.

Override both with `nuxt-highlevel.json` in the analyzed root. Globs match the package path or name, and the first match wins:

```json
{
  "tiers": {
    "base": ["layers/base", "packages/*-utils"],
    "feature": ["layers/*"],
    "app": ["apps/*"]
  },
  "rules": [
    { "from": "base", "disallow": ["feature", "app"] },
    { "from": "feature", "disallow": ["app"] }
  ]
}
```

## Develop

```sh
NUXT_TARGET_ROOT=$PWD/test/fixtures/mono pnpm dev         # pnpm monorepo
NUXT_TARGET_ROOT=$PWD/test/fixtures/standalone pnpm dev   # single app with local layers/modules
pnpm check    # lint, typecheck, tests
```
