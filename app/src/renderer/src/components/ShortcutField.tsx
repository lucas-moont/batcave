// The global shortcut in the settings sheet: its keys, and a click to record new ones. While
// recording, the main process lets the current shortcut go, so its keys reach this page.
import { useEffect, useEffectEvent, useState } from 'react'
import { acceleratorFromKey, keycaps, type ShortcutProblem } from '@shared/accelerator'
import type { ShortcutStatus } from '@shared/status'
import { batSignal } from '../bridge'
import { useWords } from '../words'
import { SettingRow } from './SettingRow'

export function ShortcutField({
  status,
  onChange,
}: {
  status: ShortcutStatus
  onChange: (shortcut: string) => void
}) {
  const say = useWords().voice.shortcut
  // null while not recording; while recording, what was wrong with the last keys ('none' if nothing).
  const [problem, setProblem] = useState<ShortcutProblem | 'none' | null>(null)
  const recording = problem !== null
  // The sheet re-renders with every snapshot: recording must not restart (and let the shortcut
  // go and come back) each time.
  const commit = useEffectEvent(onChange)

  useEffect(() => {
    if (!recording) return
    batSignal.recordShortcut(true)
    // Capture, before the sheet's own keys (Esc closes it) and before anything else on the page.
    const onKey = (e: KeyboardEvent) => {
      // Tab leaves, as it leaves any field: keyboard users move on instead of being held here.
      if (e.code === 'Tab') return setProblem(null)
      e.preventDefault()
      e.stopPropagation()
      const recorded = acceleratorFromKey(e)
      if (recorded.kind === 'partial') return
      if (recorded.kind === 'invalid') return setProblem(recorded.problem)
      if (recorded.kind === 'ok') commit(recorded.accelerator)
      if (recorded.kind === 'clear') commit('')
      setProblem(null)
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => {
      window.removeEventListener('keydown', onKey, { capture: true })
      batSignal.recordShortcut(false)
    }
  }, [recording])

  const word = recording ? say.pressKeys : status.accelerator ? '' : say.off
  return (
    <SettingRow
      label={say.label}
      hint={
        recording ? (problem === 'none' ? say.recordingHint : say.problem(problem)) : say.hint[status.state]
      }
      warn={!recording && status.state === 'taken'}
    >
      <button
        className={`shortcut__keys${recording ? ' shortcut__keys--recording' : ''}`}
        onClick={() => setProblem('none')}
        onBlur={() => setProblem(null)}
        aria-label={recording ? say.record : say.change}
      >
        {word ? (
          <span className="shortcut__word">{word}</span>
        ) : (
          keycaps(status.accelerator).map((key) => (
            <kbd key={key} className="chip">
              {key}
            </kbd>
          ))
        )}
      </button>
    </SettingRow>
  )
}
