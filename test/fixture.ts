import { fileURLToPath } from 'node:url'

export const fixtureRoot = fileURLToPath(new URL('./fixtures/mono', import.meta.url))
