// Bat-Clawd: Claude Code's orange pixel Clawd in a Batman cowl and cape, drawn on a 16x11
// pixel grid.
//
// Animated like a flip-book: each mood has finished poses, and a slow shared clock (see
// ticker.ts) picks the pose and the wrapper position a few times a second. Between ticks
// nothing animates at all, so the mascot costs almost nothing while its cape flutters, it
// blinks or it breathes; CSS loops would keep the compositor busy at 60fps.
import { useEffect, useRef, useState } from 'react'
import type { MascotMood } from '@shared/view'
import { batAt, WINGS } from './BatEmblem'
import { useIsCalm } from '../calm'
import { useWords } from '../words'
import { useFrame, useLiveStyle } from '../ticker'
import './BatClawd.css'

type Px = [x: number, y: number, w?: number, h?: number]

const BODY: Px[] = [[3, 3, 10, 6]] // head and body, the cowl covers the top rows
const ARMS: Px[] = [
  [1, 6, 2, 1],
  [13, 6, 2, 1],
]
const LEGS: Px[] = [
  [4, 9, 1, 2],
  [6, 9, 1, 2],
  [9, 9, 1, 2],
  [11, 9, 1, 2],
]
/** Sitting, only the hands holding the wrapped cape shut and the feet show. */
const HANDS: Px[] = [
  [6.9, 7.6, 1, 0.8],
  [8.1, 7.6, 1, 0.8],
]
const FEET: Px[] = [
  [4.5, 10.2, 2, 0.8],
  [9.5, 10.2, 2, 0.8],
]
/** The cowl's outline (ears, crown and sides) as one shape, for its red edge. */
const COWL_EDGE = 'M3 5 L3 2 L4 2 L4 0 L5 0 L5 1 L11 1 L11 0 L12 0 L12 2 L13 2 L13 5 Z'
const COWL: Px[] = [
  [4, 0, 1, 1], // left ear tip
  [11, 0, 1, 1], // right ear tip
  [4, 1, 8, 1],
  [3, 2, 10, 3], // over the eyes, down to the cheekbones
]
const COWL_SHINE: Px[] = [[5, 1, 2, 1]]
/** The bat emblem across the chest, between the cowl and the legs. */
const CHEST = batAt(8, 7, 7)
const EYES_OPEN: Px[] = [
  [5, 3, 2, 1],
  [9, 3, 2, 1],
]
const EYES_SHUT: Px[] = [
  [5, 3.6, 2, 0.3],
  [9, 3.6, 2, 0.3],
]
// The cape hangs from the shoulders (y = 5) and ends in a jagged, bat-like hem.
const CAPE = {
  /** Closed around the body, in front of it: asleep. */
  wrapped: 'M2.6 6.4 L13.4 6.4 L14.2 10.4 L12.2 9.9 L10 10.5 L8 10 L6 10.5 L3.8 9.9 L1.8 10.4 Z',
  /** Streaming back while flying, in two frames of the same flutter. */
  trailA: 'M3 5 L13 5 L13.4 9.2 L11 10.4 L7 10 L3 10.8 L-1 10 L-4.6 10.8 L-3.6 8.8 L-5.6 7.4 L-1.4 6.6 Z',
  trailB:
    'M3 5 L13 5 L13.6 8.6 L11.2 10 L7.2 10.6 L3.2 10.2 L-0.6 10.9 L-4.2 9.6 L-3 8.2 L-5 5.8 L-1.2 5.9 Z',
  /** Flung back and hanging open (left half; mirrored for the right), black inside too. */
  openLeft: 'M3.4 5 L0.2 5.2 L-2.8 11.2 L-1.2 10.5 L0.4 11.3 L1.9 10.6 L3.4 11.2 Z',
  /**
   * A red thread following the jagged hem a step above it, with black between: far enough from
   * the edge to read on its own at the header's size.
   */
  threadLeft: 'M-2 10.1 L-1.1 9.5 L0.4 10.2 L1.9 9.6 L3.4 10.1',
} as const

type CapeStyle = 'wrapped' | 'trailA' | 'trailB' | 'open'

interface Pose {
  cape: CapeStyle
  eyes: 'open' | 'shut'
  eyeColor: string
}

/** Each mood's poses; the first is the resting one. */
type Poses = readonly [Pose, ...Pose[]]

const POSES: Record<MascotMood, Poses> = {
  sleeping: [{ cape: 'wrapped', eyes: 'shut', eyeColor: 'var(--clawd-eye)' }],
  flying: [
    { cape: 'trailA', eyes: 'open', eyeColor: 'var(--clawd-eye)' },
    { cape: 'trailB', eyes: 'open', eyeColor: 'var(--clawd-eye)' },
  ],
  alarmed: [
    { cape: 'open', eyes: 'open', eyeColor: 'var(--clawd-eye)' },
    { cape: 'open', eyes: 'open', eyeColor: 'var(--clawd-eye-dim)' },
  ],
}

const rects = (pixels: Px[]) =>
  pixels.map(([x, y, w = 1, h = 1]) => <rect key={`${x},${y}`} x={x} y={y} width={w} height={h} />)

const MIRROR = 'translate(16 0) scale(-1 1)'

/** The cape behind the body (flying, alarmed); the wrapped cape is drawn in front instead. */
function CapeBehind({ style }: { style: CapeStyle }) {
  if (style === 'wrapped') return null
  if (style !== 'open') return <path className="clawd__cape" d={CAPE[style]} />
  return (
    <>
      {[undefined, MIRROR].map((transform) => (
        <g key={transform ?? 'left'} transform={transform}>
          <path className="clawd__cape" d={CAPE.openLeft} />
          <path className="clawd__thread" d={CAPE.threadLeft} />
        </g>
      ))}
    </>
  )
}

function Frame({ pose, gaze, className }: { pose: Pose; gaze: { x: number; y: number }; className: string }) {
  const wrapped = pose.cape === 'wrapped'
  return (
    <svg className={className} viewBox="-6 -1 28 13" shapeRendering="crispEdges" aria-hidden>
      <CapeBehind style={pose.cape} />
      {/* Behind the face, so only the outer edge of the black cowl shows on the black window. */}
      <path className="clawd__cowl-edge" d={COWL_EDGE} />
      <g fill="var(--clawd)">{rects(wrapped ? BODY : [...BODY, ...ARMS])}</g>
      <g fill="var(--clawd-shade)">{rects(wrapped ? FEET : LEGS)}</g>
      {/* Smooth, not pixel-snapped: at this size the snapped outline breaks into blocks. */}
      {!wrapped && (
        <path className="clawd__emblem" d={WINGS} transform={CHEST} shapeRendering="geometricPrecision" />
      )}
      {wrapped && (
        <>
          <path className="clawd__cape" d={CAPE.wrapped} />
          <rect className="clawd__seam" x={7.85} y={8.4} width={0.3} height={1.6} />
          <g fill="var(--clawd)">{rects(HANDS)}</g>
        </>
      )}
      <g fill="var(--cowl)">{rects(COWL)}</g>
      <g fill="var(--cowl-shine)">{rects(COWL_SHINE)}</g>
      <g fill={pose.eyeColor} transform={`translate(${gaze.x} ${gaze.y})`}>
        {rects(pose.eyes === 'open' ? EYES_OPEN : EYES_SHUT)}
      </g>
    </svg>
  )
}

/** Sleeping breath, in px: a slow rise and fall, one step every half second. */
const BREATH = [0, 0, -0.5, -1, -1, -0.5]
const BREATH_STEP_MS = 500
const BOB = [0, -1, -2, -1]

/** Each mood's flip-book: which pose to show and where to put it on a given frame. */
const MOTION: Record<MascotMood, (frame: number, poses: Poses) => { pose: Pose; transform: string }> = {
  // Sitting still, wrapped in the cape; the breath is written straight to the element.
  sleeping: (_f, [a]) => ({ pose: a, transform: '' }),
  // The cape flutters between two frames while the body bobs.
  flying: (f, [a, b = a]) => ({
    pose: f % 2 ? b : a,
    transform: `translateY(${BOB[(f >> 1) % BOB.length]}px)`,
  }),
  // The cape flung open, eyes that blink every so often, and a shiver.
  alarmed: (f, [a, b = a]) => ({
    pose: f % 10 === 9 ? b : a,
    transform: `translateX(${f % 2 ? 0.6 : -0.6}px)`,
  }),
}

/** How far the eyes may slide toward the pointer, in grid units. */
const GAZE = 0.6
/**
 * On watch from the rooftop, one step a second: mostly still, then a gust lifts the cape and he
 * glances along the street. Every change redraws the perch's transparent window, so there are
 * four in twelve seconds rather than one a second.
 */
const STILL = { gust: false, look: 0 }
const WATCH: { gust: boolean; look: number }[] = [
  ...Array.from({ length: 6 }, () => STILL),
  { gust: true, look: 0 },
  STILL,
  { gust: false, look: -GAZE },
  { gust: false, look: -GAZE },
  STILL,
  STILL,
]

export function BatClawd({
  mood,
  size = 60,
  perched = false,
}: {
  mood: MascotMood
  size?: number
  /** Standing watch on the edge of the watch strip: the cape in the wind, the eyes sweeping. */
  perched?: boolean
}) {
  const calm = useIsCalm()
  const said = useWords().voice.mascot
  const ref = useRef<HTMLSpanElement>(null)
  const [gaze, setGaze] = useState({ x: 0, y: 0 })
  const [hopping, setHopping] = useState(false)

  // Eyes follow the pointer while awake. Event-driven, so it costs nothing when the pointer rests.
  useEffect(() => {
    if (mood === 'sleeping' || calm || perched) return // the perch takes no pointer
    let frame = 0
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const box = ref.current?.getBoundingClientRect()
        if (!box) return
        const dx = e.clientX - (box.left + box.width / 2)
        const dy = e.clientY - (box.top + box.height / 2)
        const len = Math.hypot(dx, dy) || 1
        const x = Math.round((dx / len) * GAZE * 10) / 10
        const y = Math.round((dy / len) * GAZE * 5) / 10
        // Same rounded gaze: keep the old object so React skips the render.
        setGaze((prev) => (prev.x === x && prev.y === y ? prev : { x, y }))
      })
    }
    window.addEventListener('pointermove', onMove)
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(frame)
    }
  }, [mood, calm, perched])

  // On the perch he keeps watch whatever happens, until something needs you.
  const watching = perched && mood !== 'alarmed'
  // Pixel-art pace: awake moods move at 4 frames a second. On the perch, a transparent window that
  // costs more to redraw, the watch steps once a second (and mostly stands still) and an alarm twice.
  const frame = useFrame(!calm && (watching || mood !== 'sleeping'), watching ? 8 : perched ? 4 : 2)
  const step = WATCH[frame % WATCH.length] ?? STILL
  const { pose, transform } = watching
    ? { pose: (step.gust ? POSES.flying[1] : undefined) ?? POSES.flying[0], transform: '' }
    : MOTION[mood](frame, POSES[mood])
  // Still eyes when calm or asleep; on the perch they follow the watch, otherwise the pointer.
  const stillEyes = calm || (!watching && mood === 'sleeping')
  const eyes = stillEyes ? { x: 0, y: 0 } : watching ? { x: step.look, y: 0 } : gaze
  // Asleep only the breath changes, so it skips React: the CSS `translate` property composes
  // with the `transform` React sets.
  const mover = useLiveStyle<HTMLSpanElement>(!calm && !perched && mood === 'sleeping', (el, now) => {
    el.style.translate = now === null ? '' : `0 ${BREATH[Math.floor(now / BREATH_STEP_MS) % BREATH.length]}px`
  })

  return (
    <span
      ref={ref}
      role="img"
      aria-label={watching ? said.watching : said[mood]}
      className={`clawd${hopping ? ' clawd--hop' : ''}`}
      style={{ width: size, height: (size * 13) / 28 }}
      onClick={() => {
        if (calm || hopping) return
        setHopping(true)
        setTimeout(() => setHopping(false), 700)
      }}
    >
      <span ref={mover} className="clawd__mover" style={{ transform }}>
        <Frame pose={pose} gaze={eyes} className="clawd__frame" />
      </span>
    </span>
  )
}
