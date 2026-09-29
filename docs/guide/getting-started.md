# Getting Started

This guide walks you through installing, running, and configuring Nuxt Highlevel for your Nuxt application or monorepo.

## Prerequisites

- **Node.js**: `>= 24`
- **Package Manager**: `pnpm` (recommended)

## Installation & Running

You can run Nuxt Highlevel directly against any target Nuxt repository:

```sh
# Analyze current working directory, start server, and open browser
nuxt-highlevel

# Analyze another repository path
nuxt-highlevel ../my-other-nuxt-repo

# Specify a custom port, skip opening the browser, and prepare Nuxt projects
nuxt-highlevel --port 4777 --no-open --prepare
```

### The `--prepare` Flag

If your target repository contains `nuxt.config` files without generated `.nuxt/` directories, auto-import edges may be missing. Running with `--prepare` automatically executes `nuxi prepare` on those directories so that Nuxt auto-import registries are fully generated before analysis:

```sh
nuxt-highlevel --prepare
```

## Development Installation

If you are developing or running locally from the source repository:

```sh
pnpm install
pnpm build
pnpm add -g "$PWD"   # or run locally via pnpm dev
```

To develop with test fixtures:

```sh
NUXT_TARGET_ROOT=$PWD/test/fixtures/mono pnpm dev
# or
NUXT_TARGET_ROOT=$PWD/test/fixtures/standalone pnpm dev
```
