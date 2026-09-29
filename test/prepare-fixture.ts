import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const apps = ['./fixtures/mono/apps/web', './fixtures/standalone']

/** The analyzer reads the auto-import registry from `.nuxt/`, so the fixture apps need `nuxi prepare`. */
export default function setup() {
  const nuxt = fileURLToPath(new URL('../node_modules/nuxt/bin/nuxt.mjs', import.meta.url))
  for (const path of apps) {
    const app = fileURLToPath(new URL(path, import.meta.url))
    if (existsSync(`${app}/.nuxt/types/imports.d.ts`)) continue
    execFileSync(process.execPath, [nuxt, 'prepare'], { cwd: app, stdio: 'inherit' })
  }
}
