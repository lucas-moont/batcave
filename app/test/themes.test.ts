import { readFileSync } from 'node:fs'
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

describe('a demo page', () => {
  it('wears the Theme its hash names', () => {
    expect(themeFromFlags(new Set(['demo', 'report', 'vengeance']))).toBe('the-batman-2022')
  })

  it('names no Theme without a Theme flag', () => {
    expect(themeFromFlags(new Set(['demo', 'watch', 'report']))).toBeUndefined()
  })
})
