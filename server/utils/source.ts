import { existsSync, realpathSync } from 'node:fs'
import { resolve } from 'pathe'
import { createHighlighterCore, type HighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'

/** Absolute path of a repo-relative path, only for files inside the analyzed repo, also after following symlinks. */
export function repoFile(path: unknown): string {
  if (typeof path !== 'string' || !path) throw createError({ statusCode: 400, statusMessage: 'Missing path' })
  const root = realpathSync(targetRoot())
  const file = resolve(root, path)
  if (!existsSync(file) || !realpathSync(file).startsWith(`${root}/`)) {
    throw createError({ statusCode: 403, statusMessage: 'Path is outside of the analyzed repo' })
  }
  return file
}

let highlighter: Promise<HighlighterCore> | undefined

const LANGS: Record<string, string> = { vue: 'vue', ts: 'typescript', mts: 'typescript', cts: 'typescript', tsx: 'tsx', js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'jsx' }

/** Highlighted HTML with one `.line` per source line, `highlight` lines get the `highlighted` class. */
export async function highlightSource(filename: string, code: string, highlight: number[]) {
  highlighter ??= createHighlighterCore({
    themes: [import('shiki/themes/github-light.mjs'), import('shiki/themes/github-dark.mjs')],
    langs: [import('shiki/langs/vue.mjs'), import('shiki/langs/typescript.mjs'), import('shiki/langs/tsx.mjs'), import('shiki/langs/javascript.mjs'), import('shiki/langs/jsx.mjs')],
    engine: createJavaScriptRegexEngine()
  })
  const lang = LANGS[filename.match(/\.(\w+)$/)?.[1] ?? ''] ?? 'text'
  return (await highlighter).codeToHtml(code, {
    lang,
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false,
    transformers: [{
      line(node, line) {
        if (highlight.includes(line)) this.addClassToHast(node, 'highlighted')
      }
    }]
  })
}
