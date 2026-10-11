import { normalizeAccelerator } from './accelerator'
import { bool, clamp, isRecord, num, obj, str, type Json } from './guards'
import { DEFAULT_THEME, isThemeId, type ThemeId } from './themes'

export const OPACITY_MIN = 0.5
export const OPACITY_MAX = 1

/** The kinds of news a Windows toast or a sound can carry, each switched on on its own. */
export const NEWS_GROUPS = ['needsYou', 'reply', 'taskDone', 'sessions'] as const
export type NewsGroup = (typeof NEWS_GROUPS)[number]

/** How news is announced beyond the Bat-Signal itself: all off until the user asks. */
export interface AnnouncePrefs {
  /** Windows toasts, per kind of news. */
  toast: Record<NewsGroup, boolean>
  sound: boolean
  /** Sound volume, 0 to 1. */
  volume: number
}

export interface Settings {
  /** Motion beyond the essentials (intro, rain, typewriter, flying mascot). */
  animations: boolean
  /** The rain falling behind everything. */
  rain: boolean
  alwaysOnTop: boolean
  /** Window opacity, OPACITY_MIN to OPACITY_MAX. */
  opacity: number
  /** The version of Batman Bat-Signal wears (shared/themes.ts). */
  theme: ThemeId
  /** How the panel reads: as case files (the approved layout) or as one typed night report. */
  layout: PanelLayout
  /** The global shortcut that opens and folds Bat-Signal, as Electron writes it; '' for none. */
  shortcut: string
  announce: AnnouncePrefs
}

export type PanelLayout = 'files' | 'report'

/** One switch per kind of news, set by `pick`: every kind, and no other key. */
const toastMap = (pick: (group: NewsGroup) => boolean): AnnouncePrefs['toast'] =>
  Object.fromEntries(NEWS_GROUPS.map((group) => [group, pick(group)])) as AnnouncePrefs['toast']

export const DEFAULT_SETTINGS: Settings = {
  animations: true,
  rain: true,
  alwaysOnTop: true,
  opacity: 1,
  theme: DEFAULT_THEME,
  layout: 'files',
  shortcut: 'Ctrl+Alt+B',
  announce: {
    toast: toastMap(() => false),
    sound: false,
    volume: 0.6,
  },
}

function parseAnnounce(raw: unknown, defaults: AnnouncePrefs): AnnouncePrefs {
  const o = obj(raw)
  const toast = obj(o['toast'])
  return {
    toast: toastMap((group) => bool(toast[group]) ?? defaults.toast[group]),
    sound: bool(o['sound']) ?? defaults.sound,
    volume: clamp(num(o['volume']) ?? defaults.volume, 0, 1),
  }
}

/** A shortcut as settings hold it: written the one way, '' for none, undefined if it is no shortcut. */
const parseShortcut = (raw: unknown): string | undefined => {
  const text = str(raw)
  return text && normalizeAccelerator(text)
}

const parseLayout = (raw: unknown): PanelLayout | undefined =>
  raw === 'files' || raw === 'report' ? raw : undefined

/**
 * Settings from untrusted JSON: unknown keys dropped, bad values replaced by the fallback (the
 * defaults for a file, the current settings for a patch).
 */
export function parseSettings(raw: unknown, fallback: Settings = DEFAULT_SETTINGS): Settings {
  const o = obj(raw)
  return {
    animations: bool(o['animations']) ?? fallback.animations,
    rain: bool(o['rain']) ?? fallback.rain,
    alwaysOnTop: bool(o['alwaysOnTop']) ?? fallback.alwaysOnTop,
    opacity: clamp(num(o['opacity']) ?? fallback.opacity, OPACITY_MIN, OPACITY_MAX),
    theme: isThemeId(o['theme']) ? o['theme'] : fallback.theme,
    layout: parseLayout(o['layout']) ?? fallback.layout,
    shortcut: parseShortcut(o['shortcut']) ?? fallback.shortcut,
    announce: parseAnnounce(o['announce'], fallback.announce),
  }
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

/** A change to some settings: any one switch, down to a single toast, leaving the rest as they are. */
export type SettingsPatch = DeepPartial<Settings>

/** How many kinds of news are picked for a Windows toast. */
export const toastsOn = (toast: AnnouncePrefs['toast']): number =>
  NEWS_GROUPS.filter((group) => toast[group]).length

/** The patch that picks every kind of news for a Windows toast, or none (the "All notifications" switch). */
export const everyToast = (on: boolean): SettingsPatch => ({
  announce: { toast: toastMap(() => on) },
})

/**
 * An untrusted patch laid over a value, key by key, all the way down: a value of the wrong type
 * (or none) keeps the current one, and only keys the settings already have are taken, so no
 * __proto__ gets in. A map that must gain keys (per-project rules, one day) needs its own rule.
 */
function mergePatch(current: unknown, patch: unknown): unknown {
  if (!isRecord(current)) return typeof patch === typeof current ? patch : current
  if (!isRecord(patch)) return current
  const merged: Json = { ...current }
  for (const [key, value] of Object.entries(patch))
    if (Object.hasOwn(current, key)) merged[key] = mergePatch(current[key], value)
  return merged
}

/** Applies an untrusted partial update, validated like everything else: a bad value keeps the current one. */
export const applySettingsPatch = (current: Settings, patch: unknown): Settings =>
  parseSettings(mergePatch(current, patch), current)

/** Which way a notice card opens from the disc: up and left unless the display has no room. */
export interface NoticeLayout {
  below: boolean
  right: boolean
}

/** What can be on screen: the Bat-Signal disc at rest, the full panel, or the narrow watch strip. */
export type ViewMode = 'signal' | 'panel' | 'watch'
/** The views, or nothing but the tray icon: hiding is the main process's call (the tray, closing). */
export type WindowMode = ViewMode | 'hidden'
/** What the disc opens: the full panel or the watch strip, whichever was used last. */
export type OpenMode = Extract<ViewMode, 'panel' | 'watch'>

export const isOpenMode = (mode: WindowMode): mode is OpenMode => mode === 'panel' || mode === 'watch'

/** A view a page asks for. */
export const parseViewMode = (raw: unknown): ViewMode | undefined =>
  raw === 'signal' || raw === 'panel' || raw === 'watch' ? raw : undefined
