// Every word Bat-Signal shows, in two parts (CONTEXT.md): the Terms, which a Theme's Lexicon may
// rename (Case, Needs you, the words inside a stamp), and the Voice, the rest of the text, whose
// tone a Theme may change but which never renames a term. A Voice line that names a term takes it
// from the Terms, so turning the Lexicon off can't leave a themed word behind.
//
// Every presenter takes the words it speaks, with no default, so no caller can fall back on the
// standard words by forgetting them. Windows notifications (the announcer) and the tray pass
// STANDARD_WORDS themselves; the panel and the Signal pass the Theme's (the renderer's useWords).
import type { NewsGroup } from './settings'
import type { ShortcutStatus } from './status'
import type { AttentionKind, LiveStatus, RunStatus, TaskStatus } from './types'
import type { MascotMood } from './view'

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
  /** The case detail: its back button, its terminal button, its sections. */
  detail: {
    back: string
    terminal: string
    tasks: string
    subagents: string
    background: string
    lastWords: string
    running: (n: number) => string
    /** A task row read aloud: its words, then its state. */
    taskRow: (task: string, state: string) => string
  }
  /** The night report layout. */
  report: {
    name: string
    /** The dateline's date and time, typed. */
    dateline: (now: Date) => string
    signature: string
    nil: (t: Terms) => string
    /** Nothing reported, but the plugin misses some sessions. */
    nilUnheard: string
    unknown: (t: Terms) => string
    caseNotes: (t: Terms) => string
    noCases: (t: Terms) => string
    /** "Now profiling the ignition sequence." */
    now: (task: string) => string
    filed: (done: number, total: number) => string
    /** "Case #b47c0d, batmobile." */
    file: (t: Terms, number: string, folder: string) => string
    lastWord: string
    nothingOnFile: string
    /** The report's last line, which a Theme may vary with how much still awaits the user. */
    end: (waiting: number) => string
  }
  /** The drawer for a task, a subagent or a background command. */
  drawer: {
    close: string
    brief: string
    rightNow: string
    timeline: string
    type: string
    latestWord: string
    outcome: string
    orders: string
    timing: string
    command: string
    started: (ago: string) => string
    finished: (ago: string) => string
    ended: (ago: string) => string
    taskKicker: (id: string, state: string) => string
    subagentKicker: (state: string) => string
    backgroundKicker: (state: string) => string
  }
  settings: {
    kicker: string
    title: string
    look: string
    comfort: string
    notifications: string
    sound: string
    animations: Setting
    atmosphere: { label: string; hint: (t: Terms) => string }
    layout: Setting
    onTop: Setting
    opacity: string
    startup: Setting & { blocked: string }
    allToasts: Setting & { some: (on: number, of: number) => string }
    eachKind: string
    toast: (t: Terms) => Record<NewsGroup, Setting>
    soundOn: Setting
    volume: string
    test: string
    testTip: string
  }
  shortcut: {
    label: string
    hint: Record<ShortcutStatus['state'], string>
    recordingHint: string
    pressKeys: string
    off: string
    record: string
    change: string
  }
  /** The disc and the notice card riding its beam. */
  signal: {
    openCase: (t: Terms) => string
    open: (t: Terms, needsYou: number) => string
    openTip: string
  }
  watch: {
    openPanel: string
    nil: (t: Terms) => string
  }
  terminal: {
    go: string
    /** No window hosts the session, so the command that resumes it went to the clipboard. */
    copied: string
  }
  /** Needs you's note while the plugin misses some sessions. */
  pluginHint: {
    title: (sessions: number) => string
    text: string
    command: string
  }
  /** Bat-Clawd, read aloud. */
  mascot: Record<MascotMood, string> & { watching: string }
  /** Who spoke, in a case's last words. */
  speaker: { user: string; assistant: string }
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

/** A setting's label and the line under it. */
export interface Setting {
  label: string
  hint: string
}

export interface Words {
  terms: Terms
  voice: Voice
}

/** A term inside a sentence: "Cases" reads "cases", a Theme's "Ops" reads "ops". */
export const lower = (term: string): string => term.toLowerCase()

/** A label read inside a sentence ("Now profiling …"): first letter lowered, its end stop dropped. */
const asClause = (label: string) => (label.charAt(0).toLowerCase() + label.slice(1)).replace(/[.!?…]+$/, '')

// Built once: a formatter is costly to make, and the dateline renders with every snapshot.
const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })
const TIME = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })

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
  detail: {
    back: 'Back to the list',
    terminal: 'Terminal',
    tasks: 'Tasks',
    subagents: 'Subagents',
    background: 'In the background',
    lastWords: 'Last words',
    running: (n) => `${n} running`,
    taskRow: (task, state) => `${task}, ${lower(state)}`,
  },
  report: {
    name: 'Night report',
    dateline: (now) => `${DAY.format(now).replace(',', '').toUpperCase()} · ${TIME.format(now)}`,
    signature: 'Awaiting your signature',
    nil: (t) => `Nothing awaits your signature. Every ${lower(t.case.one)} can carry on without you.`,
    nilUnheard: 'Nothing reported from the sessions the plugin reaches.',
    unknown: (t) => `An unknown ${lower(t.case.one)}`,
    caseNotes: (t) => `${t.case.one} notes`,
    noCases: (t) =>
      `No ${lower(t.case.many)} open. Start Claude Code in a terminal and its session is filed here.`,
    now: (task) => `Now ${asClause(task)}.`,
    filed: (done, total) => `${done} of ${total} filed.`,
    file: (t, number, folder) => `${t.case.one} ${number}${folder ? `, ${folder}` : ''}.`,
    lastWord: 'Last word:',
    nothingOnFile: 'No tasks, subagents or background work on file.',
    end: () => 'End of report.',
  },
  drawer: {
    close: 'Close',
    brief: 'Brief',
    rightNow: 'Right now',
    timeline: 'Timeline',
    type: 'Type',
    latestWord: 'Latest word',
    outcome: 'Outcome',
    orders: 'Orders',
    timing: 'Timing',
    command: 'Command',
    started: (ago) => `Started ${ago}`,
    finished: (ago) => `finished ${ago}`,
    ended: (ago) => `ended ${ago}`,
    taskKicker: (id, state) => `Task ${id} · ${state}`,
    subagentKicker: (state) => `Subagent · ${state}`,
    backgroundKicker: (state) => `Background · ${state}`,
  },
  settings: {
    kicker: 'Bat-Computer',
    title: 'Settings',
    look: 'Look',
    comfort: 'Comfort',
    notifications: 'Windows notifications',
    sound: 'Sound',
    animations: { label: 'Animations', hint: 'Intro, flying mascot, typewriter and transitions' },
    atmosphere: { label: 'Rain', hint: (t) => `Gotham weather behind the ${lower(t.case.many)}` },
    layout: { label: 'Night report', hint: 'Read the panel as one typed report instead of case files' },
    onTop: { label: 'Always on top', hint: 'Keep the window above everything else' },
    opacity: 'Opacity',
    startup: {
      label: 'Start with Windows',
      hint: 'Wakes as the disc when you sign in',
      blocked: 'Turned off in Task Manager: switch it on here to allow it again',
    },
    allToasts: {
      label: 'All notifications',
      hint: 'Every kind of news below',
      some: (on, of) => `${on} of ${of} on`,
    },
    eachKind: 'Each kind of news',
    toast: (t) => ({
      needsYou: { label: 'Claude needs you', hint: 'A permission, an error or a question' },
      reply: { label: 'Reply ready', hint: 'Claude finished replying' },
      taskDone: { label: 'Task done', hint: `A task checked off on a ${lower(t.case.one)}` },
      sessions: { label: `${t.case.one} opened or closed`, hint: 'A session starts or ends' },
    }),
    soundOn: { label: 'Sound', hint: 'A spotlight coming on when Claude needs you or replies' },
    volume: 'Volume',
    test: 'Test',
    testTip: 'Play the spotlight at this volume',
  },
  shortcut: {
    label: 'Global shortcut',
    hint: {
      active: 'Opens and folds Bat-Signal from any app',
      off: 'Off: click to set one',
      taken: 'Another app (or Windows) already uses it: click to pick another',
    },
    recordingHint: 'Esc cancels · Backspace turns it off',
    pressKeys: 'Press keys',
    off: 'Off',
    record: 'Press the new shortcut',
    change: 'Change the global shortcut',
  },
  signal: {
    openCase: (t) => `Open this ${lower(t.case.one)}`,
    open: (t, needsYou) => (needsYou ? `Open Bat-Signal: ${t.needsYou.count(needsYou)}` : 'Open Bat-Signal'),
    openTip: 'Open Bat-Signal · drag to move',
  },
  watch: {
    openPanel: 'Open the full panel',
    nil: (t) => `No open ${lower(t.case.many)}. Start Claude Code in a terminal to follow it here.`,
  },
  terminal: { go: 'Go to the terminal', copied: 'No window found. Resume command copied.' },
  pluginHint: {
    title: (sessions) =>
      `No word from the Bat-Signal plugin for ${sessions === 1 ? 'one session' : `${sessions} sessions`}.`,
    text: 'Their permission prompts and waits won’t show. Install the plugin once, then restart those sessions:',
    command: 'claude plugin install bat-signal@bat-signal',
  },
  mascot: {
    sleeping: 'Bat-Clawd is asleep',
    flying: 'Bat-Clawd is on patrol',
    alarmed: 'Bat-Clawd needs you',
    watching: 'Bat-Clawd keeps watch',
  },
  speaker: { user: 'You', assistant: 'Claude' },
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
