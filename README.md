# nuxt-highlevel

Architecture view of a Nuxt (mono)repo: apps, layers, modules and packages, drillable down to single files. Auto-import edges come from the registries Nuxt generates in `.nuxt/`.

```sh
nuxt-highlevel                      # analyze cwd, start server, open browser
nuxt-highlevel ../other-repo        # analyze another root
nuxt-highlevel --port 4777 --no-open --prepare
```

`--prepare` runs the target's own `nuxi prepare` where `.nuxt/` is missing. Without `.nuxt/`, auto-import edges are missing and the UI warns about it.

## Install

```sh
vp install
vp run build
vp add -g "$PWD"   # a copy: rerun after every build
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
NUXT_TARGET_ROOT=$PWD/test/fixtures/mono vp run dev         # pnpm monorepo
NUXT_TARGET_ROOT=$PWD/test/fixtures/standalone vp run dev   # single app with local layers/modules
vp run check    # lint, typecheck, tests
```
