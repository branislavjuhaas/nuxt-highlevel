#!/usr/bin/env node
// Plain .mjs on purpose: Node doesn't strip types in files under node_modules.
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { defineCommand, runMain } from 'citty'
import { getPort } from 'get-port-please'
import { globSync } from 'tinyglobby'

const serverEntry = fileURLToPath(new URL('../.output/server/index.mjs', import.meta.url))

/** Dirs with a nuxt.config but no generated `.nuxt/`. */
function unpreparedNuxtDirs(root) {
  return globSync('**/nuxt.config.{ts,mts,js,mjs}', {
    cwd: root,
    absolute: true,
    ignore: ['**/node_modules/**', '**/.nuxt/**', '**/.output/**', '**/dist/**']
  })
    .map(file => dirname(file))
    .filter(dir => !existsSync(join(dir, '.nuxt')))
}

/** Runs the target's own `nuxi prepare`, so the registry matches its Nuxt version. */
function prepare(dir) {
  let bin
  try {
    const pkgFile = createRequire(join(dir, 'package.json')).resolve('nuxt/package.json')
    const pkg = JSON.parse(readFileSync(pkgFile, 'utf8'))
    const entry = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.nuxt ?? pkg.bin?.nuxi
    bin = join(dirname(pkgFile), entry)
  } catch {
    console.warn(`  skipped ${dir}: nuxt is not installed there`)
    return
  }
  console.log(`  nuxi prepare in ${dir}`)
  const result = spawnSync(process.execPath, [bin, 'prepare'], { cwd: dir, stdio: 'inherit' })
  if (result.status !== 0) console.warn(`  nuxi prepare failed in ${dir}`)
}

function openBrowser(url) {
  const [command, args] = process.platform === 'darwin'
    ? ['open', [url]]
    : process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '', url]]
      : ['xdg-open', [url]]
  spawn(command, args, { detached: true, stdio: 'ignore' }).on('error', () => {}).unref()
}

async function waitForGraph(url) {
  for (let attempt = 0; attempt < 100; attempt++) {
    let response
    try {
      response = await fetch(new URL('api/graph', url))
    } catch {
      // server not listening yet
    }
    if (response?.ok) return await response.json()
    if (response) {
      const body = await response.json().catch(() => ({}))
      throw new Error(`Analysis failed: ${body.message ?? response.statusText}`)
    }
    await new Promise(done => setTimeout(done, 100))
  }
  throw new Error('Server did not start')
}

const main = defineCommand({
  meta: {
    name: 'nuxt-highlevel',
    description: 'Show the architecture of a Nuxt (mono)repo as a drillable graph'
  },
  args: {
    root: { type: 'positional', description: 'Repo to analyze', default: '.', required: false },
    port: { type: 'string', description: 'Preferred port', default: '4777' },
    open: { type: 'boolean', description: 'Open the browser (--no-open to skip)', default: true },
    prepare: { type: 'boolean', description: 'Run `nuxi prepare` where .nuxt/ is missing', default: false }
  },
  async run({ args }) {
    const root = resolve(args.root)
    if (!existsSync(root)) throw new Error(`${root} does not exist`)
    if (!existsSync(serverEntry)) {
      throw new Error(`Missing ${serverEntry}. Build first: run \`vp run build\` in ${fileURLToPath(new URL('..', import.meta.url))}`)
    }

    const unprepared = unpreparedNuxtDirs(root)
    if (unprepared.length && args.prepare) {
      console.log('Preparing Nuxt projects…')
      unprepared.forEach(prepare)
    } else if (unprepared.length) {
      console.log(`${unprepared.length} nuxt.config without .nuxt/. Layers borrow it from their app, but if auto-import edges look incomplete, rerun with --prepare.`)
    }

    const host = '127.0.0.1'
    const port = await getPort({ port: Number(args.port), portRange: [4777, 4877], host })
    Object.assign(process.env, {
      NUXT_TARGET_ROOT: root,
      NUXT_PUBLIC_REPO_NAME: basename(root),
      NITRO_HOST: host,
      NITRO_PORT: String(port)
    })
    await import(pathToFileURL(serverEntry).href)

    const url = `http://${host}:${port}/`
    console.log(`Analyzing ${root}…`)
    const graph = await waitForGraph(url)
    const count = kind => graph.nodes.filter(node => node.kind === kind).length
    console.log(`${count('package')} packages, ${count('file')} files, ${graph.cycles.length} cycles, ${graph.edges.filter(e => e.violation).length} rule violations`)
    for (const warning of graph.warnings) console.warn(`  ! ${warning}`)
    console.log(`\n  ➜ ${url}\n`)
    if (args.open) openBrowser(url)
  }
})

runMain(main)
