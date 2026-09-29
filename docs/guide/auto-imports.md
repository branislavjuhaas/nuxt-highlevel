# Auto-Imports & Registries

One of the most powerful features of Nuxt is its automatic import system for components, composables, and utils. Traditional static analysis tools struggle with auto-imports because they rely solely on explicit `import` statements.

## How Nuxt Highlevel Tracks Auto-Imports

Nuxt Highlevel bridges the gap between Nuxt's runtime magic and static code analysis by inspecting Nuxt's generated registries:

1. **Registry Inspection**: When Nuxt prepares or builds a project, it generates metadata in `.nuxt/` (such as component lists, auto-imported composable exports, and module configurations).
2. **AST Parsing**: The analyzer uses `oxc-parser` to parse JavaScript, TypeScript, and Vue Single File Components (`.vue`).
3. **Reference Resolution**: If a file references an identifier (e.g. `useCart()` or `UiButton`) that is not explicitly imported with an `import` statement, Nuxt Highlevel checks the generated `.nuxt/` registry to determine which package or file provides that symbol.
4. **Edge Creation**: An `auto` edge is established between the consumer file and the provider file.

## Missing `.nuxt/` Directories

If `.nuxt/` does not exist (for example, in a fresh git clone before running `nuxi prepare`), auto-import edges cannot be resolved.

When you run `nuxt-highlevel`, it detects unprepared Nuxt configs and warns you. You can automatically prepare all projects before analysis by passing the `--prepare` flag:

```sh
nuxt-highlevel --prepare
```
