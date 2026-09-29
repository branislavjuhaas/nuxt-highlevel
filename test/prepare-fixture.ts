import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** The analyzer reads the auto-import registry from `.nuxt/`, so the fixture app needs `nuxi prepare`. */
export default function setup() {
  const app = fileURLToPath(new URL('./fixtures/mono/apps/web', import.meta.url))
  if (existsSync(`${app}/.nuxt/types/imports.d.ts`)) return
  const nuxt = fileURLToPath(new URL('../node_modules/nuxt/bin/nuxt.mjs', import.meta.url))
  execFileSync(process.execPath, [nuxt, 'prepare'], { cwd: app, stdio: 'inherit' })
}
