import { useEffect, useId, type ReactNode } from 'react'
import { motion } from 'motion/react'
import {
  everyToast,
  NEWS_GROUPS,
  OPACITY_MAX,
  OPACITY_MIN,
  type AnnouncePrefs,
  type Settings,
  type SettingsPatch,
  toastsOn,
} from '@shared/settings'
import type { AppStatus } from '@shared/status'
import type { BackgroundJob, SessionSnapshot, Subagent, Task } from '@shared/types'
import { ago } from '@shared/view'
import type { Words } from '@shared/words'
import { useWords } from '../words'
import type { SheetTarget } from './CaseDetail'
import { batSignal } from '../bridge'
import { playCue } from '../cues'
import { Icon } from './Icon'
import { Section } from './Section'
import { SettingRow } from './SettingRow'
import { ShortcutField } from './ShortcutField'
import './Sheets.css'

/** A drawer that rises from the bottom over a dimmed backdrop. */
function Sheet({
  title,
  kicker,
  onClose,
  children,
}: {
  title: string
  kicker: string
  onClose: () => void
  children: ReactNode
}) {
  const { voice } = useWords()
  return (
    <div className="sheet-layer" role="dialog" aria-modal aria-label={title}>
      <motion.div
        className="sheet-backdrop"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />
      <motion.div
        className="sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 420, damping: 38 }}
      >
        <div className="sheet__grip" aria-hidden />
        <div className="sheet__head">
          <div className="sheet__titles">
            <span className="case-number">{kicker}</span>
            <h2 className="sheet__title">{title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label={voice.drawer.close}>
            <Icon name="close" />
          </button>
        </div>
        <div className="sheet__body">{children}</div>
      </motion.div>
    </div>
  )
}

function Field({ label, children, mono }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      <div className={`field__value${mono ? ' field__value--mono' : ''}`}>{children}</div>
    </div>
  )
}

function TaskBody({ task, now }: { task: Task; now: Date }) {
  const words = useWords()
  const { terms, voice } = words
  return (
    <>
      {task.description && <Field label={voice.drawer.brief}>{task.description}</Field>}
      {task.activeForm && task.status === 'in_progress' && (
        <Field label={voice.drawer.rightNow}>{task.activeForm}</Field>
      )}
      <Field label={voice.drawer.timeline}>
        <ol className="timeline">
          {[...task.history].reverse().map((h, i) => (
            <li key={`${h.at}:${i}`} className={`timeline__step timeline__step--${h.status}`}>
              <span className="timeline__what">{terms.task[h.status]}</span>
              <span className="card__time">{ago(h.at, now, words)}</span>
            </li>
          ))}
        </ol>
      </Field>
    </>
  )
}

function SubagentBody({ agent, now }: { agent: Subagent; now: Date }) {
  const { voice } = useWords()
  return (
    <>
      <Field label={voice.drawer.type}>
        <span className="chip">{agent.agentType}</span>
      </Field>
      {agent.lastMessage && <Field label={voice.drawer.latestWord}>{agent.lastMessage}</Field>}
      {agent.summary && <Field label={voice.drawer.outcome}>{agent.summary}</Field>}
      {agent.prompt && (
        <Field label={voice.drawer.orders} mono>
          {agent.prompt}
        </Field>
      )}
      <Timing started={agent.startedAt} ended={agent.endedAt} endedAs={voice.drawer.finished} now={now} />
    </>
  )
}

/** "Started 3m ago · finished just now", skipping times that are missing. */
function Timing({
  started,
  ended,
  endedAs,
  now,
}: {
  started: string
  ended?: string
  /** How the end reads: "finished 2m ago", "ended 2m ago". */
  endedAs: (ago: string) => string
  now: Date
}) {
  const words = useWords()
  const startedAgo = ago(started, now, words)
  const endedAgo = ended && ago(ended, now, words)
  const parts = [startedAgo && words.voice.drawer.started(startedAgo), endedAgo && endedAs(endedAgo)].filter(
    Boolean,
  )
  return parts.length ? <Field label={words.voice.drawer.timing}>{parts.join(' · ')}</Field> : null
}

function JobBody({ job, now }: { job: BackgroundJob; now: Date }) {
  const { voice } = useWords()
  return (
    <>
      <Field label={voice.drawer.command} mono>
        {job.command}
      </Field>
      <Timing started={job.startedAt} ended={job.endedAt} endedAs={voice.drawer.ended} now={now} />
    </>
  )
}

interface SheetContent {
  kicker: string
  title: string
  body: ReactNode
}

/** What the drawer shows for a target, or nothing if it is gone from the session. */
function resolve(
  session: SessionSnapshot,
  { kind, id }: SheetTarget,
  now: Date,
  { terms, voice }: Words,
): SheetContent | undefined {
  switch (kind) {
    case 'task': {
      const task = session.tasks.find((t) => t.id === id)
      return (
        task && {
          kicker: voice.drawer.taskKicker(task.id, terms.task[task.status]),
          title: task.subject,
          body: <TaskBody task={task} now={now} />,
        }
      )
    }
    case 'subagent': {
      const agent = session.subagents.find((a) => a.toolUseId === id)
      return (
        agent && {
          kicker: voice.drawer.subagentKicker(terms.run[agent.status]),
          title: agent.description,
          body: <SubagentBody agent={agent} now={now} />,
        }
      )
    }
    case 'job': {
      const job = session.background.find((j) => j.id === id)
      return (
        job && {
          kicker: voice.drawer.backgroundKicker(terms.run[job.status]),
          title: job.description ?? job.command,
          body: <JobBody job={job} now={now} />,
        }
      )
    }
  }
}

/** The drawer for a task, subagent or background command of a session. */
export function DetailSheet({
  session,
  target,
  now,
  onClose,
}: {
  session: SessionSnapshot
  target: SheetTarget
  now: Date
  onClose: () => void
}) {
  const content = resolve(session, target, now, useWords())
  if (!content) return null
  return (
    <Sheet kicker={content.kicker} title={content.title} onClose={onClose}>
      {content.body}
    </Sheet>
  )
}

function Toggle({
  label,
  hint,
  warn,
  on,
  mixed = false,
  onChange,
}: {
  label: string
  hint: string
  warn?: boolean
  on: boolean
  /** Some of what it stands for is on: a switch can't say so, so it is read as a mixed checkbox. */
  mixed?: boolean
  onChange: (on: boolean) => void
}) {
  return (
    <SettingRow as="label" className="toggle" label={label} hint={hint} warn={warn}>
      <input
        type="checkbox"
        role={mixed ? undefined : 'switch'}
        ref={(input) => {
          if (input) input.indeterminate = mixed
        }}
        checked={on}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle__track" aria-hidden />
    </SettingRow>
  )
}

/**
 * One switch for every kind of news below it: on when all are, and a click from any other state
 * turns them all on (from all on, all off). Some on reads as a count, so it is never a mystery.
 */
function AllToasts({
  toast,
  onChange,
}: {
  toast: AnnouncePrefs['toast']
  onChange: (patch: SettingsPatch) => void
}) {
  const { allToasts } = useWords().voice.settings
  const on = toastsOn(toast)
  const all = on === NEWS_GROUPS.length
  return (
    <Toggle
      label={allToasts.label}
      hint={on === 0 || all ? allToasts.hint : allToasts.some(on, NEWS_GROUPS.length)}
      on={all}
      mixed={on > 0 && !all}
      onChange={(next) => onChange(everyToast(next))}
    />
  )
}

/** A value from 0 to 1 set in steps of 5%, shown as a percentage; `children` sit at its end. */
function PercentSlider({
  label,
  min = 0,
  max = 1,
  value,
  onChange,
  children,
}: {
  label: string
  min?: number
  max?: number
  value: number
  onChange: (value: number) => void
  children?: ReactNode
}) {
  const id = useId()
  const percent = Math.round(value * 100)
  return (
    <div className="slider">
      <label className="setting__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={min * 100}
        max={max * 100}
        step={5}
        value={percent}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
      />
      <span className="card__time">{percent}%</span>
      {children}
    </div>
  )
}

export function SettingsSheet({
  settings,
  status,
  onChange,
  onClose,
}: {
  settings: Settings
  status: AppStatus
  onChange: (patch: SettingsPatch) => void
  onClose: () => void
}) {
  // What Windows has may have moved since (Task Manager): read it again as the sheet opens.
  useEffect(() => batSignal.refreshStatus(), [])
  const { terms, voice } = useWords()
  const say = voice.settings
  const blocked = status.startup === 'blocked'
  return (
    <Sheet kicker={say.kicker} title={say.title} onClose={onClose}>
      <div className="settings">
        <Section title={say.look}>
          <Toggle
            {...say.animations}
            on={settings.animations}
            onChange={(animations) => onChange({ animations })}
          />
          <Toggle
            label={say.atmosphere.label}
            hint={say.atmosphere.hint(terms)}
            on={settings.rain}
            onChange={(rain) => onChange({ rain })}
          />
          <Toggle
            {...say.layout}
            on={settings.layout === 'report'}
            onChange={(on) => onChange({ layout: on ? 'report' : 'files' })}
          />
          <Toggle
            {...say.onTop}
            on={settings.alwaysOnTop}
            onChange={(alwaysOnTop) => onChange({ alwaysOnTop })}
          />
          <PercentSlider
            label={say.opacity}
            min={OPACITY_MIN}
            max={OPACITY_MAX}
            value={settings.opacity}
            onChange={(opacity) => onChange({ opacity })}
          />
        </Section>
        <Section title={say.comfort}>
          <ShortcutField status={status.shortcut} onChange={(shortcut) => onChange({ shortcut })} />
          <Toggle
            label={say.startup.label}
            hint={blocked ? say.startup.blocked : say.startup.hint}
            warn={blocked}
            on={status.startup === 'on'}
            onChange={batSignal.setStartWithWindows}
          />
        </Section>
        <Section title={say.notifications}>
          <AllToasts toast={settings.announce.toast} onChange={onChange} />
          <div className="toggle-group" role="group" aria-label={say.eachKind}>
            {NEWS_GROUPS.map((group) => (
              <Toggle
                key={group}
                {...say.toast[group]}
                on={settings.announce.toast[group]}
                onChange={(on) => onChange({ announce: { toast: { [group]: on } } })}
              />
            ))}
          </div>
        </Section>
        <Section title={say.sound}>
          <Toggle
            {...say.soundOn}
            on={settings.announce.sound}
            onChange={(sound) => onChange({ announce: { sound } })}
          />
          <PercentSlider
            label={say.volume}
            value={settings.announce.volume}
            onChange={(volume) => onChange({ announce: { volume } })}
          >
            <button
              className="icon-button icon-button--labelled"
              onClick={() => playCue('light', settings.announce.volume)}
              title={say.testTip}
            >
              <Icon name="sound" />
              {say.test}
            </button>
          </PercentSlider>
        </Section>
      </div>
    </Sheet>
  )
}
