// The resting form: a Bat-Signal disc in the corner. News lights it and sends a notice card
// along its beam; a click on either opens the panel.
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { diffNotices, isUrgent, type Notice } from '@shared/notices'
import { advance, emptyQueue, enqueue, NOTICE_MS, silence } from '@shared/noticeQueue'
import type { NoticeLayout } from '@shared/settings'
import type { StoreSnapshot } from '@shared/types'
import { batSignal } from '../bridge'
import { playCue } from '../cues'
import { CalmContext, useCalm } from '../calm'
import { Wearing } from '../theme'
import { useSettings, useSnapshotState, useWindowMode } from '../hooks'
import { useWords } from '../words'
import { mascotMood } from '@shared/view'
import { BatClawd } from './BatClawd'
import { BatEmblem } from './BatEmblem'
import { Glow } from './Live'
import './Cards.css'
import './Signal.css'

/** Pointer travel (px) that turns a press on the disc into a drag instead of a click. */
const DRAG_THRESHOLD = 4

/** The signal takes clicks only while the pointer is over the disc or a card (see window.ts). */
const interactive = {
  onPointerEnter: () => batSignal.setInteractive(true),
  onPointerLeave: () => batSignal.setInteractive(false),
}

/** Turns snapshot changes into the notice card on screen, while the signal is the window showing. */
function useNotices(snapshot: StoreSnapshot, loaded: boolean, listening: boolean) {
  const [queue, setQueue] = useState(emptyQueue)
  const prev = useRef<StoreSnapshot | undefined>(undefined)
  // The notice card is the Signal's: it speaks the Theme's words, where a toast keeps the standard ones.
  const words = useWords()

  // Only a new snapshot can hold news; a change of mode alone must not diff it again.
  const onSnapshot = useEffectEvent((next: StoreSnapshot) => {
    const news = diffNotices(prev.current, next, words)
    prev.current = next
    if (listening && news.length) setQueue((q) => enqueue(q, news, Date.now()))
  })
  useEffect(() => {
    if (loaded) onSnapshot(snapshot) // the empty placeholder is not a state to compare against
  }, [snapshot, loaded])

  // Opening the panel silences the cards: the user is looking at everything already.
  const [wasListening, setWasListening] = useState(listening)
  if (wasListening !== listening) {
    setWasListening(listening)
    if (!listening) setQueue(silence)
  }

  const [hovered, setHovered] = useState(false)
  const showing = queue.showing
  useEffect(() => {
    if (!showing || hovered) return // a card being read stays out
    const timer = setTimeout(
      () => setQueue((q) => advance(q, Date.now())),
      Math.max(0, showing.since + NOTICE_MS - Date.now()),
    )
    return () => clearTimeout(timer)
  }, [showing, hovered])

  return { notice: showing?.notice, setHovered }
}

/**
 * Which way the card opens, once the window has grown for it. Until then the card is held
 * back, so its entrance is never clipped by the small disc window.
 */
function useStagedNotice(notice: Notice | undefined) {
  const [staged, setStaged] = useState<{ key: string; layout: NoticeLayout } | null>(null)
  useEffect(() => {
    if (!notice) return
    let live = true
    void batSignal.setNoticeOut(true).then((layout) => live && setStaged({ key: notice.key, layout }))
    return () => {
      live = false
    }
  }, [notice])
  return staged && notice?.key === staged.key ? staged.layout : null
}

export function Signal() {
  const [snapshot, loaded] = useSnapshotState()
  const [settings, , settingsLoaded] = useSettings()
  // This window is always loaded, so it plays the sounds the main process picks.
  useEffect(() => batSignal.onCue(({ cue, volume }) => playCue(cue, volume)), [])
  const calm = useCalm(settings)
  const mode = useWindowMode()
  const { notice, setHovered } = useNotices(snapshot, loaded, mode === 'signal')
  const layout = useStagedNotice(notice)
  // The side the last card opened on, kept while it leaves.
  const [side, setSide] = useState<NoticeLayout>({ below: false, right: false })
  if (layout && (layout.below !== side.below || layout.right !== side.right)) setSide(layout)

  if (!settingsLoaded) return null

  // In watch mode this window is the perch over the strip: just Bat-Clawd, standing watch.
  if (mode === 'watch') {
    return (
      <Wearing theme={settings.theme}>
        <CalmContext value={calm}>
          <main className="perch">
            <BatClawd mood={mascotMood(snapshot)} size={78} perched />
          </main>
        </CalmContext>
      </Wearing>
    )
  }
  const needsYou = snapshot.attention.length
  const shown = layout ? notice : undefined

  return (
    <Wearing theme={settings.theme}>
      <CalmContext value={calm}>
        <MotionConfig reducedMotion={calm ? 'always' : 'never'}>
          <main
            className={`signal${side.below ? ' signal--below' : ''}${side.right ? ' signal--right' : ''}`}
          >
            {/* One card at a time: the next waits for the last to leave, and the window shrinks
              only when no card follows. */}
            <AnimatePresence
              mode="wait"
              onExitComplete={() => {
                if (!notice) void batSignal.setNoticeOut(false)
              }}
            >
              {shown && (
                <NoticeCard
                  key={shown.key}
                  notice={shown}
                  onOpen={() => batSignal.setMode('panel', shown.sessionId)}
                  onHover={setHovered}
                />
              )}
            </AnimatePresence>
            <Disc
              lit={needsYou > 0 || !!notice}
              // Pulsing only while urgent news is out: a pending item can wait for hours, and a
              // transparent window is costly to redraw 8 times a second all that time.
              pulsing={!!shown && isUrgent(shown.kind)}
              count={needsYou}
              onOpen={() => batSignal.reopen()}
            />
          </main>
        </MotionConfig>
      </CalmContext>
    </Wearing>
  )
}

function NoticeCard({
  notice,
  onOpen,
  onHover,
}: {
  notice: Notice
  onOpen: () => void
  onHover: (hovered: boolean) => void
}) {
  const { terms, voice } = useWords()
  // A card can leave under the pointer (clicked, or silenced): no pointerleave comes then.
  useEffect(() => () => onHover(false), [onHover])
  return (
    <motion.div
      className="notice-wrap"
      initial={{ opacity: 0, y: 24, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.96, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
    >
      <span className="notice__beam" aria-hidden />
      <button
        className={`notice${isUrgent(notice.kind) ? ' notice--urgent' : ''}`}
        onClick={onOpen}
        onPointerEnter={() => {
          interactive.onPointerEnter()
          onHover(true)
        }}
        onPointerLeave={() => {
          interactive.onPointerLeave()
          onHover(false)
        }}
        title={voice.signal.openCase(terms)}
      >
        <span className="stamp">{notice.stamp}</span>
        <strong className="notice__title">{notice.title}</strong>
        {notice.line && <span className="notice__line">{notice.line}</span>}
      </button>
    </motion.div>
  )
}

/** The disc: click to open the panel, drag to move it (a drag region would swallow the click). */
function Disc({
  lit,
  pulsing,
  count,
  onOpen,
}: {
  lit: boolean
  pulsing: boolean
  count: number
  onOpen: () => void
}) {
  const { terms, voice } = useWords()
  const press = useRef<{ x: number; y: number } | null>(null)
  const dragged = useRef(false)
  // Pointer moves come far faster than frames: add them up and move the window once a frame.
  const pending = useRef({ dx: 0, dy: 0, frame: 0 })
  const moveBy = (dx: number, dy: number) => {
    const p = pending.current
    p.dx += dx
    p.dy += dy
    p.frame ||= requestAnimationFrame(() => {
      batSignal.moveSignalBy(p.dx, p.dy)
      pending.current = { dx: 0, dy: 0, frame: 0 }
    })
  }
  const release = () => (press.current = null)

  return (
    <button
      className={`disc${lit ? ' disc--lit' : ''}`}
      aria-label={voice.signal.open(terms, count)}
      title={voice.signal.openTip}
      {...interactive}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        press.current = { x: e.screenX, y: e.screenY }
        dragged.current = false
      }}
      onPointerMove={(e) => {
        const p = press.current
        if (!p) return
        const [dx, dy] = [e.screenX - p.x, e.screenY - p.y]
        if (!dragged.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
        dragged.current = true
        moveBy(dx, dy)
        press.current = { x: e.screenX, y: e.screenY }
      }}
      onPointerUp={release}
      // A press the system cancels (Alt+Tab, a dialog) must not leave the disc following the pointer.
      onPointerCancel={release}
      onLostPointerCapture={release}
      onClick={() => {
        if (!dragged.current) onOpen()
      }}
    >
      {pulsing ? <Glow className="disc__halo" /> : <span className="disc__halo" aria-hidden />}
      <span className="disc__face">
        <BatEmblem size={44} title="" fill={lit ? 'var(--lens-bat)' : 'var(--raised)'} />
      </span>
      <AnimatePresence>
        {count > 0 && (
          <motion.span
            key={count}
            className="disc__count"
            initial={{ scale: 1.8, opacity: 0, rotate: -14 }}
            animate={{ scale: 1, opacity: 1, rotate: -6 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 520, damping: 22 }}
          >
            {count}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}
