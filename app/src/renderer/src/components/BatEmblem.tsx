// The bat emblem, after the symbol of The Batman (2022): wide wings set high above the head, their
// upper edges sweeping down to dropped tips, a stepped lower edge, two sharp ears and a short, square
// tail, with a lightly scratched-metal finish. The symbol is DC's trademark; this is a fan project.
// The outline was traced from the film's symbol, simplified, and made exactly symmetric (the left
// half mirrored at x=60), on a 120x48 grid; icons.mts draws the tray and toast icons from it, and
// Bat-Clawd wears it on his chest, all three plain: the scratches are this component's alone.

import { useId } from 'react'
import type { ThemeId } from '@shared/themes'
import { PRODUCT } from '@shared/words'
import { useTheme } from '../theme'

export const WINGS =
  'M2 20 L4.5 18 L13.5 13.5 L23.5 10 L34 7 L35.5 14 L44 22.5 L46.5 23 L54.5 28.5 L55.5 24.5 ' +
  'L57.5 20 L58.5 25.5 L60 26 L61.5 25.5 L62.5 20 L64.5 24.5 L65.5 28.5 L73.5 23 L76 22.5 ' +
  'L84.5 14 L86 7 L96.5 10 L106.5 13.5 L115.5 18 L118 20 L118 21.5 L111.5 19.5 L101.5 22.5 ' +
  'L97 24.5 L94 31 L78 32 L73 34.5 L64 41 L56 41 L47 34.5 L42 32 L26 31 L23 24.5 L18.5 22.5 ' +
  'L8.5 19.5 L2 21.5 Z'

/**
 * A Theme's emblem: its outline, on whatever grid it was traced on, and its finish. "wear" is
 * VENGEANCE's scratched metal; "none" is a plain fill. The tray's and toasts' icons are always
 * VENGEANCE's (icons.mts reads WINGS above), since the tray never follows a Theme.
 */
export interface Emblem {
  path: string
  finish: 'wear' | 'none'
}

const EMBLEMS: Record<ThemeId, Emblem> = {
  'the-batman-2022': { path: WINGS, finish: 'wear' },
}

/** The worn Theme's emblem. */
export const useEmblem = (): Emblem => EMBLEMS[useTheme()]

interface Box {
  x: number
  y: number
  width: number
  height: number
}

const bounds = new Map<string, Box>()
/** Where an outline lies on its grid, read from its points, so a re-trace can't leave it behind. */
function boundsOf(path: string): Box {
  let box = bounds.get(path)
  if (!box) {
    const points = [...path.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)]
    const xs = points.map((m) => Number(m[1]))
    const ys = points.map((m) => Number(m[2]))
    box = {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    }
    bounds.set(path, box)
  }
  return box
}

/** An SVG transform that draws an outline `width` units wide, centred on (cx, cy). */
export function batAt(path: string, cx: number, cy: number, width: number): string {
  const bat = boundsOf(path)
  const k = width / bat.width
  return `translate(${cx - (bat.x + bat.width / 2) * k} ${cy - (bat.y + bat.height / 2) * k}) scale(${k})`
}

export function BatEmblem({
  size = 40,
  title,
  fill = 'var(--signal)',
}: {
  size?: number
  /** What a screen reader says; the product's name unless given ("" for a decorative one). */
  title?: string
  fill?: string
}) {
  const { path, finish } = useEmblem()
  const bat = boundsOf(path)
  // The box around the bat, with a unit of air on every side: the size a place gives is the bat's.
  const box = { x: bat.x - 1, y: bat.y - 1, width: bat.width + 2, height: bat.height + 2 }
  // Its own filter id: one shared by every emblem resolves to whichever comes first on the page.
  const wear = useId()
  return (
    <svg
      width={size}
      height={(size * box.height) / box.width}
      viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
      role="img"
      aria-label={title ?? PRODUCT}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {finish === 'wear' && (
        <defs>
          {/* Fine noise dims the fill in streaks that read as wear and scratches, never cut through. */}
          <filter id={wear} x="0" y="0" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="1.4 0.25"
              numOctaves="2"
              seed="7"
              result="noise"
            />
            <feColorMatrix
              in="noise"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -6 4.6"
              result="mask"
            />
            {/* A scratch keeps 62.5% of the bat: worn, not holed. */}
            <feComponentTransfer in="mask" result="wear">
              <feFuncA type="linear" slope="0.375" intercept="0.625" />
            </feComponentTransfer>
            <feComposite in="SourceGraphic" in2="wear" operator="in" />
          </filter>
        </defs>
      )}
      <path d={path} fill={fill} filter={finish === 'wear' ? `url(#${wear})` : undefined} />
    </svg>
  )
}
