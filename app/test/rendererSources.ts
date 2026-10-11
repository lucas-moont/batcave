import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const SRC = join(__dirname, '../src')

/** The renderer's source folder. */
export const RENDERER = join(SRC, 'renderer/src')

/** Every source file under a folder of app/src with one of the extensions, as its path (relative to that folder, with "/") and text. */
export function sourcesUnder(dir: string, ...extensions: string[]): { path: string; text: string }[] {
  const root = join(SRC, dir)
  return readdirSync(root, { recursive: true, encoding: 'utf8' })
    .map((path) => path.replaceAll('\\', '/'))
    .filter((path) => extensions.some((ext) => path.endsWith(ext)))
    .map((path) => ({ path, text: readFileSync(join(root, path), 'utf8') }))
}

/** Every renderer source file with one of the extensions. */
export const rendererSources = (...extensions: string[]) => sourcesUnder('renderer/src', ...extensions)
