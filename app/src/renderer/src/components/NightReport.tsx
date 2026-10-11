// The panel read as tonight's typed case report: what awaits your signature first, then one
// paragraph per case, its stamp in the margin. A case opens in place into margin notes.
import { useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { AttentionItem, SessionSnapshot } from '@shared/types'
import {
  ALERT_INK,
  caseHeader,
  currentTask,
  folderName,
  lastReply,
  orderCases,
  plainPreview,
  relativeTime,
  reportCopy,
  taskLabel,
  TYPED_BOX,
  watchRow,
  type WatchRow,
} from '@shared/view'
import { useWords } from '../words'
import type { SheetTarget } from './CaseDetail'
import type { Tab } from './Header'
import { PluginHint } from './PluginHint'
import { TerminalButton } from './TerminalButton'
import { Typewriter } from './Typewriter'
import './Cards.css'
import './NightReport.css'

/** Last words are quoted, not reprinted: a report keeps to one line of them. */
const QUOTE_CHARS = 150

const caseAnchor = (sessionId: string) => `report-case-${sessionId}`

const quote = (text: string) => {
  const plain = plainPreview(text)
  return plain.length > QUOTE_CHARS ? `${plain.slice(0, QUOTE_CHARS).trimEnd()}…` : plain
}

export function NightReport({
  tab,
  unheard,
  sessions,
  attention,
  now,
  openCase,
  onToggleCase,
  onOpenAlert,
  onOpenSheet,
}: {
  /** Which half of the report: what awaits your signature, or the case notes. */
  tab: Tab
  /** Sessions the plugin does not reach: their requests cannot be reported. */
  unheard: number
  sessions: SessionSnapshot[]
  attention: AttentionItem[]
  now: Date
  /** The case opened in place, if any. */
  openCase: string | null
  onToggleCase: (sessionId: string) => void
  onOpenAlert: (item: AttentionItem) => void
  onOpenSheet: (sessionId: string, target: SheetTarget) => void
}) {
  const words = useWords()
  const { terms, voice } = words
  // A case opened from elsewhere (a notice card, an alert line) is brought into view.
  useEffect(() => {
    if (openCase) document.getElementById(caseAnchor(openCase))?.scrollIntoView({ block: 'start' })
  }, [openCase])

  const { titles, cases } = useMemo(
    () => ({
      titles: new Map(sessions.map((s) => [s.sessionId, caseHeader(s, words).title])),
      cases: orderCases(sessions, attention),
    }),
    [sessions, attention, words],
  )

  return (
    <article className="report">
      <header className="report__dateline">
        <h2 className="report__name">{voice.report.name}</h2>
        <span className="report__date">{voice.report.dateline(now)}</span>
      </header>

      {tab === 'needs' ? (
        <section className="report__section" aria-labelledby="report-signature">
          <h3 id="report-signature" className="report__heading">
            {voice.report.signature}
          </h3>
          {unheard > 0 && <PluginHint sessions={unheard} />}
          {attention.length === 0 ? (
            <p className="report__nil">{unheard > 0 ? voice.report.nilUnheard : voice.report.nil(terms)}</p>
          ) : (
            <ul className="report__lines">
              {attention.map((item) => {
                const { stamp, sentence } = reportCopy(item, words)
                return (
                  <li key={`${item.sessionId}:${item.kind}:${item.taskId ?? ''}`} className="report__line">
                    <button className="entry" onClick={() => onOpenAlert(item)}>
                      <span className="entry__margin">
                        <span className={`stamp stamp--${ALERT_INK[item.kind]}`}>{stamp}</span>
                        <span className="entry__age">{relativeTime(item.at, now)}</span>
                      </span>
                      <span className="entry__body">
                        <strong>{titles.get(item.sessionId) ?? voice.report.unknown(terms)}</strong>{' '}
                        <span className={`pen pen--${ALERT_INK[item.kind]}`}>{sentence}</span>.
                      </span>
                    </button>
                    <TerminalButton sessionId={item.sessionId} className="report__terminal" />
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      ) : (
        <section className="report__section" aria-labelledby="report-cases">
          <h3 id="report-cases" className="report__heading">
            {voice.report.caseNotes(terms)}
          </h3>
          {cases.length === 0 ? (
            <p className="report__nil">{voice.report.noCases(terms)}</p>
          ) : (
            <ol className="report__lines">
              {cases.map((s) => (
                <CaseParagraph
                  key={s.sessionId}
                  session={s}
                  alerts={attention.filter((a) => a.sessionId === s.sessionId)}
                  tone={watchRow(s, attention, words).tone}
                  open={openCase === s.sessionId}
                  onToggle={() => onToggleCase(s.sessionId)}
                  onOpenSheet={(target) => onOpenSheet(s.sessionId, target)}
                />
              ))}
            </ol>
          )}
        </section>
      )}

      <footer className="report__end">{voice.report.end(attention.length)}</footer>
    </article>
  )
}

function CaseParagraph({
  session,
  alerts,
  tone,
  open,
  onToggle,
  onOpenSheet,
}: {
  session: SessionSnapshot
  /** What this case is waiting on, most urgent first. */
  alerts: AttentionItem[]
  tone: WatchRow['tone']
  open: boolean
  onToggle: () => void
  onOpenSheet: (target: SheetTarget) => void
}) {
  const words = useWords()
  const { terms, voice } = words
  const { number, title, progress } = caseHeader(session, words)
  const folder = folderName(session.cwd ?? '')
  const current = currentTask(session)
  const said = lastReply(session)
  const status = alerts.length ? terms.needsYou.label : terms.live[session.status]

  return (
    <li id={caseAnchor(session.sessionId)} className={`case${open ? ' case--open' : ''}`}>
      <button className="entry" onClick={onToggle} aria-expanded={open}>
        <span className="entry__margin">
          {/* Inked like the same case in the watch strip: red only for blocked work. */}
          <span className={`stamp stamp--${tone === 'idle' ? 'quiet' : tone}`}>{status}</span>
        </span>
        {/* Only what a glance needs; the case number, folder and last words wait inside. */}
        <span className="entry__body">
          <strong>{title}.</strong>
          {current && ` ${voice.report.now(taskLabel(current))}`}
          {progress && ` ${voice.report.filed(progress.done, progress.total)}`}
        </span>
      </button>
      {/* An open case has its own, labelled terminal button. */}
      {!open && <TerminalButton sessionId={session.sessionId} className="report__terminal" />}

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="notes"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {alerts.length > 0 && (
              <ul className="notes__alerts">
                {alerts.map((a) => {
                  const { stamp, sentence } = reportCopy(a, words)
                  return (
                    <li key={`${a.kind}:${a.taskId ?? ''}`}>
                      <span className={`stamp stamp--${ALERT_INK[a.kind]}`}>{stamp}</span>{' '}
                      <span className={`pen pen--${ALERT_INK[a.kind]}`}>{sentence}</span>.
                    </li>
                  )
                })}
              </ul>
            )}
            <p className="notes__file">
              {voice.report.file(terms, number, folder)}
              {said && (
                <>
                  {' '}
                  {voice.report.lastWord} “<Typewriter text={quote(said)} />”
                </>
              )}
            </p>
            <TerminalButton
              sessionId={session.sessionId}
              label={voice.detail.terminal}
              className="notes__terminal"
            />
            <Notes session={session} onOpenSheet={onOpenSheet} />
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

function Notes({
  session,
  onOpenSheet,
}: {
  session: SessionSnapshot
  onOpenSheet: (target: SheetTarget) => void
}) {
  const { terms, voice } = useWords()
  const empty = !session.tasks.length && !session.subagents.length && !session.background.length
  if (empty) return <p className="notes__nil">{voice.report.nothingOnFile}</p>
  return (
    <div className="notes__body">
      {session.tasks.length > 0 && (
        <NoteGroup title={voice.detail.tasks}>
          {session.tasks.map((t) => (
            <NoteLine
              key={t.id}
              mark={TYPED_BOX[t.status]}
              done={t.status === 'completed'}
              live={t.status === 'in_progress'}
              onClick={() => onOpenSheet({ kind: 'task', id: t.id })}
            >
              {taskLabel(t)}
            </NoteLine>
          ))}
        </NoteGroup>
      )}
      {session.subagents.length > 0 && (
        <NoteGroup title={voice.detail.subagents}>
          {session.subagents.map((a) => (
            <NoteLine
              key={a.toolUseId}
              mark={a.agentType}
              done={a.status !== 'running'}
              live={a.status === 'running'}
              state={terms.run[a.status]}
              onClick={() => onOpenSheet({ kind: 'subagent', id: a.toolUseId })}
            >
              {a.description}
            </NoteLine>
          ))}
        </NoteGroup>
      )}
      {session.background.length > 0 && (
        <NoteGroup title={voice.detail.background}>
          {session.background.map((j) => (
            <NoteLine
              key={j.id}
              mark="$"
              done={j.status !== 'running'}
              live={j.status === 'running'}
              state={terms.run[j.status]}
              onClick={() => onOpenSheet({ kind: 'job', id: j.id })}
            >
              {j.description ?? j.command}
            </NoteLine>
          ))}
        </NoteGroup>
      )}
    </div>
  )
}

function NoteGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="notes__group">
      <h4 className="notes__title">{title}</h4>
      <ul>{children}</ul>
    </section>
  )
}

function NoteLine({
  mark,
  done,
  live,
  state,
  onClick,
  children,
}: {
  mark: string
  done: boolean
  live: boolean
  state?: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <li>
      <button className={`note${done ? ' note--done' : ''}${live ? ' note--live' : ''}`} onClick={onClick}>
        <span className="note__mark">{mark}</span>
        <span className="note__text">{children}</span>
        {state && <span className="note__state">{state}</span>}
      </button>
    </li>
  )
}
