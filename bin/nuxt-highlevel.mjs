#!/usr/bin/env node
// Plain .mjs on purpose: Node doesn't strip types in files under node_modules.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { defineCommand, runMain } from 'citty'
import { getPort } from 'get-port-please'

const serverEntry = fileURLToPath(new URL('../.output/server/index.mjs', import.meta.url))

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
    editor: { type: 'string', description: 'Preferred editor to open files in (e.g. code, cursor)' },
    open: { type: 'boolean', description: 'Open the browser (--no-open to skip)', default: true }
  },
  async run({ args }) {
    const root = resolve(args.root)
    if (!existsSync(root)) throw new Error(`${root} does not exist`)
    if (!existsSync(serverEntry)) {
      throw new Error(`Missing ${serverEntry}. Build first: run \`vp run build\` in ${fileURLToPath(new URL('..', import.meta.url))}`)
    }

    const host = '127.0.0.1'
    const port = await getPort({ port: Number(args.port), portRange: [4777, 4877], host })
    Object.assign(process.env, {
      NUXT_TARGET_ROOT: root,
      NUXT_EDITOR: args.editor ?? process.env.NUXT_EDITOR ?? '',
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
