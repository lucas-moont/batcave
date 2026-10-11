// The bat emblem, after the symbol of The Batman (2022): wide wings set high above the head, their
// upper edges sweeping down to dropped tips, a stepped lower edge, two sharp ears and a short, square
// tail, with a lightly scratched-metal finish. The symbol is DC's trademark; this is a fan project.
// The outline was traced from the film's symbol, simplified, and made exactly symmetric (the left
// half mirrored at x=60), on a 120x48 grid; icons.mts draws the tray and toast icons from it, and
// Bat-Clawd wears it on his chest, all three plain: the scratches are this component's alone.

import { useId } from 'react'
import { PRODUCT } from '@shared/words'

export const WINGS =
  'M2 20 L4.5 18 L13.5 13.5 L23.5 10 L34 7 L35.5 14 L44 22.5 L46.5 23 L54.5 28.5 L55.5 24.5 ' +
  'L57.5 20 L58.5 25.5 L60 26 L61.5 25.5 L62.5 20 L64.5 24.5 L65.5 28.5 L73.5 23 L76 22.5 ' +
  'L84.5 14 L86 7 L96.5 10 L106.5 13.5 L115.5 18 L118 20 L118 21.5 L111.5 19.5 L101.5 22.5 ' +
  'L97 24.5 L94 31 L78 32 L73 34.5 L64 41 L56 41 L47 34.5 L42 32 L26 31 L23 24.5 L18.5 22.5 ' +
  'L8.5 19.5 L2 21.5 Z'

const xs: number[] = []
const ys: number[] = []
for (const [, x, y] of WINGS.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)) {
  xs.push(Number(x))
  ys.push(Number(y))
}
/** Where the bat lies on its grid, read from the outline, so a re-trace can't leave it behind. */
const BAT = {
  x: Math.min(...xs),
  y: Math.min(...ys),
  width: Math.max(...xs) - Math.min(...xs),
  height: Math.max(...ys) - Math.min(...ys),
}
/** The box around the bat, with a unit of air on every side: the size a place gives is the bat's. */
const BOX = { x: BAT.x - 1, y: BAT.y - 1, width: BAT.width + 2, height: BAT.height + 2 }

/** An SVG transform that draws the bat `width` units wide, centred on (cx, cy). */
export function batAt(cx: number, cy: number, width: number): string {
  const k = width / BAT.width
  return `translate(${cx - (BAT.x + BAT.width / 2) * k} ${cy - (BAT.y + BAT.height / 2) * k}) scale(${k})`
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
  // Its own filter id: one shared by every emblem resolves to whichever comes first on the page.
  const wear = useId()
  return (
    <svg
      width={size}
      height={(size * BOX.height) / BOX.width}
      viewBox={`${BOX.x} ${BOX.y} ${BOX.width} ${BOX.height}`}
      role="img"
      aria-label={title ?? PRODUCT}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        {/* Fine noise dims the fill in streaks that read as wear and scratches, never cut through. */}
        <filter id={wear} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="1.4 0.25" numOctaves="2" seed="7" result="noise" />
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
      <path d={WINGS} fill={fill} filter={`url(#${wear})`} />
    </svg>
  )
}
