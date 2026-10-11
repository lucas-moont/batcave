import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { THEME_IDS, themeFromFlags, THEMES } from '../src/shared/themes'

describe('the Themes', () => {
  it('each have one entry, under their own id', () => {
    for (const id of THEME_IDS) expect(THEMES[id].id).toBe(id)
  })

  // The window's background shows before the page paints, then the page's --abyss covers it: a
  // mismatch flashes the wrong color at every opening.
  it("paint the window in their stylesheet's ground", () => {
    for (const id of THEME_IDS) {
      const css = readFileSync(join(__dirname, `../src/renderer/src/styles/themes/${id}.css`), 'utf8')
      expect(/--abyss:\s*([^;]+);/.exec(css)?.[1]?.trim().toLowerCase()).toBe(THEMES[id].ground.toLowerCase())
    }
  })

  // The demo page's hash splits on "-" (#demo-watch-report → demo, watch, report).
  it('each have a one-word demo flag of their own', () => {
    const flags = THEME_IDS.map((id) => THEMES[id].flag)
    for (const flag of flags) expect(flag).toMatch(/^[a-z]+$/)
    expect(new Set(flags).size).toBe(flags.length)
  })
})

// The pages find a Theme's stylesheet and fonts by file name: a missing or misnamed file would
// leave the Theme with no colors or faces, and nothing else would notice.
describe("the Themes' stylesheets and fonts", () => {
  const files = readdirSync(join(__dirname, '../src/renderer/src/styles/themes'))

  it.each(THEME_IDS)('%s has both', (id) => {
    expect(files).toContain(`${id}.css`)
    expect(files).toContain(`${id}.fonts.ts`)
  })

  it('belong to known Themes only', () => {
    const ids = files.flatMap((file) => /^(.+?)(?:.fonts.ts|.css)$/.exec(file)?.[1] ?? [])
    for (const id of ids) expect(THEME_IDS).toContain(id)
  })
})

describe('a demo page', () => {
  it('wears the Theme its hash names', () => {
    expect(themeFromFlags(new Set(['demo', 'report', 'vengeance']))).toBe('the-batman-2022')
  })

  it('names no Theme without a Theme flag', () => {
    expect(themeFromFlags(new Set(['demo', 'watch', 'report']))).toBeUndefined()
  })
})
