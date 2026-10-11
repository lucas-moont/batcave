import { describe, expect, it } from 'vitest'
import {
  ago,
  attentionCopy,
  caseHeader,
  folderName,
  lastReply,
  mascotMood,
  orderCases,
  plainPreview,
  pluginSilent,
  reportCopy,
  watchRow,
  relativeTime,
  taskLabel,
} from '../src/shared/view'
import type { AttentionItem, SessionSnapshot, StoreSnapshot } from '../src/shared/types'
import { createSession } from '../src/main/model/sessionReducer'

const session = (status: SessionSnapshot['status']): SessionSnapshot => ({
  ...createSession(`s-${status}`),
  pid: 1,
  status,
  signals: {},
})
const item = (kind: AttentionItem['kind']): AttentionItem => ({
  sessionId: 's',
  kind,
  at: '2026-01-01T00:00:00.000Z',
})
const snapshot = (sessions: SessionSnapshot[], attention: AttentionItem[] = []): StoreSnapshot => ({
  sessions,
  attention,
})

describe('mascotMood', () => {
  it('sleeps when nothing is happening', () => {
    expect(mascotMood(snapshot([session('idle')]))).toBe('sleeping')
  })
})

describe('mascotMood when something happens', () => {
  it('flies while any session is working', () => {
    expect(mascotMood(snapshot([session('idle'), session('busy')]))).toBe('flying')
  })

  it.each(['permission', 'error'] as const)('is alarmed by a pending %s, even while working', (kind) => {
    expect(mascotMood(snapshot([session('busy')], [item(kind)]))).toBe('alarmed')
  })

  it('is alarmed while Claude waits for you', () => {
    expect(mascotMood(snapshot([session('idle')], [item('waiting')]))).toBe('alarmed')
  })

  it('does not panic over a finished reply or a quiet task', () => {
    expect(mascotMood(snapshot([session('idle')], [item('reply'), item('stalled')]))).toBe('sleeping')
  })
})

describe('relativeTime', () => {
  const now = new Date('2026-03-10T15:00:00.000Z')
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString()
  const MIN = 60_000

  it.each([
    [ago(20_000), 'now'],
    [ago(2 * MIN), '2m'],
    [ago(59 * MIN), '59m'],
    [ago(3 * 60 * MIN), '3h'],
    [ago(30 * 60 * MIN), '1d'],
    [ago(9 * 24 * 60 * MIN), '9d'],
  ])('%s → %s', (iso, expected) => {
    expect(relativeTime(iso, now)).toBe(expected)
  })

  it('treats a time slightly in the future (clock skew) as now', () => {
    expect(relativeTime(new Date(now.getTime() + 5000).toISOString(), now)).toBe('now')
  })

  it('returns an empty string for a missing or broken time', () => {
    expect(relativeTime(undefined, now)).toBe('')
    expect(relativeTime('', now)).toBe('')
    expect(relativeTime('not a date', now)).toBe('')
  })
})

describe('attentionCopy', () => {
  const base = { sessionId: 's', at: '2026-01-01T00:00:00.000Z' }

  it.each<[AttentionItem, { stamp: string; line: string }]>([
    [
      { ...base, kind: 'permission', toolName: 'Bash', detail: 'npm install' },
      { stamp: 'Permission', line: 'Bash · npm install' },
    ],
    [
      { ...base, kind: 'permission', toolName: 'WebFetch' },
      { stamp: 'Permission', line: 'WebFetch' },
    ],
    [
      { ...base, kind: 'error', detail: 'rate_limit' },
      { stamp: 'Error', line: 'Rate limit' },
    ],
    [
      { ...base, kind: 'waiting' },
      { stamp: 'Waiting', line: 'Claude is waiting for you' },
    ],
    [
      { ...base, kind: 'reply' },
      { stamp: 'New reply', line: 'Claude finished replying' },
    ],
    [
      { ...base, kind: 'stalled', detail: 'Scan Gotham' },
      { stamp: 'Stalled', line: 'No news on “Scan Gotham”' },
    ],
  ])('%o', (attention, expected) => {
    expect(attentionCopy(attention)).toEqual(expected)
  })

  it('falls back gracefully when details are missing', () => {
    expect(attentionCopy({ ...base, kind: 'error' })).toEqual({ stamp: 'Error', line: 'The turn failed' })
    expect(attentionCopy({ ...base, kind: 'stalled' })).toEqual({
      stamp: 'Stalled',
      line: 'A task has gone quiet',
    })
  })
})

describe('caseHeader', () => {
  const task = (id: string, status: 'pending' | 'in_progress' | 'completed') => ({
    id,
    subject: id,
    status,
    history: [],
  })

  it('numbers the case from its session id and uses its title', () => {
    const s = { ...session('idle'), sessionId: 'b47c0de1-9a2f-4e11', title: 'Fix the Batmobile' }
    expect(caseHeader(s)).toMatchObject({ number: '#b47c0d', title: 'Fix the Batmobile' })
  })

  it('falls back to the session name, then to a placeholder', () => {
    expect(caseHeader({ ...session('idle'), name: 'wayne-enterprises-1' }).title).toBe('wayne-enterprises-1')
    expect(caseHeader(session('idle')).title).toBe('Untitled case')
  })

  it('counts finished tasks', () => {
    const s = {
      ...session('busy'),
      tasks: [task('1', 'completed'), task('2', 'in_progress'), task('3', 'pending')],
    }
    expect(caseHeader(s).progress).toEqual({ done: 1, total: 3, label: '1/3' })
  })

  it('has no progress without tasks', () => {
    expect(caseHeader(session('idle')).progress).toBeUndefined()
  })
})

describe('plainPreview', () => {
  it.each([
    ['The **new curve** works and _tells_ the story', 'The new curve works and tells the story'],
    ['Run `npm test` first', 'Run npm test first'],
    ['## Summary\n- one\n- two', 'Summary · one · two'],
    ['See [the docs](https://example.com) now', 'See the docs now'],
    ['1. first\n2. second', 'first · second'],
    ['> quoted line', 'quoted line'],
    ['```ts\nconst x = 1\n```\nDone.', 'const x = 1 · Done.'],
  ])('%j → %j', (markdown, expected) => {
    expect(plainPreview(markdown)).toBe(expected)
  })

  it('keeps plain text as it is, without doubled spaces', () => {
    expect(plainPreview('Checking   the GCPD files.')).toBe('Checking the GCPD files.')
  })
})

describe('plainPreview on long replies', () => {
  it('only reads the start of a long reply, ending with an ellipsis', () => {
    const preview = plainPreview('**Report** ' + 'word '.repeat(2000))
    expect(preview.startsWith('Report word')).toBe(true)
    expect(preview.length).toBeLessThanOrEqual(281)
    expect(preview.endsWith('…')).toBe(true)
  })
})

describe('plainPreview keeps code and words intact', () => {
  it.each([
    ['Edit `__init__.py` and my_var_name', 'Edit __init__.py and my_var_name'],
    ['Compute 2 * 3 * 4', 'Compute 2 * 3 * 4'],
    ['Use `**kwargs` here', 'Use **kwargs here'],
    ['A *real* emphasis and a snake_case_name', 'A real emphasis and a snake_case_name'],
  ])('%j → %j', (markdown, expected) => {
    expect(plainPreview(markdown)).toBe(expected)
  })
})

describe('ago', () => {
  const now = new Date('2026-03-10T15:00:00.000Z')
  it.each([
    [new Date(now.getTime() - 10_000).toISOString(), 'just now'],
    [new Date(now.getTime() - 5 * 60_000).toISOString(), '5m ago'],
    [undefined, ''],
    ['nonsense', ''],
  ])('%s → %j', (iso, expected) => {
    expect(ago(iso, now)).toBe(expected)
  })
})

describe('orderCases', () => {
  const s = (id: string, status: SessionSnapshot['status']) => ({ ...session(status), sessionId: id })
  const needs = (sessionId: string, kind: AttentionItem['kind']): AttentionItem => ({
    ...item(kind),
    sessionId,
  })

  it('puts cases that need you first, most urgent first, then working ones, then the rest', () => {
    const sessions = [s('quiet', 'idle'), s('busy', 'busy'), s('reply', 'idle'), s('perm', 'busy')]
    const attention = [needs('perm', 'permission'), needs('reply', 'reply')]
    expect(orderCases(sessions, attention).map((x) => x.sessionId)).toEqual([
      'perm',
      'reply',
      'busy',
      'quiet',
    ])
  })

  it('keeps the original order among equals', () => {
    const sessions = [s('a', 'idle'), s('b', 'idle'), s('c', 'idle')]
    expect(orderCases(sessions, []).map((x) => x.sessionId)).toEqual(['a', 'b', 'c'])
  })
})

describe('small case details', () => {
  it.each([
    [String.raw`C:\Users\bruce\wayne-enterprises`, 'wayne-enterprises'],
    ['/home/bruce/gcpd/', 'gcpd'],
    ['', ''],
  ])('folderName(%j) → %j', (cwd, expected) => {
    expect(folderName(cwd)).toBe(expected)
  })

  it("finds Claude's latest reply", () => {
    const messages = [
      { role: 'assistant' as const, text: 'first', at: '' },
      { role: 'user' as const, text: 'go on', at: '' },
      { role: 'assistant' as const, text: 'second', at: '' },
      { role: 'user' as const, text: 'thanks', at: '' },
    ]
    expect(lastReply({ ...session('idle'), messages })).toBe('second')
    expect(lastReply(session('idle'))).toBeUndefined()
  })

  it('labels a task in progress by what is happening right now', () => {
    const task = { id: '1', subject: 'Scan Gotham', activeForm: 'Scanning Gotham', history: [] }
    expect(taskLabel({ ...task, status: 'in_progress' })).toBe('Scanning Gotham')
    expect(taskLabel({ ...task, status: 'pending' })).toBe('Scan Gotham')
    expect(taskLabel({ ...task, activeForm: undefined, status: 'in_progress' })).toBe('Scan Gotham')
  })
})

describe('reportCopy', () => {
  const base = { sessionId: 's', at: '2026-01-01T00:00:00.000Z' }

  it.each<[AttentionItem, { stamp: string; sentence: string }]>([
    [
      { ...base, kind: 'permission', toolName: 'Bash', detail: 'npm install' },
      { stamp: 'Permission', sentence: 'asks to run Bash: npm install' },
    ],
    [
      { ...base, kind: 'permission', toolName: 'WebFetch' },
      { stamp: 'Permission', sentence: 'asks to use WebFetch' },
    ],
    [
      { ...base, kind: 'error', detail: 'rate_limit' },
      { stamp: 'Error', sentence: 'stopped: rate limit' },
    ],
    [
      { ...base, kind: 'waiting' },
      { stamp: 'Waiting', sentence: 'is waiting for your answer' },
    ],
    [
      { ...base, kind: 'reply' },
      { stamp: 'New reply', sentence: 'finished replying' },
    ],
    [
      { ...base, kind: 'stalled', detail: 'Scan Gotham' },
      { stamp: 'Stalled', sentence: 'has gone quiet on “Scan Gotham”' },
    ],
  ])('%o', (item, expected) => {
    expect(reportCopy(item)).toEqual(expected)
  })
})

describe('watchRow', () => {
  const task = (id: string, status: 'pending' | 'in_progress' | 'completed', activeForm?: string) => ({
    id,
    subject: `Task ${id}`,
    activeForm,
    status,
    history: [],
  })
  const s = (status: SessionSnapshot['status'], extra: Partial<SessionSnapshot> = {}): SessionSnapshot => ({
    ...session(status),
    sessionId: 'c',
    title: 'Tune the Batmobile',
    ...extra,
  })
  const alert = (kind: AttentionItem['kind'], extra: Partial<AttentionItem> = {}): AttentionItem => ({
    sessionId: 'c',
    kind,
    at: '2026-01-01T00:00:00.000Z',
    ...extra,
  })

  it('leads with what waits for the user, the most urgent first', () => {
    const row = watchRow(s('busy'), [
      alert('reply'),
      alert('permission', { toolName: 'Bash', detail: 'rm -rf ./x' }),
    ])
    expect(row).toEqual({
      tone: 'hot',
      stamp: 'Permission',
      title: 'Tune the Batmobile',
      line: 'Bash · rm -rf ./x',
    })
  })

  it('shows what a working session is doing now, with its progress', () => {
    const tasks = [
      task('1', 'completed'),
      task('2', 'in_progress', 'Profiling the ignition'),
      task('3', 'pending'),
    ]
    expect(watchRow(s('busy', { tasks }), [])).toEqual({
      tone: 'working',
      stamp: 'Working',
      title: 'Tune the Batmobile',
      line: 'Profiling the ignition',
      progress: '1/3',
    })
  })

  it('keeps an idle session to one line', () => {
    expect(watchRow(s('idle'), [])).toEqual({ tone: 'idle', stamp: 'Idle', title: 'Tune the Batmobile' })
  })

  it('reads waiting work softer than blocked work, and a stalled task quietest', () => {
    expect(watchRow(s('idle'), [alert('waiting')]).tone).toBe('soft')
    expect(watchRow(s('idle'), [alert('stalled', { detail: 'Scan' })]).tone).toBe('quiet')
  })

  it('ignores alerts that belong to other sessions', () => {
    expect(watchRow(s('idle'), [alert('error', { sessionId: 'other' })]).tone).toBe('idle')
  })
})

describe('pluginSilent', () => {
  it('is silent while some session finished a turn without a hook', () => {
    expect(pluginSilent({ sessions: [], attention: [], unheard: ['a'] })).toBe(true)
  })

  it('is not silent when every session has been heard, or in demos that do not say', () => {
    expect(pluginSilent({ sessions: [], attention: [], unheard: [] })).toBe(false)
    expect(pluginSilent({ sessions: [], attention: [] })).toBe(false)
  })
})
