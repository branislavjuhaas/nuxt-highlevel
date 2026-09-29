import { execSync } from 'node:child_process'
import { existsSync, realpathSync } from 'node:fs'
import launchEditor from 'launch-editor'
// @ts-expect-error launch-editor does not export types for guess.js
import guessEditor from 'launch-editor/guess.js'
import { resolve } from 'pathe'

function hasCommand(cmd: string): boolean {
  try {
    const check = process.platform === 'win32' ? `where ${cmd}` : `command -v ${cmd}`
    execSync(check, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function resolveEditor(): string | undefined {
  const [guessed] = guessEditor()
  if (guessed) return guessed

  const config = useRuntimeConfig()
  if (typeof config.editor === 'string' && config.editor) return config.editor

  // Fallback to commonly used editors present in PATH (helpful in WSL/remote environments)
  const common = ['code', 'cursor', 'webstorm', 'idea', 'subl', 'zed', 'vim']
  for (const cmd of common) {
    if (hasCommand(cmd)) return cmd
  }
  return undefined
}

export default defineEventHandler(async (event) => {
  // A JSON content type forces a CORS preflight, so other sites can't trigger this route.
  if (!getHeader(event, 'content-type')?.includes('application/json')) {
    throw createError({ statusCode: 415, statusMessage: 'Expected JSON' })
  }
  const { path } = await readBody<{ path?: unknown }>(event)
  if (typeof path !== 'string' || !path) throw createError({ statusCode: 400, statusMessage: 'Missing path' })

  const root = realpathSync(targetRoot())
  const file = resolve(root, path)
  // Only files inside the analyzed repo, also after following symlinks.
  if (!existsSync(file) || !realpathSync(file).startsWith(`${root}/`)) {
    throw createError({ statusCode: 403, statusMessage: 'Path is outside of the analyzed repo' })
  }

  const editor = resolveEditor()
  if (!editor) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Could not detect an editor. Set the LAUNCH_EDITOR or EDITOR environment variable.'
    })
  }

  const error = await new Promise<string | undefined>((done) => {
    launchEditor(file, editor, (_file, message) => {
      done(message ?? `Could not open '${path}' in editor '${editor}'.`)
    })
    // launch-editor only reports failures, give it a moment before assuming success.
    setTimeout(() => done(undefined), 500)
  })
  if (error) throw createError({ statusCode: 500, statusMessage: error })
  return { ok: true }
})
