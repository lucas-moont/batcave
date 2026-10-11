// The opening: a searchlight cuts through the dark and the emblem flickers on, like a
// failing neon sign. About 1.4s; a click skips it.
import { useEffect, useState } from 'react'
import { useWords } from '../words'
import { BatEmblem } from './BatEmblem'
import './BatSignalIntro.css'

const DURATION_MS = 1400

// Once per launch: the panel remounts when animations come back on, and the intro must not
// replay then.
let played = false

/** Plays the first time it mounts in this launch, then removes itself. */
export function BatSignalIntro() {
  const { wordmark } = useWords().voice
  const [leaving, setLeaving] = useState(false)
  const [done, setDone] = useState(played)

  // Marked as played only once it ends: StrictMode runs effects twice in development.
  const finish = () => {
    played = true
    setDone(true)
  }

  useEffect(() => {
    if (played) return
    const leave = setTimeout(() => setLeaving(true), DURATION_MS - 300)
    const end = setTimeout(finish, DURATION_MS)
    return () => {
      clearTimeout(leave)
      clearTimeout(end)
    }
  }, [])

  if (done) return null

  return (
    <div className={`intro${leaving ? ' intro--leaving' : ''}`} onClick={finish} role="presentation">
      <div className="intro__beam" />
      <div className="intro__signal">
        <BatEmblem size={120} />
      </div>
      <div className="intro__title">{wordmark}</div>
    </div>
  )
}
