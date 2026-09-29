# Tiers & Architecture Rules

Nuxt Highlevel introduces architectural tiers to help you enforce clean boundaries between different parts of your codebase (e.g., ensuring low-level shared utilities do not depend on high-level application features).

## Built-in Tiers

Every package in your repository is assigned to one of three default tiers:

1. **`app`**: Nuxt applications (e.g., `apps/*`).
2. **`base`**: Foundation packages, shared code, UI libraries, or utilities. Packages whose name or path contains `base`, `common`, `core`, `shared`, `ui`, or `utils` are automatically classified here.
3. **`feature`**: Business logic, features, and domain layers (everything else).

## Default Rules

Nuxt Highlevel enforces the following default architecture rules:
- **`base` must not depend on `feature` or `app`**.
- **`feature` must not depend on `app`**.

Any edge violating these rules is highlighted in **red** in the graph visualization, and warnings are surfaced in the UI.

## Customizing Tiers and Rules

You can customize tiers and rules for your repository by adding a `nuxt-highlevel.json` file in the root of your analyzed project.

```json
{
  "tiers": {
    "base": ["layers/base", "packages/*-utils"],
    "feature": ["layers/*", "packages/features/*"],
    "app": ["apps/*"]
  },
  "rules": [
    { "from": "base", "disallow": ["feature", "app"] },
    { "from": "feature", "disallow": ["app"] }
  ]
}
```

### How Matching Works
- Globs are matched against the package path or package name using `picomatch`.
- The first matching glob wins.
- If no rules file is present, the built-in default tiers and rules are applied automatically.
