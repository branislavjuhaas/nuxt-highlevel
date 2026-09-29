# CLI Reference

The `nuxt-highlevel` command-line interface is powered by `citty` and provides a fast, zero-config way to analyze and visualize Nuxt repositories.

## Usage

```sh
nuxt-highlevel [root] [options]
```

## Arguments & Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `root` | Positional | `.` | Path to the Nuxt repository or monorepo to analyze. |
| `--port` | String | `4777` | Preferred port for the web server (automatically scans range `4777–4877` if occupied). |
| `--editor` | String | — | Preferred editor to open files in when clicking "Open in Editor" (e.g. `code`, `cursor`). |
| `--open` / `--no-open` | Boolean | `true` | Automatically open the browser when the server starts (`--no-open` to skip). |
| `--prepare` | Boolean | `false` | Automatically run `nuxi prepare` on Nuxt projects where `.nuxt/` is missing. |

## Examples

```sh
# Analyze current directory on default port 4777
nuxt-highlevel

# Analyze a mono repo in another directory with VS Code as preferred editor
nuxt-highlevel ../my-monorepo --editor code

# Run on port 5000 without opening the browser, preparing Nuxt configs first
nuxt-highlevel --port 5000 --no-open --prepare
```
