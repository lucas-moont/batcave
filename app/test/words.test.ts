import { describe, expect, it } from 'vitest'
import { trayLook } from '../src/main/trayMenu'
import { diffNotices } from '../src/shared/notices'
import type { AttentionItem, SessionSnapshot, StoreSnapshot } from '../src/shared/types'
import { attentionCopy, caseHeader } from '../src/shared/view'
import { STANDARD_TERMS, STANDARD_WORDS, type Words } from '../src/shared/words'

/** A Lexicon in the style of the jury's §5: Nolan's ops, a renamed stamp and count. */
const opsWords: Words = {
  ...STANDARD_WORDS,
  terms: {
    ...STANDARD_WORDS.terms,
    case: { one: 'Op', many: 'Ops' },
    needsYou: { label: 'On you', count: (n) => `${n} on you` },
    stamp: { ...STANDARD_WORDS.terms.stamp, permission: 'Clearance', 'session-opened': 'Op opened' },
  },
}

const permission: AttentionItem = {
  sessionId: 's1',
  kind: 'permission',
  at: '2026-10-10T20:00:00.000Z',
  toolName: 'Bash',
  detail: 'npm test',
}

const session = (id: string, over: Partial<SessionSnapshot> = {}): SessionSnapshot =>
  ({ sessionId: id, status: 'idle', tasks: [], messages: [], ...over }) as SessionSnapshot

const snapshot = (sessions: SessionSnapshot[], attention: AttentionItem[] = []): StoreSnapshot =>
  ({ sessions, attention }) as StoreSnapshot

describe('the standard needs-you count', () => {
  it('counts what needs you, in the singular for one', () => {
    expect(STANDARD_TERMS.needsYou.count(1)).toBe('1 needs you')
    expect(STANDARD_TERMS.needsYou.count(5)).toBe('5 need you')
  })
})

describe('the words', () => {
  it("are a Theme's own when it passes them", () => {
    expect(attentionCopy(permission, opsWords).stamp).toBe('Clearance')
    expect(caseHeader(session('s1'), opsWords).title).toBe('Untitled op')
    const [opened] = diffNotices(snapshot([]), snapshot([session('s2')]), opsWords)
    expect(opened?.stamp).toBe('Op opened')
  })

  it('are the standard ones when nothing is passed', () => {
    expect(attentionCopy(permission).stamp).toBe('Permission')
    expect(caseHeader(session('s1')).title).toBe('Untitled case')
    expect(diffNotices(snapshot([]), snapshot([session('s2')]))[0]?.stamp).toBe('Case opened')
  })

  // The tray takes no words at all: it can only speak the standard ones (CONTEXT.md, Lexicon).
  it('in the tray are always the standard ones', () => {
    expect(trayLook(snapshot([session('s1')], [permission])).tooltip).toBe('Bat-Signal · 1 needs you')
  })
})
