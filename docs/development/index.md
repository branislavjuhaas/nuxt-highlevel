# Development & Contributing

Want to contribute to Nuxt Highlevel or run it locally for development? This guide covers the development workflow, test suite, and fixtures.

## Getting Started

1. Clone the repository and install dependencies:
   ```sh
   pnpm install
   ```

2. Run development mode against one of the test fixtures:
   ```sh
   # Monorepo fixture
   NUXT_TARGET_ROOT=$PWD/test/fixtures/mono pnpm dev

   # Standalone app fixture
   NUXT_TARGET_ROOT=$PWD/test/fixtures/standalone pnpm dev
   ```

## Available Scripts

| Script | Description |
| :--- | :--- |
| `pnpm dev` | Start Nuxt development server for the UI and API. |
| `pnpm build` | Build the application for production (`nuxt build`). |
| `pnpm preview` | Preview the production build locally. |
| `pnpm lint` | Run ESLint across the codebase (`eslint .`). |
| `pnpm typecheck` | Run Nuxt type checking (`nuxt typecheck`). |
| `pnpm test` | Run unit tests with Vitest (`vitest run`). |
| `pnpm check` | Run linter, type check, and tests all at once. |
| `pnpm docs:dev` | Start VitePress documentation development server. |
| `pnpm docs:build` | Build VitePress documentation. |
| `pnpm docs:preview` | Preview VitePress documentation locally. |

## Test Fixtures

Nuxt Highlevel includes test fixtures in `test/fixtures/` (`mono` and `standalone`) used for comprehensive unit and integration testing of graph parsing, tier rules, and file resolution.
