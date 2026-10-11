// The bat emblem, after the symbol of The Batman (2022): wide wings set high above the head, their
// upper edges sweeping down to dropped tips, a stepped lower edge, two sharp ears and a short, square
// tail, with a lightly scratched-metal finish. The symbol is DC's trademark; this is a fan project.
// The outline was traced from the film's symbol, simplified, and made exactly symmetric (the left
// half mirrored at x=60), on a 120x48 grid; icons.mts draws the tray and toast icons from it (the tray
// never follows a Theme), and VENGEANCE wears it in the panel, on the disc and on Bat-Clawd's chest.

export const WINGS =
  'M2 20 L4.5 18 L13.5 13.5 L23.5 10 L34 7 L35.5 14 L44 22.5 L46.5 23 L54.5 28.5 L55.5 24.5 ' +
  'L57.5 20 L58.5 25.5 L60 26 L61.5 25.5 L62.5 20 L64.5 24.5 L65.5 28.5 L73.5 23 L76 22.5 ' +
  'L84.5 14 L86 7 L96.5 10 L106.5 13.5 L115.5 18 L118 20 L118 21.5 L111.5 19.5 L101.5 22.5 ' +
  'L97 24.5 L94 31 L78 32 L73 34.5 L64 41 L56 41 L47 34.5 L42 32 L26 31 L23 24.5 L18.5 22.5 ' +
  'L8.5 19.5 L2 21.5 Z'

/** A rectangle on an outline's grid. */
export interface Box {
  x: number
  y: number
  width: number
  height: number
}

/**
 * A Theme's emblem: its outline, on whatever grid it was traced on; where the outline lies on that
 * grid; and its finish ("wear" is VENGEANCE's scratched metal, "none" a plain fill).
 */
export interface Emblem {
  path: string
  bat: Box
  finish: 'wear' | 'none'
}

/** An emblem from its outline, its box read from the outline's points so a re-trace can't leave it behind. */
export function emblem(path: string, finish: Emblem['finish']): Emblem {
  const points = [...path.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)]
  const xs = points.map((m) => Number(m[1]))
  const ys = points.map((m) => Number(m[2]))
  const bat = {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  }
  return { path, bat, finish }
}
