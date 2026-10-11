// Pure presentation rules shared by the window and its tests.
import { ATTENTION_URGENCY } from './types'
import type { AttentionItem, SessionSnapshot, StoreSnapshot, Task, TaskStatus } from './types'
import type { Words } from './words'

export type MascotMood = 'sleeping' | 'flying' | 'alarmed'

/** Alerts where Claude is blocked on the user, as opposed to a finished reply or a quiet task. */
const ALARMING = new Set<AttentionItem['kind']>(['permission', 'error', 'waiting'])

/** How Bat-Clawd should look given everything Bat-Signal knows. */
export function mascotMood({ sessions, attention }: StoreSnapshot): MascotMood {
  if (attention.some((a) => ALARMING.has(a.kind))) return 'alarmed'
  return sessions.some((s) => s.status === 'busy') ? 'flying' : 'sleeping'
}

/** relativeTime as a phrase: "just now", "5m ago", or empty for missing or invalid times. */
export function ago(iso: string | undefined, now: Date, { voice }: Words): string {
  const age = relativeTime(iso, now)
  return age === 'now' ? voice.time.justNow : age && voice.time.ago(age)
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Compact age of a timestamp: "now", "2m", "3h", "1d". Empty for missing or invalid times. */
export function relativeTime(iso: string | undefined, now: Date): string {
  const at = iso ? Date.parse(iso) : NaN
  if (Number.isNaN(at)) return ''
  const age = now.getTime() - at
  if (age < MINUTE) return 'now'
  if (age < HOUR) return `${Math.floor(age / MINUTE)}m`
  if (age < DAY) return `${Math.floor(age / HOUR)}h`
  return `${Math.floor(age / DAY)}d`
}

export interface CardCopy {
  /** The red stamp on the card. */
  stamp: string
  /** One line saying what it is about. */
  line: string
}

const humanize = (code: string): string => {
  const words = code.replace(/[_-]+/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** The stamp and detail line of a needs-you card. */
export function attentionCopy(item: AttentionItem, { terms, voice }: Words): CardCopy {
  const stamp = terms.stamp[item.kind]
  const line = voice.alertLine
  switch (item.kind) {
    case 'permission':
      return { stamp, line: [item.toolName ?? line.someTool, item.detail].filter(Boolean).join(' · ') }
    case 'error':
      return { stamp, line: item.detail ? humanize(item.detail) : line.errorFallback }
    case 'waiting':
      return { stamp, line: line.waiting }
    case 'reply':
      return { stamp, line: line.reply }
    case 'stalled':
      return { stamp, line: line.stalled(item.detail) }
  }
}

/** How an alert reads in the night report: the case's title, then this sentence. */
export function reportCopy(item: AttentionItem, words: Words): { stamp: string; sentence: string } {
  const stamp = words.terms.stamp[item.kind]
  const sentence = words.voice.reportSentence
  switch (item.kind) {
    case 'permission':
      return { stamp, sentence: sentence.permission(item.toolName, item.detail) }
    case 'error':
      return { stamp, sentence: sentence.error(item.detail && humanize(item.detail).toLowerCase()) }
    case 'waiting':
      return { stamp, sentence: sentence.waiting }
    case 'reply':
      return { stamp, sentence: sentence.reply }
    case 'stalled':
      return { stamp, sentence: sentence.stalled(item.detail) }
  }
}

export interface CaseHeader {
  /** Short case number from the session id, e.g. "#b47c0d". */
  number: string
  title: string
  progress?: { done: number; total: number; label: string }
}

/** How a session is introduced on its card. */
export function caseHeader(session: SessionSnapshot, { terms, voice }: Words): CaseHeader {
  const done = session.tasks.filter((t) => t.status === 'completed').length
  const total = session.tasks.length
  return {
    number: `#${session.sessionId.replace(/[^a-z0-9]/gi, '').slice(0, 6)}`,
    title: session.title ?? session.name ?? voice.untitled(terms),
    progress: total ? { done, total, label: `${done}/${total}` } : undefined,
  }
}

/**
 * Claude's markdown as a one-line preview: formatting marks removed, lines joined with " · ".
 * For short previews only; it doesn't try to be a full markdown parser.
 */
export function plainPreview(markdown: string): string {
  // Cards show a line or two: only clean the start of a reply that may be several KB.
  const long = markdown.length > PREVIEW_READ
  const preview = markdown
    .slice(0, PREVIEW_READ)
    .split('\n')
    .map((line) =>
      line
        .replace(/^\s*```.*$/, '') // code fence lines
        .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+[.)])\s+/, '') // headings, quotes, list markers
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // links and images keep their text
        // Code spans are kept verbatim (my_var, __init__.py, **kwargs); only prose loses emphasis.
        .split(/(`[^`]*`)/)
        .map((part) => (part.startsWith('`') ? part.slice(1, -1) : stripEmphasis(part)))
        .join('')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean)
    .join(' · ')
  return long || preview.length > PREVIEW_MAX ? preview.slice(0, PREVIEW_MAX).trimEnd() + '…' : preview
}

/**
 * Removes **bold** and *italic* marks only where they hug a word from outside, so snake_case
 * names and arithmetic like "2 * 3" stay as written.
 */
const stripEmphasis = (text: string): string =>
  text
    .replace(/(^|[^\w*])(\*\*|__)(?=\S)(.+?)(?<=\S)\2(?![\w*])/g, '$1$3')
    .replace(/(^|[^\w*])([*_])(?=\S)(.+?)(?<=\S)\2(?![\w*])/g, '$1$3')

const PREVIEW_READ = 600
const PREVIEW_MAX = 280

/** Tasks as a typist marks them (the night report). */
export const TYPED_BOX: Record<TaskStatus, string> = {
  pending: '[ ]',
  in_progress: '[>]',
  completed: '[x]',
  deleted: '[-]',
}

/**
 * Cases in display order: those that need you first (most urgent first, as the attention list
 * is ordered), then the ones working, then the rest; the original order breaks ties.
 */
export function orderCases(sessions: SessionSnapshot[], attention: AttentionItem[]): SessionSnapshot[] {
  const urgency = new Map<string, number>()
  attention.forEach((a, i) => {
    if (!urgency.has(a.sessionId)) urgency.set(a.sessionId, i)
  })
  const rank = (s: SessionSnapshot) =>
    urgency.get(s.sessionId) ?? (s.status === 'busy' ? attention.length : Infinity)
  return sessions
    .map((s, i) => ({ s, i }))
    .sort((a, b) => rank(a.s) - rank(b.s) || a.i - b.i)
    .map(({ s }) => s)
}

/** The last folder of a path, Windows or POSIX. */
export const folderName = (cwd: string): string => cwd.split(/[\\/]/).filter(Boolean).pop() ?? ''

/** Claude's most recent reply in a session. */
export const lastReply = (session: SessionSnapshot): string | undefined =>
  session.messages.findLast((m) => m.role === 'assistant')?.text

/** A task by what is happening right now while in progress, by its subject otherwise. */
export const taskLabel = (task: Task): string =>
  task.status === 'in_progress' ? (task.activeForm ?? task.subject) : task.subject

export interface WatchRow {
  /** How loud the row reads: blocked (hot), waiting (soft), stalled (quiet), working or idle. */
  tone: 'hot' | 'soft' | 'quiet' | 'working' | 'idle'
  stamp: string
  title: string
  /** The one line under the title: what waits for the user, or what is happening now. */
  line?: string
  progress?: string
}

/** How hard an alert presses, everywhere it is inked: blocked work hot, waiting work soft, a stalled task quiet. */
export const ALERT_INK: Record<AttentionItem['kind'], 'hot' | 'soft' | 'quiet'> = {
  permission: 'hot',
  error: 'hot',
  waiting: 'soft',
  reply: 'soft',
  stalled: 'quiet',
}

/** One row of the watch strip: what a glance at the corner should tell about a session. */
export function watchRow(session: SessionSnapshot, attention: AttentionItem[], words: Words): WatchRow {
  const { title, progress } = caseHeader(session, words)
  const { live } = words.terms
  const own = attention
    .filter((a) => a.sessionId === session.sessionId)
    .sort((a, b) => ATTENTION_URGENCY[a.kind] - ATTENTION_URGENCY[b.kind])[0]
  const row: WatchRow = own
    ? { tone: ALERT_INK[own.kind], ...attentionCopy(own, words), title }
    : session.status === 'busy'
      ? { tone: 'working', stamp: live.busy, title, ...lineOf(currentTask(session)) }
      : { tone: 'idle', stamp: live[session.status], title }
  return progress ? { ...row, progress: progress.label } : row
}

const lineOf = (task: Task | undefined) => (task ? { line: taskLabel(task) } : {})

/** The task a session is working on right now, if any. */
export const currentTask = (session: SessionSnapshot): Task | undefined =>
  session.tasks.find((t) => t.status === 'in_progress')

/** How many sessions finished a whole turn without a hook (see pluginSilent). */
export const unheardCount = (snapshot: StoreSnapshot): number => snapshot.unheard?.length ?? 0

/**
 * The plugin is silent for some session: it finished a whole turn without a hook (with the plugin,
 * every turn sends them). Then Needs you cannot show that session's prompts or waits, and says so.
 */
export const pluginSilent = (snapshot: StoreSnapshot): boolean => unheardCount(snapshot) > 0
