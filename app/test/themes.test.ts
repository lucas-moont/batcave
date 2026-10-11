import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { THEME_IDS, THEMES } from '../src/shared/themes'

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
})
