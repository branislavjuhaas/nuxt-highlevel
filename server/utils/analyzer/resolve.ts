import { statSync } from 'node:fs'

const EXTENSIONS = ['.ts', '.vue', '.js', '.mjs', '.mts', '.tsx', '.jsx', '.cjs']

function isFile(path: string) {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

/** Resolves an extensionless import path to a file, like a bundler would. */
export function resolveFile(base: string): string | undefined {
  if (isFile(base)) return base
  // `./foo.js` written in TS sources usually means `./foo.ts`
  const stripped = base.replace(/\.(m?js|jsx)$/, '')
  for (const candidate of [stripped, `${stripped}/index`]) {
    for (const ext of EXTENSIONS) {
      if (isFile(candidate + ext)) return candidate + ext
    }
  }
}
