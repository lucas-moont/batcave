// What news goes beyond the Bat-Signal itself: a Windows toast for the kinds the user switched on,
// a sound when sound is on, and neither while the panel is in front. Pure: the main process passes
// the snapshots and the moment's context, gathers each burst (BURST_MS), and makes one toast and
// one sound of it.
import { byUrgency, diffNotices, freshen, type Notice, type NoticeKind } from './notices'
import { STANDARD_WORDS, TOAST_WORDS } from './words'
import type { AnnouncePrefs, NewsGroup } from './settings'
import type { StoreSnapshot } from './types'

/** The switch each kind of news answers to. */
export const GROUP_OF_KIND: Record<NoticeKind, NewsGroup> = {
  permission: 'needsYou',
  error: 'needsYou',
  waiting: 'needsYou',
  reply: 'reply',
  'task-done': 'taskDone',
  'session-opened': 'sessions',
  'session-closed': 'sessions',
}

export interface Announcer {
  /** The snapshot news is found against. */
  prev?: StoreSnapshot
  /** Keys already announced (or passed over), so the same news never comes back. */
  announced: ReadonlySet<string>
}

export const emptyAnnouncer = (): Announcer => ({ announced: new Set() })

export interface AnnounceContext {
  prefs: AnnouncePrefs
  /** The user sees the news already (see BatSignalWindows.panelFocused). */
  panelFocused: boolean
}

export interface Toast {
  /** The case a click opens; none for a case that closed. */
  sessionId?: string
  title: string
  body: string
}

/** The sounds Bat-Signal makes: one, a spotlight coming on. */
export type Cue = 'light'

/** A sound for the signal window to play, at the user's volume (0 to 1). */
export interface CuePlay {
  cue: Cue
  volume: number
}

/** News this close together is one burst: a finished turn pushes its reply, then its tasks. */
export const BURST_MS = 500

/** The sound each kind of news makes; a task done and a case opening or closing make none. */
const CUE_OF_KIND: Record<NoticeKind, Cue | undefined> = {
  permission: 'light',
  error: 'light',
  waiting: 'light',
  reply: 'light',
  // Quiet: the spotlight means "look", and a task done must not take a request's turn to sound.
  'task-done': undefined,
  'session-opened': undefined,
  'session-closed': undefined,
}

/**
 * Takes a new snapshot: all its news is remembered, and out come the news the user picked for a
 * toast and the news that makes a sound.
 */
export function announce(
  state: Announcer,
  snapshot: StoreSnapshot,
  ctx: AnnounceContext,
): { state: Announcer; toast: Notice[]; sound: Notice[] } {
  const { fresh, announced } = freshen(state.announced, diffNotices(state.prev, snapshot, STANDARD_WORDS))
  const next = { prev: snapshot, announced }
  // With the panel in front, the news is remembered all the same: it was seen there.
  if (ctx.panelFocused) return { state: next, toast: [], sound: [] }
  return {
    state: next,
    toast: fresh.filter((n) => ctx.prefs.toast[GROUP_OF_KIND[n.kind]]),
    sound: ctx.prefs.sound ? fresh.filter((n) => CUE_OF_KIND[n.kind]) : [],
  }
}

/**
 * The sound for a burst of news, or none. With one sound there is nothing to rank: any news that
 * makes it does. (A second sound would bring back picking the most urgent news's sound.)
 */
export const cueFor = (news: readonly Notice[]): Cue | undefined =>
  news.map((n) => CUE_OF_KIND[n.kind]).find((cue) => cue !== undefined)

/** The least time between two sounds, however much news comes. */
export const SOUND_GAP_MS = 4000

/** Whether a sound may play now: none played (at `lastAt`) in the last SOUND_GAP_MS. */
export const soundGapOpen = (lastAt: number | undefined, now: number): boolean =>
  lastAt === undefined || now - lastAt >= SOUND_GAP_MS

/**
 * One toast for a burst of news, however many pushes it came in: the most urgent, in the cards'
 * own words (the stamp and the case, then the line), with a count of the rest.
 */
export function toastFor(news: readonly Notice[]): Toast | undefined {
  const [first, ...rest] = [...news].sort(byUrgency)
  if (!first) return undefined
  return {
    ...(first.kind !== 'session-closed' && { sessionId: first.sessionId }),
    title: `${first.stamp} · ${first.title}`,
    body: rest.length ? `${first.line}\n${TOAST_WORDS.more(rest.length)}` : first.line,
  }
}
