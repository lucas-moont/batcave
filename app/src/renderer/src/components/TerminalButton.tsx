// Goes to a session's terminal: brings its window and tab to the front, or copies the command
// that resumes it when no window hosts it.
import { useEffect, useRef, useState } from 'react'
import { batSignal } from '../bridge'
import { useWords } from '../words'
import { Icon } from './Icon'

/** How long "Resume command copied" stays up. */
const NOTE_MS = 2600

/** The jump itself, for anything that acts as a terminal button (a button, a watch strip row). */
export function useTerminalJump(sessionId: string) {
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const go = async () => {
    if (busy) return
    setBusy(true)
    const outcome = await batSignal
      .goToTerminal(sessionId)
      .catch(() => undefined) // the main process went away mid-request: nothing to report
      .finally(() => setBusy(false))
    if (outcome !== 'copied') return
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), NOTE_MS)
  }

  return { go, busy, copied, warm: batSignal.warmTerminal }
}

export function TerminalButton({
  sessionId,
  label,
  className = '',
}: {
  sessionId: string
  /** Show a word next to the icon (the case detail has room for one). */
  label?: string
  className?: string
}) {
  const { voice } = useWords()
  const { go, busy, copied, warm } = useTerminalJump(sessionId)
  return (
    <span className={`terminal-button ${className}`}>
      <button
        className={`icon-button${label ? ' icon-button--labelled' : ''}`}
        onPointerEnter={warm}
        onFocus={warm}
        onClick={go}
        aria-busy={busy}
        aria-label={voice.terminal.go}
        title={voice.terminal.go}
      >
        <Icon name="terminal" />
        {label && <span>{label}</span>}
      </button>
      {copied && (
        <span className="terminal-button__note" role="status">
          {voice.terminal.copied}
        </span>
      )}
    </span>
  )
}
