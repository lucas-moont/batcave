// npm run icons: draws the tray and toast icons from the bat emblem, so the bat has
// one source (shared/emblems.ts). A disc like the Bat-Signal's own: dark glass at rest, lit red
// with the bat in shadow when something needs you. resvg (WebAssembly) renders each size, and
// the sizes Windows picks from per DPI are packed into one .ico (PNG entries, Vista and later).
// A toast takes one PNG: the lit disc, since a toast is news.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { initWasm, Resvg } from '@resvg/resvg-wasm'

const APP = join(import.meta.dirname, '..')
const OUT = join(APP, 'resources', 'icons')
const SIZES = [16, 20, 24, 32, 40, 48, 64, 256]
/** Windows draws a toast's image at up to 48px, at up to 200% scale. */
const TOAST_SIZE = 96
/** The README's picture of the tray icon, at rest and lit, drawn (not a screenshot of a taskbar). */
const TRAY_PREVIEW = join(APP, '..', 'docs', 'screenshots', 'tray.png')
/** Its width in pixels: the 112-unit strip at 2x, like the README's other pictures. */
const TRAY_PREVIEW_WIDTH = 224
/** The bat the icons were drawn from, kept beside them so a test can tell when they fall behind. */
export const DRAWN_FROM = join(OUT, 'drawn-from.txt')

/** The WINGS path of shared/emblems.ts, joined from its string pieces. */
export function emblemPath(source: string): string {
  const declaration = /const WINGS =([\s\S]*?)\n\n/.exec(source)?.[1]
  const pieces = declaration?.match(/'[^']*'/g)
  if (!pieces?.length) throw new Error('emblems.ts: no WINGS path found')
  return pieces.map((p) => p.slice(1, -1)).join('')
}

/** One icon as SVG on a 64px canvas: the disc, and the 120x48 bat scaled into its middle. */
export function iconSvg(wings: string, lit: boolean): string {
  const face = lit
    ? `<radialGradient id="face"><stop offset="0" stop-color="#ff3b2f"/><stop offset="0.3" stop-color="#e3121b"/><stop offset="0.62" stop-color="#af0006"/><stop offset="1" stop-color="#3a0002"/></radialGradient>`
    : `<radialGradient id="face" cx="0.4" cy="0.35"><stop offset="0" stop-color="#2a221e"/><stop offset="0.62" stop-color="#0f0c0b"/><stop offset="1" stop-color="#000"/></radialGradient>`
  const rim = lit ? '#4a0204' : '#4a4442'
  const bat = lit ? '#050000' : '#e8e1d9'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>${face}</defs>
  <circle cx="32" cy="32" r="30.5" fill="url(#face)" stroke="${rim}" stroke-width="3"/>
  <path d="${wings}" fill="${bat}" transform="translate(5 21) scale(${54 / 120})"/>
</svg>`
}

/** Both tray icons as a taskbar shows them at 200%, side by side on a plain dark strip. */
export function trayPreviewSvg(wings: string): string {
  // Each icon names its gradient "face": in one picture the second would paint both, so each gets its own.
  const at = (x: number, lit: boolean) =>
    iconSvg(wings, lit)
      .replace('<svg ', `<svg x="${x}" y="12" `)
      .replace('width="64" height="64"', 'width="32" height="32"')
      .replace('id="face"', `id="face-${x}"`)
      .replace('url(#face)', `url(#face-${x})`)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="112" height="56" viewBox="0 0 112 56">
  <rect width="112" height="56" rx="8" fill="#1f1f1f"/><!-- a dark taskbar's grey, not a Bat-Signal ink -->
  ${at(16, false)}
  ${at(64, true)}
</svg>`
}

/** An .ico holding PNG images (one per size), as Windows reads them since Vista. */
export function ico(images: { size: number; png: Uint8Array }[]): Buffer {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(1, 2) // type: icon (bytes 0-1 are reserved, left zero)
  header.writeUInt16LE(images.length, 4)
  let offset = 6 + 16 * images.length
  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16)
    const side = size >= 256 ? 0 : size // 0 means 256
    entry.writeUInt8(side, 0) // width
    entry.writeUInt8(side, 1) // height
    entry.writeUInt16LE(1, 4) // colour planes
    entry.writeUInt16LE(32, 6) // bits per pixel
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += png.length
    return entry
  })
  return Buffer.concat([header, ...entries, ...images.map(({ png }) => Buffer.from(png))])
}

async function main(): Promise<void> {
  const require = createRequire(import.meta.url)
  await initWasm(readFileSync(require.resolve('@resvg/resvg-wasm/index_bg.wasm')))
  const wings = emblemPath(readFileSync(join(APP, 'src/shared/emblems.ts'), 'utf8'))
  mkdirSync(OUT, { recursive: true })
  writeFileSync(DRAWN_FROM, `${wings}\n`)
  for (const [name, lit] of [
    ['tray', false],
    ['tray-lit', true],
  ] as const) {
    const svg = iconSvg(wings, lit)
    const images = SIZES.map((size) => ({
      size,
      png: new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng(),
    }))
    writeFileSync(join(OUT, `${name}.ico`), ico(images))
    console.log(`  ${name}.ico`)
  }
  const toast = new Resvg(iconSvg(wings, true), { fitTo: { mode: 'width', value: TOAST_SIZE } }).render()
  writeFileSync(join(OUT, 'toast.png'), toast.asPng())
  console.log('  toast.png')
  const preview = new Resvg(trayPreviewSvg(wings), {
    fitTo: { mode: 'width', value: TRAY_PREVIEW_WIDTH },
  }).render()
  writeFileSync(TRAY_PREVIEW, preview.asPng())
  console.log('  ../docs/screenshots/tray.png')
}

if (import.meta.main) await main()
