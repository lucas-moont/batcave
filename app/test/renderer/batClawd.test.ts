import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, describe, expect, it, vi } from 'vitest'
// The shared animation clock listens to the page's visibility as it loads; a hidden page keeps it stopped.
vi.hoisted(() => vi.stubGlobal('document', { hidden: true, addEventListener: () => {} }))
afterAll(() => vi.unstubAllGlobals())

import { BatClawd } from '../../src/renderer/src/components/BatClawd'
import { BatEmblem } from '../../src/renderer/src/components/BatEmblem'
import { WINGS } from '../../src/shared/emblems'

const POINTS = [...WINGS.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => ({
  x: Number(m[1]),
  y: Number(m[2]),
}))

/** Where the chest emblem lands on Bat-Clawd's 16x11 grid, or nothing if he doesn't wear it. */
function chest(markup: string) {
  const path = markup.match(/<path class="clawd__emblem" d="([^"]+)" transform="([^"]+)"/)
  if (!path || path[1] !== WINGS) return undefined
  const [tx = NaN, ty = NaN, k = NaN] = (path[2] ?? '').match(/-?[\d.]+/g)?.map(Number) ?? []
  const xs = POINTS.map((p) => tx + p.x * k)
  const ys = POINTS.map((p) => ty + p.y * k)
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) }
}

/** The bare chest: under the cowl (which ends at row 5), above the legs (row 9), between the arms. */
const onChest = (bat: ReturnType<typeof chest>) =>
  !!bat && bat.left >= 3 && bat.right <= 13 && bat.top >= 5 && bat.bottom <= 9 && bat.right - bat.left >= 6

describe('Bat-Clawd', () => {
  it('wears the bat on his chest whenever it shows', () => {
    for (const props of [
      { mood: 'flying' },
      { mood: 'alarmed' },
      { mood: 'sleeping', perched: true },
    ] as const)
      expect(onChest(chest(renderToStaticMarkup(createElement(BatClawd, props))))).toBe(true)
  })

  it('hides it asleep, under the wrapped cape', () => {
    expect(renderToStaticMarkup(createElement(BatClawd, { mood: 'sleeping' }))).not.toContain('clawd__emblem')
  })
})

describe('BatEmblem', () => {
  it('wears scratches that dim the bat by 37.5%, never cutting through it', () => {
    const markup = renderToStaticMarkup(createElement(BatEmblem))
    const soft = markup.match(
      /<feComponentTransfer in="mask" result="([^"]+)"><feFuncA type="linear" slope="([^"]+)" intercept="([^"]+)"/,
    )
    expect(soft).not.toBeNull()
    const [, result, slope, intercept] = soft ?? []
    // A scratch takes the mask to 0; the floor keeps 62.5% of the bat there, and all of it elsewhere.
    expect([Number(slope), Number(intercept)]).toEqual([0.375, 0.625])
    // One composite, keeping the bat where the floored mask is: the raw, holed mask is not used.
    const composites = [...markup.matchAll(/<feComposite ([^>]*?)\/?>/g)].map((m) => m[1])
    expect(composites).toHaveLength(1)
    expect(composites[0]).toContain('in="SourceGraphic"')
    expect(composites[0]).toContain(`in2="${result}"`)
    expect(composites[0]).toContain('operator="in"')
  })

  it('gives every emblem its own wear filter, so none borrows another one', () => {
    const markup = renderToStaticMarkup(
      createElement('div', null, createElement(BatEmblem), createElement(BatEmblem)),
    )
    const ids = [...markup.matchAll(/<filter id="([^"]+)"/g)].map((m) => m[1])
    const uses = [...markup.matchAll(/filter="url\(#([^)]+)\)"/g)].map((m) => m[1])
    expect(ids).toHaveLength(2)
    expect(new Set(ids).size).toBe(2)
    expect(uses).toEqual(ids)
  })

  it('draws in a box that hugs the bat, so its size is the size of the bat', () => {
    const box = renderToStaticMarkup(createElement(BatEmblem)).match(/viewBox="([^"]+)"/)?.[1] ?? ''
    const [x = NaN, y = NaN, w = NaN, h = NaN] = box.split(' ').map(Number)
    const points = [...WINGS.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => ({
      x: Number(m[1]),
      y: Number(m[2]),
    }))
    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)
    // Every point inside, and no more than 2 units of air on any side.
    expect(Math.min(...xs) - x).toBeGreaterThanOrEqual(0)
    expect(Math.min(...xs) - x).toBeLessThanOrEqual(2)
    expect(x + w - Math.max(...xs)).toBeGreaterThanOrEqual(0)
    expect(x + w - Math.max(...xs)).toBeLessThanOrEqual(2)
    expect(Math.min(...ys) - y).toBeGreaterThanOrEqual(0)
    expect(Math.min(...ys) - y).toBeLessThanOrEqual(2)
    expect(y + h - Math.max(...ys)).toBeGreaterThanOrEqual(0)
    expect(y + h - Math.max(...ys)).toBeLessThanOrEqual(2)
  })
})
