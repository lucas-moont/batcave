// Every word Bat-Signal shows, in two parts (CONTEXT.md): the Terms, which a Theme's Lexicon may
// rename (Case, Needs you, the words inside a stamp), and the Voice, the rest of the text, whose
// tone a Theme may change but which never renames a term. A Voice line that names a term takes it
// from the Terms, so turning the Lexicon off can't leave a themed word behind.
//
// Windows notifications and the tray always speak STANDARD_WORDS: the functions behind them take
// no words at all. The panel and the Signal read the Theme's words (see the renderer's useWords).
import type { AttentionKind, LiveStatus, RunStatus, TaskStatus } from './types'

/** A noun in the singular and the plural: Case, Cases (or a Theme's Op, Ops). */
export interface Plural {
  one: string
  many: string
}

/** What a stamp can say: a needs-you alert, or news of a case opening, closing or a task done. */
export type StampKind = AttentionKind | 'task-done' | 'session-opened' | 'session-closed'

/** The named ideas a Lexicon may rename. */
export interface Terms {
  case: Plural
  needsYou: {
    label: string
    /** "1 needs you", "5 need you": the count the disc, the header, the strip and the tray show. */
    count: (n: number) => string
  }
  stamp: Record<StampKind, string>
  /** A case's state, as its card and the watch strip stamp it. */
  live: Record<LiveStatus, string>
  task: Record<TaskStatus, string>
  run: Record<RunStatus, string>
}

/** The text that is not a term: headings, sentences, empty states, labels. */
export interface Voice {
  product: string
  /** The product's name on the masthead and in the intro. */
  wordmark: string
  /** The title bar's and tabs' buttons. */
  chrome: {
    toWatch: string
    toDisc: string
    toDiscTip: string
    hide: string
    settings: string
  }
  /** The case files' empty states. */
  empty: {
    quiet: { title: string; hint: (t: Terms) => string }
    /** Nothing reported, but the plugin misses some sessions, so that proves nothing. */
    unheard: { title: string; hint: string }
    noCases: { title: (t: Terms) => string; hint: string }
  }
  /** "Case #b47c0d". */
  caseNumber: (t: Terms, number: string) => string
  /** A case's progress bar, read aloud: "3/5 tasks done". */
  tasksDone: (progress: string) => string
  time: {
    justNow: string
    ago: (age: string) => string
  }
  /** The line under a needs-you card's title. */
  alertLine: {
    /** Who asks, when the hook names no tool. */
    someTool: string
    errorFallback: string
    waiting: string
    reply: string
    stalled: (task: string | undefined) => string
  }
  /** How an alert reads in the night report, after the case's title. */
  reportSentence: {
    permission: (tool: string | undefined, detail: string | undefined) => string
    error: (reason: string | undefined) => string
    waiting: string
    reply: string
    stalled: (task: string | undefined) => string
  }
  untitled: (t: Terms) => string
  unknown: (t: Terms) => string
  /** The line of a notice about a case opening or closing. */
  noticeLine: {
    opened: string
    closed: string
  }
  tray: {
    allQuiet: string
    show: string
    hide: string
    disc: string
    panel: string
    watch: string
    settings: string
    quit: string
  }
}

export interface Words {
  terms: Terms
  voice: Voice
}

/** A term inside a sentence: "Cases" reads "cases", a Theme's "Ops" reads "ops". */
export const lower = (term: string): string => term.toLowerCase()

export const STANDARD_TERMS: Terms = {
  case: { one: 'Case', many: 'Cases' },
  needsYou: { label: 'Needs you', count: (n) => `${n} need${n === 1 ? 's' : ''} you` },
  stamp: {
    permission: 'Permission',
    error: 'Error',
    waiting: 'Waiting',
    reply: 'New reply',
    stalled: 'Stalled',
    'task-done': 'Task done',
    'session-opened': 'Case opened',
    'session-closed': 'Case closed',
  },
  live: { busy: 'Working', idle: 'Idle', shell: 'Shell' },
  task: { pending: 'Pending', in_progress: 'In progress', completed: 'Completed', deleted: 'Deleted' },
  run: { running: 'Running', completed: 'Done', failed: 'Failed', stopped: 'Stopped' },
}

export const STANDARD_VOICE: Voice = {
  product: 'Bat-Signal',
  wordmark: 'BAT-SIGNAL',
  chrome: {
    toWatch: 'Shrink to the watch strip',
    toDisc: 'Fold into the signal disc',
    toDiscTip: 'Fold into the signal disc (Esc)',
    hide: 'Hide to tray',
    settings: 'Settings',
  },
  empty: {
    quiet: { title: 'All quiet in Gotham.', hint: (t) => `Nothing ${lower(t.needsYou.label)} right now.` },
    unheard: { title: 'Nothing reported.', hint: 'The plugin does not reach every session yet.' },
    noCases: {
      title: (t) => `No open ${lower(t.case.many)}.`,
      hint: 'Start Claude Code in a terminal and it shows up here.',
    },
  },
  caseNumber: (t, number) => `${t.case.one} ${number}`,
  tasksDone: (progress) => `${progress} tasks done`,
  time: { justNow: 'just now', ago: (age) => `${age} ago` },
  alertLine: {
    someTool: 'A tool',
    errorFallback: 'The turn failed',
    waiting: 'Claude is waiting for you',
    reply: 'Claude finished replying',
    stalled: (task) => (task ? `No news on “${task}”` : 'A task has gone quiet'),
  },
  reportSentence: {
    permission: (tool, detail) =>
      detail ? `asks to run ${tool ?? 'a tool'}: ${detail}` : `asks to use ${tool ?? 'a tool'}`,
    error: (reason) => (reason ? `stopped: ${reason}` : 'stopped with an error'),
    waiting: 'is waiting for your answer',
    reply: 'finished replying',
    stalled: (task) => (task ? `has gone quiet on “${task}”` : 'has a task gone quiet'),
  },
  untitled: (t) => `Untitled ${lower(t.case.one)}`,
  unknown: (t) => `Unknown ${lower(t.case.one)}`,
  noticeLine: { opened: 'New session', closed: 'Session ended' },
  tray: {
    allQuiet: 'all quiet',
    show: 'Show Bat-Signal',
    hide: 'Hide Bat-Signal',
    disc: 'Disc',
    panel: 'Panel',
    watch: 'Watch strip',
    settings: 'Settings…',
    quit: 'Quit Bat-Signal',
  },
}

/** The words of every surface that never follows a Theme, and of the default Theme. */
export const STANDARD_WORDS: Words = { terms: STANDARD_TERMS, voice: STANDARD_VOICE }
