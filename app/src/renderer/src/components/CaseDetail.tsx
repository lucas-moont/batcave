import type { AttentionItem, SessionSnapshot, TaskStatus } from '@shared/types'
import { attentionCopy, caseHeader, plainPreview, relativeTime, taskLabel } from '@shared/view'
import { useWords } from '../words'
import { Icon, type IconName } from './Icon'
import { Section } from './Section'
import { TerminalButton } from './TerminalButton'
import { Beat } from './Live'
import { Typewriter } from './Typewriter'
import './CaseDetail.css'

/** A task's mark in the case: open, under way, done or dropped. */
const TASK_ICON: Record<TaskStatus, IconName> = {
  pending: 'task-pending',
  in_progress: 'task-active',
  completed: 'task-done',
  deleted: 'task-deleted',
}

/** Completed in the last few seconds: gets a one-off flash. */
const justCompleted = (t: { status: string; history: { at: string }[] }): boolean =>
  t.status === 'completed' && Date.now() - Date.parse(t.history.at(-1)?.at ?? '') < 4000

export type SheetTarget = { kind: 'task' | 'subagent' | 'job'; id: string }

/** Whether a drawer's target is still part of the session. */
export function sheetExists(session: SessionSnapshot, { kind, id }: SheetTarget): boolean {
  if (kind === 'task') return session.tasks.some((t) => t.id === id)
  if (kind === 'subagent') return session.subagents.some((a) => a.toolUseId === id)
  return session.background.some((j) => j.id === id)
}

export function CaseDetail({
  session,
  attention,
  now,
  onBack,
  onOpen,
}: {
  session: SessionSnapshot
  attention: AttentionItem[]
  now: Date
  onBack: () => void
  onOpen: (target: SheetTarget) => void
}) {
  const words = useWords()
  const { terms, voice } = words
  const { number, title, progress } = caseHeader(session, words)
  const alerts = attention.filter((a) => a.sessionId === session.sessionId)
  const messages = session.messages.slice(-4)

  return (
    <div className="detail">
      <div className="detail__bar">
        <button className="icon-button" onClick={onBack} aria-label={voice.detail.back}>
          <Icon name="back" />
        </button>
        <div className="detail__heading">
          <span className="case-number">{voice.caseNumber(terms, number)}</span>
          <h2 className="detail__title">{title}</h2>
        </div>
        <TerminalButton sessionId={session.sessionId} labelled className="detail__terminal" />
      </div>

      <div className="detail__body">
        {alerts.map((a) => {
          const { stamp, line } = attentionCopy(a, words)
          return (
            <div key={`${a.kind}:${a.taskId ?? ''}`} className={`alert alert--${a.kind}`}>
              <span className="stamp">{stamp}</span>
              <span className="alert__line">{line}</span>
              <span className="card__time">{relativeTime(a.at, now)}</span>
            </div>
          )
        })}

        {session.tasks.length > 0 && (
          <Section title={voice.detail.tasks} aside={progress?.label}>
            <ul className="rows">
              {session.tasks.map((t) => (
                <li key={t.id}>
                  <button
                    className={`row row--task row--${t.status}${justCompleted(t) ? ' row--just-done' : ''}`}
                    onClick={() => onOpen({ kind: 'task', id: t.id })}
                    // The mark is drawn: the status is said in words for screen readers.
                    aria-label={voice.detail.taskRow(taskLabel(t), terms.task[t.status])}
                  >
                    <Beat beating={t.status === 'in_progress'} strength={0.3} className="row__glyph">
                      <Icon name={TASK_ICON[t.status]} size={14} />
                    </Beat>
                    <span className="row__text">{taskLabel(t)}</span>
                    <Icon name="chevron" size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {session.subagents.length > 0 && (
          <Section
            title={voice.detail.subagents}
            aside={voice.detail.running(session.subagents.filter((a) => a.status === 'running').length)}
          >
            <ul className="rows">
              {session.subagents.map((a) => (
                <li key={a.toolUseId}>
                  <button
                    className={`row row--run row--${a.status}`}
                    onClick={() => onOpen({ kind: 'subagent', id: a.toolUseId })}
                  >
                    <span className="chip">{a.agentType}</span>
                    <span className="row__text">{a.description}</span>
                    <span className="row__state">{terms.run[a.status]}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {session.background.length > 0 && (
          <Section title={voice.detail.background}>
            <ul className="rows">
              {session.background.map((j) => (
                <li key={j.id}>
                  <button
                    className={`row row--run row--${j.status}`}
                    onClick={() => onOpen({ kind: 'job', id: j.id })}
                  >
                    <span className="row__text row__text--mono">{j.description ?? j.command}</span>
                    <span className="row__state">{terms.run[j.status]}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {messages.length > 0 && (
          <Section title={voice.detail.lastWords}>
            <ol className="log">
              {messages.map((m, i) => (
                <li key={`${m.at}:${i}`} className={`log__entry log__entry--${m.role}`}>
                  <span className="log__who">
                    {m.role === 'user' ? voice.speaker.user : voice.speaker.assistant}
                  </span>
                  <span className="log__text">
                    {i === messages.length - 1 ? (
                      <Typewriter text={plainPreview(m.text)} />
                    ) : (
                      plainPreview(m.text)
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </Section>
        )}
      </div>
    </div>
  )
}
