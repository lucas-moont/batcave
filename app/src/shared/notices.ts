// What the Bat-Signal announces: news found by comparing two snapshots.
import {
  ATTENTION_URGENCY,
  type AttentionItem,
  type AttentionKind,
  type SessionSnapshot,
  type StoreSnapshot,
} from './types'
import { attentionCopy, caseHeader, folderName } from './view'
import type { Words } from './words'

/** The needs-you alerts worth announcing; a stalled task is not news. */
const ALERT_KINDS = ['permission', 'error', 'waiting', 'reply'] as const satisfies readonly AttentionKind[]
type AlertKind = (typeof ALERT_KINDS)[number]

export type NoticeKind = AlertKind | 'task-done' | 'session-opened' | 'session-closed'

export interface Notice {
  /** Stable identity, so the same news is never announced twice. */
  key: string
  kind: NoticeKind
  sessionId: string
  at: string
  /** The red ink stamp: the same words as on the panel's cards. */
  stamp: string
  /** The case it is about. */
  title: string
  /** One line of detail. */
  line: string
}

/** Most urgent first; alerts keep the needs-you list's order. */
export const NOTICE_URGENCY: Record<NoticeKind, number> = {
  ...(Object.fromEntries(ALERT_KINDS.map((k) => [k, ATTENTION_URGENCY[k]])) as Record<AlertKind, number>),
  'task-done': 10,
  'session-opened': 11,
  'session-closed': 12,
}

/** How many announced keys to remember: far more than ever change between two snapshots. */
const MEMORY = 500

/**
 * The notices not announced before, and the memory with them added: the most recent MEMORY keys,
 * or the very same memory when nothing is new.
 */
export function freshen(
  announced: ReadonlySet<string>,
  notices: readonly Notice[],
): { fresh: Notice[]; announced: ReadonlySet<string> } {
  const fresh = notices.filter((n) => !announced.has(n.key))
  if (!fresh.length) return { fresh, announced }
  return { fresh, announced: new Set([...announced, ...fresh.map((n) => n.key)].slice(-MEMORY)) }
}

/** Most urgent first, for a sort (a stable one keeps arrival order among equals). */
export const byUrgency = (a: Notice, b: Notice): number => NOTICE_URGENCY[a.kind] - NOTICE_URGENCY[b.kind]

/** News that needs the user, not just news. */
export const isUrgent = (kind: NoticeKind): boolean => NOTICE_URGENCY[kind] <= NOTICE_URGENCY.waiting

const isAnnounced = (a: AttentionItem): a is AttentionItem & { kind: AlertKind } =>
  (ALERT_KINDS as readonly string[]).includes(a.kind)

const alertKey = (a: AttentionItem) => `${a.sessionId}:${a.kind}:${a.at}`

/** News between two snapshots. The first snapshot announces nothing: it is the state, not news. */
export function diffNotices(prev: StoreSnapshot | undefined, next: StoreSnapshot, words: Words): Notice[] {
  if (!prev) return []
  const { terms, voice } = words
  const before = new Map(prev.sessions.map((s) => [s.sessionId, s]))
  const after = new Map(next.sessions.map((s) => [s.sessionId, s]))
  const title = (id: string) => {
    const s = after.get(id) ?? before.get(id)
    return s ? caseHeader(s, words).title : voice.unknown(terms)
  }
  const notice = (
    s: Pick<SessionSnapshot, 'sessionId'>,
    fields: Omit<Notice, 'sessionId' | 'title'>,
  ): Notice => ({
    ...fields,
    sessionId: s.sessionId,
    title: title(s.sessionId),
  })

  const known = new Set(prev.attention.map(alertKey))
  const alerts = next.attention
    .filter(isAnnounced)
    .filter((a) => !known.has(alertKey(a)))
    .map((a) => notice(a, { key: alertKey(a), kind: a.kind, at: a.at, ...attentionCopy(a, words) }))

  const tasks: Notice[] = []
  const opened: Notice[] = []
  for (const s of next.sessions) {
    const old = before.get(s.sessionId)
    if (!old) {
      // A session that just appeared: announce it, not the work it already finished.
      opened.push(
        notice(s, {
          key: `${s.sessionId}:opened`,
          kind: 'session-opened',
          at: s.lastActivityAt ?? '',
          stamp: terms.stamp['session-opened'],
          line: folderName(s.cwd ?? '') || voice.noticeLine.opened,
        }),
      )
      continue
    }
    const wasDone = new Set(old.tasks.filter((t) => t.status === 'completed').map((t) => t.id))
    for (const t of s.tasks) {
      if (t.status !== 'completed' || wasDone.has(t.id)) continue
      tasks.push(
        notice(s, {
          key: `${s.sessionId}:task:${t.id}`,
          kind: 'task-done',
          at: t.history.at(-1)?.at ?? '',
          stamp: terms.stamp['task-done'],
          line: t.subject,
        }),
      )
    }
  }
  const closed = prev.sessions
    .filter((s) => !after.has(s.sessionId))
    .map((s) =>
      notice(s, {
        key: `${s.sessionId}:closed`,
        kind: 'session-closed',
        at: s.lastActivityAt ?? '',
        stamp: terms.stamp['session-closed'],
        line: voice.noticeLine.closed,
      }),
    )

  return [...alerts, ...tasks, ...opened, ...closed]
}
