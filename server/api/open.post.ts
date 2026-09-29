import { existsSync, realpathSync } from 'node:fs'
import launchEditor from 'launch-editor'
import { resolve } from 'pathe'

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

  const error = await new Promise<string | undefined>((done) => {
    launchEditor(file, (_file, message) => done(message ?? 'Could not open editor'))
    // launch-editor only reports failures, give it a moment before assuming success.
    setTimeout(() => done(undefined), 300)
  })
  if (error) throw createError({ statusCode: 500, statusMessage: error })
  return { ok: true }
})
