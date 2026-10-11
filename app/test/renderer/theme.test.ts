import { describe, expect, it } from 'vitest'
import { themeFromSearch, wearTheme } from '../../src/renderer/src/theme'

describe('the Theme a page wears', () => {
  it('is the one in its address, as the main process opens a window', () => {
    expect(themeFromSearch('?view=panel&theme=the-batman-2022')).toBe('the-batman-2022')
  })

  // The demo pages and the screenshots open without one; an old or mistyped id must not leave
  // the page with no Theme at all (its colors are scoped to the attribute).
  it('is the default when the address names none, or one it does not know', () => {
    expect(themeFromSearch('?view=signal')).toBe('the-batman-2022')
    expect(themeFromSearch('?theme=arkham')).toBe('the-batman-2022')
  })

  it('is set as an attribute on the page, which scopes its stylesheet', () => {
    const root = { dataset: {} } as HTMLElement
    wearTheme(root, 'the-batman-2022')
    expect(root.dataset.theme).toBe('the-batman-2022')
  })
})
