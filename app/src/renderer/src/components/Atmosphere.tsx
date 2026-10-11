// Rain, film grain and a low street-light haze behind everything, in the Theme's colors.
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import './Atmosphere.css'

const FPS = 15
const DROPS_PER_1000PX2 = 0.32
const ANGLE = 0.26 // radians from vertical, wind from the left
// Drops come in three depths; each depth is stroked as a single path per frame.
const LAYER_ALPHA = [0.06, 0.1, 0.16]

interface Drop {
  x: number
  y: number
  len: number
  speed: number
  layer: number
}

function Rain() {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = canvas.current
    const ctx = el?.getContext('2d')
    if (!el || !ctx) return
    let drops: Drop[] = []
    let width = 0
    let height = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    let frame = 0
    let last = performance.now()
    const slant = Math.tan(ANGLE)
    const dx = Math.sin(ANGLE)
    const dy = Math.cos(ANGLE)

    const spawn = (anywhere: boolean): Drop => {
      const layer = Math.floor(Math.random() * LAYER_ALPHA.length)
      return {
        x: Math.random() * (width + height * slant) - height * slant,
        y: anywhere ? Math.random() * height : -20,
        len: 8 + layer * 5 + Math.random() * 6,
        speed: 380 + layer * 110 + Math.random() * 80,
        layer,
      }
    }

    // A canvas can't read CSS variables: it takes the Theme's rain color as a value. An empty one
    // (no Theme on the page) keeps the last, rather than the canvas's default black on black.
    const recolor = () => {
      const rain = getComputedStyle(el).getPropertyValue('--rain').trim()
      if (rain) ctx.strokeStyle = rain
    }

    const resize = () => {
      ;({ width, height } = el.getBoundingClientRect())
      el.width = Math.round(width * devicePixelRatio)
      el.height = Math.round(height * devicePixelRatio)
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
      ctx.lineWidth = 1
      // Resizing the canvas resets its stroke, like the line width.
      recolor()
      const count = Math.round(((width * height) / 1000) * DROPS_PER_1000PX2)
      drops = Array.from({ length: count }, () => spawn(true))
    }

    const draw = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      ctx.clearRect(0, 0, width, height)
      for (let layer = 0; layer < LAYER_ALPHA.length; layer++) {
        ctx.globalAlpha = LAYER_ALPHA[layer]!
        ctx.beginPath()
        for (let i = 0; i < drops.length; i++) {
          const d = drops[i]!
          if (d.layer !== layer) continue
          d.y += d.speed * dt
          d.x += d.speed * dt * slant
          if (d.y - d.len > height) {
            drops[i] = spawn(false)
            continue
          }
          ctx.moveTo(d.x, d.y)
          ctx.lineTo(d.x - dx * d.len, d.y - dy * d.len)
        }
        ctx.stroke()
      }
      schedule()
    }

    // A timer instead of a 60Hz animation loop: the page only wakes up FPS times a second.
    const schedule = () => {
      timer = setTimeout(() => (frame = requestAnimationFrame(draw)), 1000 / FPS)
    }
    const stop = () => {
      clearTimeout(timer)
      cancelAnimationFrame(frame)
    }
    // Stop entirely while the window is hidden or in the tray.
    const onVisibility = () => {
      stop()
      if (!document.hidden) {
        last = performance.now()
        schedule()
      }
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(el)
    // A new Theme on the page brings its own rain: read it once the page wears it.
    const themes = new MutationObserver(recolor)
    themes.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    document.addEventListener('visibilitychange', onVisibility)
    schedule()
    return () => {
      stop()
      observer.disconnect()
      themes.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return <canvas ref={canvas} className="atmosphere__rain" aria-hidden />
}

/** How long rain keeps falling after the pointer leaves or something changes. */
const LINGER_MS = 8000

/**
 * Rain falls while you are looking (pointer over the window) and for a few seconds after
 * `activity` changes, then stops: a canvas redrawn 15 times a second costs ~5% of a core,
 * which a window parked in a corner shouldn't pay all day.
 */
function useRainVisible(enabled: boolean, activity: unknown): boolean {
  const [hovering, setHovering] = useState(false)
  const [lingering, setLingering] = useState(true)

  useEffect(() => {
    const root = document.documentElement
    const enter = () => setHovering(true)
    const leave = () => setHovering(false)
    root.addEventListener('pointerenter', enter)
    root.addEventListener('pointerleave', leave)
    return () => {
      root.removeEventListener('pointerenter', enter)
      root.removeEventListener('pointerleave', leave)
    }
  }, [])

  // New activity, or the pointer just left: keep raining a little longer. Adjusted during
  // render (React's pattern for reacting to a changed input) rather than in an effect.
  const [seen, setSeen] = useState({ activity, hovering })
  if (seen.activity !== activity || seen.hovering !== hovering) {
    setSeen({ activity, hovering })
    setLingering(true)
  }

  useEffect(() => {
    if (!lingering) return
    const timer = setTimeout(() => setLingering(false), LINGER_MS)
    return () => clearTimeout(timer)
  }, [lingering, seen])

  return enabled && (hovering || lingering)
}

export function Atmosphere({ rain, activity }: { rain: boolean; activity: unknown }) {
  const raining = useRainVisible(rain, activity)
  return (
    <div className="atmosphere" aria-hidden>
      <div className="atmosphere__glow" />
      <AnimatePresence>
        {raining && (
          <motion.div
            key="rain"
            className="atmosphere__layer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
          >
            <Rain />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="atmosphere__grain" />
    </div>
  )
}
