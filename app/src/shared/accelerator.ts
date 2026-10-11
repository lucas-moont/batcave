// The global shortcut as Electron writes it ("Ctrl+Alt+B"): recorded from a key press in the
// settings sheet, read back from settings.json, and shown as keycaps. One rule for all three, so a
// shortcut the sheet records is one the main process can register, and the other way round.

/**
 * What a keydown carries that matters here. A letter is named as the layout types it (key),
 * since Windows registers letters that way; every other key by its place (code).
 */
export interface KeyLike {
  code: string
  key: string
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  metaKey: boolean
}

export type Recorded =
  /** Only modifiers so far: keep listening. */
  | { kind: 'partial' }
  /** Esc: leave the shortcut as it was. */
  | { kind: 'cancel' }
  /** Backspace or Delete: no shortcut. */
  | { kind: 'clear' }
  | { kind: 'invalid'; problem: ShortcutProblem }
  | { kind: 'ok'; accelerator: string }

/** Why keys can't be a shortcut (the settings sheet says it in words): no Ctrl, Alt or Win; a key
 * a shortcut can't end in; or a combination this keyboard types a character with. */
export type ShortcutProblem = { why: 'no-trigger' } | { why: 'key' } | { why: 'typed'; char: string }

const MODIFIERS = ['Ctrl', 'Alt', 'Shift', 'Super'] as const
type Modifier = (typeof MODIFIERS)[number]

const MODIFIER_ALIASES: Record<string, Modifier> = {
  ctrl: 'Ctrl',
  control: 'Ctrl',
  cmdorctrl: 'Ctrl',
  commandorcontrol: 'Ctrl',
  alt: 'Alt',
  option: 'Alt',
  shift: 'Shift',
  super: 'Super',
  meta: 'Super',
  win: 'Super',
}

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i)
/** The modifiers that keep a shortcut from being typing. */
const TRIGGERS = ['Ctrl', 'Alt', 'Super'] as const satisfies readonly Modifier[]

/** The keys a shortcut may end in, by KeyboardEvent.code, with their Electron names. */
const KEYS = new Map<string, string>([
  ...[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((letter) => [`Key${letter}`, letter] as const),
  ...range(0, 9).map((d) => [`Digit${d}`, `${d}`] as const),
  ...range(0, 9).map((d) => [`Numpad${d}`, `num${d}`] as const),
  ...range(1, 24).map((n) => [`F${n}`, `F${n}`] as const),
  ['ArrowUp', 'Up'],
  ['ArrowDown', 'Down'],
  ['ArrowLeft', 'Left'],
  ['ArrowRight', 'Right'],
  ...['Space', 'Home', 'End', 'PageUp', 'PageDown', 'Insert'].map((k): [string, string] => [k, k]),
])
/** Electron key names, by their lowercase spelling (settings.json may be written by hand). */
const KEY_NAMES = new Map([...KEYS.values()].map((name) => [name.toLowerCase(), name]))

const MODIFIER_CODES = /^(Control|Alt|Shift|Meta)(Left|Right)$/

/** F13 to F24 type nothing, so they may stand alone; anything else needs Ctrl or Alt (or Win). */
const standsAlone = (key: string) => /^F(1[3-9]|2[0-4])$/.test(key)

function compose(modifiers: ReadonlySet<Modifier>, key: string): Recorded {
  if (!standsAlone(key) && !TRIGGERS.some((m) => modifiers.has(m)))
    return { kind: 'invalid', problem: { why: 'no-trigger' } }
  return { kind: 'ok', accelerator: [...MODIFIERS.filter((m) => modifiers.has(m)), key].join('+') }
}

export function acceleratorFromKey(e: KeyLike): Recorded {
  if (MODIFIER_CODES.test(e.code)) return { kind: 'partial' }
  const bare = !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey
  if (bare && e.code === 'Escape') return { kind: 'cancel' }
  if (bare && (e.code === 'Backspace' || e.code === 'Delete')) return { kind: 'clear' }
  let key = KEYS.get(e.code)
  if (!key) return { kind: 'invalid', problem: { why: 'key' } }
  if (/^Key[A-Z]$/.test(e.code)) {
    if (/^[a-z]$/i.test(e.key)) key = e.key.toUpperCase()
    // Ctrl+Alt is AltGr on many layouts: if it typed a character, typing needs that combination.
    else if (e.ctrlKey && e.altKey && e.key.length === 1)
      return { kind: 'invalid', problem: { why: 'typed', char: e.key } }
  }
  const modifiers = new Set<Modifier>()
  if (e.ctrlKey) modifiers.add('Ctrl')
  if (e.altKey) modifiers.add('Alt')
  if (e.shiftKey) modifiers.add('Shift')
  if (e.metaKey) modifiers.add('Super')
  return compose(modifiers, key)
}

/** A shortcut from untrusted text, written the one way; undefined if it is no valid shortcut. */
export function normalizeAccelerator(raw: string): string | undefined {
  const tokens = raw.split('+').map((t) => t.trim().toLowerCase())
  const modifiers = new Set<Modifier>()
  let key: string | undefined
  for (const token of tokens) {
    const modifier = MODIFIER_ALIASES[token]
    if (modifier) {
      if (modifiers.has(modifier)) return undefined
      modifiers.add(modifier)
    } else {
      const name = KEY_NAMES.get(token)
      if (!name || key) return undefined
      key = name
    }
  }
  if (!key) return undefined
  const recorded = compose(modifiers, key)
  return recorded.kind === 'ok' ? recorded.accelerator : undefined
}

/** The keys to draw for a shortcut; the Windows key by the name on the keyboard. */
export const keycaps = (accelerator: string): string[] =>
  accelerator.split('+').map((key) => (key === 'Super' ? 'Win' : key))
