// The worn Theme's emblem (shared/emblems.ts): in the masthead, on the disc and in the intro,
// with its finish (VENGEANCE's scratched metal); Bat-Clawd wears the same outline on his chest.

import { useId } from 'react'
import type { Emblem } from '@shared/emblems'
import { THEMES } from '@shared/themes'
import { PRODUCT } from '@shared/words'
import { useTheme } from '../theme'

/** The worn Theme's emblem. */
export const useEmblem = (): Emblem => THEMES[useTheme()].emblem

/** An SVG transform that draws an emblem `width` units wide, centred on (cx, cy). */
export function batAt({ bat }: Emblem, cx: number, cy: number, width: number): string {
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
  const { path, bat, finish } = useEmblem()
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
