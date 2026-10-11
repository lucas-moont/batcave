// The watch strip: Bat-Signal left in the corner to follow the active sessions. One row per case,
// the most urgent first; a click on a row goes to that session's terminal.
import { useLayoutEffect, useMemo, useRef } from 'react'
import type { PanelLayout } from '@shared/settings'
import type { AttentionItem, SessionSnapshot } from '@shared/types'
import { orderCases, watchRow, type WatchRow } from '@shared/view'
import { batSignal } from '../bridge'
import { useWords } from '../words'
import { BatEmblem } from './BatEmblem'
import { Icon } from './Icon'
import { useTerminalJump } from './TerminalButton'
import './Cards.css'
import './WatchStrip.css'

export function WatchStrip({
  sessions,
  attention,
  layout,
}: {
  sessions: SessionSnapshot[]
  attention: AttentionItem[]
  layout: PanelLayout
}) {
  // The window is as tall as the strip asks: the bar plus the rows at their natural height (the
  // main process caps it, and the rows scroll past the cap), plus the frame's two border pixels.
  const bar = useRef<HTMLElement>(null)
  const content = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const [top, body] = [bar.current, content.current]
    if (!top || !body) return
    let sent = 0
    const send = () => {
      const height = Math.ceil(top.getBoundingClientRect().height + body.getBoundingClientRect().height) + 2
      if (height !== sent) batSignal.setWatchHeight((sent = height)) // the window resize echoes back
    }
    // Measured at once, before the window shows: the main process holds the strip back until
    // this first height arrives (so `sent` starts at 0 on every mount), and a hidden window may
    // not run the observer.
    send()
    const observer = new ResizeObserver(send)
    observer.observe(top)
    observer.observe(body)
    return () => observer.disconnect()
  }, [])

  const words = useWords()
  const { terms, voice } = words
  // The same count as the panel header's badge: everything that needs you.
  const needsYou = attention.length
  // Snapshots arrive up to ten times a second while sessions work: derive the rows once each.
  const rows = useMemo(
    () =>
      orderCases(sessions, attention).map((s) => ({ id: s.sessionId, row: watchRow(s, attention, words) })),
    [sessions, attention, words],
  )

  return (
    <main className={`watch watch--${layout}`}>
      <header ref={bar} className="watch__bar">
        <BatEmblem size={28} />
        <h1 className="watch__name">{voice.product}</h1>
        {needsYou > 0 && <span className="watch__count">{terms.needsYou.count(needsYou)}</span>}
        <nav className="watch__actions">
          <button
            className="icon-button"
            onClick={() => batSignal.setMode('panel')}
            aria-label={voice.watch.openPanel}
            title={voice.watch.openPanel}
          >
            <Icon name="expand" />
          </button>
          <button
            className="icon-button"
            onClick={() => batSignal.setMode('signal')}
            aria-label={voice.chrome.toDisc}
            title={voice.chrome.toDisc}
          >
            <Icon name="fold" />
          </button>
        </nav>
      </header>
      <div className="watch__scroll">
        <div ref={content}>
          {sessions.length === 0 ? (
            <p className="watch__nil">{voice.watch.nil(terms)}</p>
          ) : (
            <ul className="watch__rows">
              {rows.map(({ id, row }) => (
                <Row key={id} sessionId={id} row={row} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}

function Row({ sessionId, row }: { sessionId: string; row: WatchRow }) {
  const { voice } = useWords()
  const { go, busy, copied, warm } = useTerminalJump(sessionId)
  return (
    <li>
      <button
        className={`watch-row watch-row--${row.tone}`}
        onClick={go}
        onPointerEnter={warm}
        onFocus={warm}
        aria-busy={busy}
        title={voice.terminal.go}
      >
        <span className="watch-row__stamp stamp">{row.stamp}</span>
        <span className="watch-row__title">{row.title}</span>
        {row.progress && <span className="watch-row__progress">{row.progress}</span>}
        {(copied || row.line) && (
          <span className="watch-row__line" role={copied ? 'status' : undefined}>
            {copied ? voice.terminal.copied : row.line}
          </span>
        )}
      </button>
    </li>
  )
}
