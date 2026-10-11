import { describe, expect, it } from 'vitest'
import { STANDARD_WORDS } from '../src/shared/words'
import { diffNotices } from '../src/shared/notices'
import { createSession } from '../src/main/model/sessionReducer'
import type { AttentionItem, SessionSnapshot, StoreSnapshot, Task } from '../src/shared/types'

const session = (sessionId: string, extra: Partial<SessionSnapshot> = {}): SessionSnapshot => ({
  ...createSession(sessionId),
  title: `Case ${sessionId}`,
  pid: 1,
  status: 'idle',
  signals: {},
  ...extra,
})
const task = (id: string, status: Task['status']): Task => ({
  id,
  subject: `Task ${id}`,
  status,
  history: [],
})
const alert = (
  sessionId: string,
  kind: AttentionItem['kind'],
  at = '2026-01-01T00:00:00.000Z',
): AttentionItem => ({
  sessionId,
  kind,
  at,
  ...(kind === 'permission' ? { toolName: 'Bash', detail: 'npm test' } : {}),
})
const snap = (sessions: SessionSnapshot[], attention: AttentionItem[] = []): StoreSnapshot => ({
  sessions,
  attention,
})

describe('diffNotices', () => {
  it('says nothing on the first snapshot, whatever it holds', () => {
    expect(diffNotices(undefined, snap([session('a')], [alert('a', 'permission')]), STANDARD_WORDS)).toEqual(
      [],
    )
  })
})

describe('diffNotices: alerts', () => {
  const before = snap([session('a')])

  it('announces a new permission prompt with what Claude wants to run', () => {
    expect(diffNotices(before, snap([session('a')], [alert('a', 'permission')]), STANDARD_WORDS)).toEqual([
      {
        key: 'a:permission:2026-01-01T00:00:00.000Z',
        kind: 'permission',
        sessionId: 'a',
        at: '2026-01-01T00:00:00.000Z',
        stamp: 'Permission',
        title: 'Case a',
        line: 'Bash · npm test',
      },
    ])
  })

  it.each(['error', 'waiting', 'reply'] as const)('announces a new %s', (kind) => {
    expect(
      diffNotices(before, snap([session('a')], [alert('a', kind)]), STANDARD_WORDS).map((n) => n.kind),
    ).toEqual([kind])
  })

  it('does not announce an alert that was already there', () => {
    const now = snap([session('a')], [alert('a', 'waiting')])
    expect(diffNotices(now, now, STANDARD_WORDS)).toEqual([])
  })

  it('announces the same kind again when it is a new occurrence', () => {
    const first = snap([session('a')], [alert('a', 'reply', '2026-01-01T00:00:00.000Z')])
    const second = snap([session('a')], [alert('a', 'reply', '2026-01-01T00:05:00.000Z')])
    expect(diffNotices(first, second, STANDARD_WORDS)).toHaveLength(1)
  })

  it('keeps quiet about stalled tasks', () => {
    expect(diffNotices(before, snap([session('a')], [alert('a', 'stalled')]), STANDARD_WORDS)).toEqual([])
  })
})

describe('diffNotices: tasks and sessions', () => {
  it('announces a task that just completed', () => {
    const before = snap([session('a', { tasks: [task('1', 'in_progress'), task('2', 'completed')] })])
    const after = snap([session('a', { tasks: [task('1', 'completed'), task('2', 'completed')] })])
    expect(diffNotices(before, after, STANDARD_WORDS)).toEqual([
      expect.objectContaining({ key: 'a:task:1', kind: 'task-done', sessionId: 'a', line: 'Task 1' }),
    ])
  })

  it('announces a task created already completed in a known session', () => {
    const before = snap([session('a')])
    const after = snap([session('a', { tasks: [task('1', 'completed')] })])
    expect(diffNotices(before, after, STANDARD_WORDS).map((n) => n.kind)).toEqual(['task-done'])
  })

  it('does not announce the finished tasks of a session that just appeared', () => {
    const after = snap([session('b', { tasks: [task('1', 'completed')] })])
    expect(diffNotices(snap([]), after, STANDARD_WORDS).map((n) => n.kind)).toEqual(['session-opened'])
  })

  it('announces sessions that open and close', () => {
    const before = snap([session('a')])
    const after = snap([session('b')])
    expect(diffNotices(before, after, STANDARD_WORDS).map((n) => [n.kind, n.title])).toEqual([
      ['session-opened', 'Case b'],
      ['session-closed', 'Case a'],
    ])
  })
})
