import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** The renderer's source folder. */
export const RENDERER = join(__dirname, '../src/renderer/src')

/** Every renderer source file with one of the extensions, as its path (relative, with "/") and text. */
export function rendererSources(...extensions: string[]): { path: string; text: string }[] {
  return readdirSync(RENDERER, { recursive: true, encoding: 'utf8' })
    .map((path) => path.replaceAll('\\', '/'))
    .filter((path) => extensions.some((ext) => path.endsWith(ext)))
    .map((path) => ({ path, text: readFileSync(join(RENDERER, path), 'utf8') }))
}
