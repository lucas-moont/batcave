// The window's link to the main process. Without the preload bridge a stand-in takes over:
// in a plain browser (design review) or when asked with #demo / #demo-quiet / #demo-busy / #demo-news (and -watch for the
// strip, -report for the night report, -silent for sessions the plugin never heard from)
// (screenshots) it serves the made-up Gotham night; inside the real app a missing bridge is an error, and the
// window stays empty rather than showing fake sessions as if they were real.
import { beforeNewsDemoSnapshot, busyDemoSnapshot, demoSnapshot, quietDemoSnapshot } from '@shared/demo'
import {
  applySettingsPatch,
  DEFAULT_SETTINGS,
  isOpenMode,
  type OpenMode,
  type Settings,
  type WindowMode,
} from '@shared/settings'
import type { AppStatus } from '@shared/status'
import { themeFromFlags } from '@shared/themes'
import type { StoreSnapshot } from '@shared/types'
import type { BatSignalApi } from '../../preload/index'

const EMPTY: StoreSnapshot = { sessions: [], attention: [] }

/** Both windows load the same page; the query says which one this is. */
export const isSignalView = new URLSearchParams(location.search).get('view') === 'signal'

/** The demo flags in the hash, word by word (#demo-watch-report → demo, watch, report). */
const flags = new Set(location.hash.slice(1).split('-'))

/** A value with listeners: what the main process keeps for real, kept in memory. */
function observable<T>(initial: T) {
  let value = initial
  const listeners = new Set<(v: T) => void>()
  return {
    get: async () => value,
    set: (next: T) => {
      value = next
      listeners.forEach((l) => l(value))
    },
    current: () => value,
    on: (callback: (v: T) => void) => {
      listeners.add(callback)
      return () => listeners.delete(callback)
    },
  }
}

/** NEWS_DELAY_MS after loading, #demo-news turns the night into the next one (a notice for the signal). */
const NEWS_DELAY_MS = 800

function standIn(first: StoreSnapshot, next?: StoreSnapshot): BatSignalApi {
  // -silent: the plugin has not been heard from (see PluginHint).
  const heard = (s: StoreSnapshot) =>
    flags.has('silent') ? { ...s, unheard: s.sessions.map((x) => x.sessionId) } : s
  const snapshot = observable(heard(first))
  if (next) setTimeout(() => snapshot.set(heard(next)), NEWS_DELAY_MS)
  // #demo-report opens in the night report layout; a Theme's flag (#demo-vengeance) wears that Theme.
  const settings = observable<Settings>({
    ...DEFAULT_SETTINGS,
    theme: themeFromFlags(flags) ?? DEFAULT_SETTINGS.theme,
    layout: flags.has('report') ? 'report' : DEFAULT_SETTINGS.layout,
  })
  // The stand-in holds the shortcut it is given: no other app competes for it here.
  let startup: AppStatus['startup'] = 'off'
  const statusOf = ({ shortcut }: Settings): AppStatus => ({
    shortcut: { accelerator: shortcut, state: shortcut ? 'active' : 'off' },
    startup,
  })
  const status = observable(statusOf(settings.current()))
  settings.on((next) => status.set(statusOf(next)))
  const mode = observable<WindowMode>(isSignalView ? 'signal' : flags.has('watch') ? 'watch' : 'panel')
  let lastOpened: OpenMode = 'panel'
  return {
    getSnapshot: snapshot.get,
    onSnapshot: snapshot.on,
    markSeen: () => undefined,
    goToTerminal: async () => 'copied',
    warmTerminal: () => undefined,
    getSettings: settings.get,
    setSettings: (patch) => settings.set(applySettingsPatch(settings.current(), patch)),
    onSettings: settings.on,
    getStatus: status.get,
    onStatus: status.on,
    recordShortcut: () => undefined,
    refreshStatus: () => undefined,
    setStartWithWindows: (on) => {
      startup = on ? 'on' : 'off'
      status.set(statusOf(settings.current()))
    },
    getMode: mode.get,
    setMode: (next) => {
      if (isOpenMode(next)) lastOpened = next
      mode.set(next)
    },
    onFocusCase: () => () => undefined,
    onOpenSettings: () => () => undefined,
    onCue: () => () => undefined,
    setNoticeOut: async () => ({ below: false, right: false }),
    setInteractive: () => undefined,
    moveSignalBy: () => undefined,
    onMode: mode.on,
    reopen: () => mode.set(lastOpened),
    setWatchHeight: () => undefined,
    hide: () => window.close(),
  }
}

function pickStandIn(): BatSignalApi {
  const inElectron = navigator.userAgent.includes('Electron')
  if (inElectron && !flags.has('demo')) {
    console.error('[bat-signal] preload bridge missing: no data source')
    return standIn(EMPTY)
  }
  if (flags.has('quiet')) return standIn(quietDemoSnapshot())
  if (flags.has('busy')) return standIn(busyDemoSnapshot())
  if (flags.has('news')) return standIn(beforeNewsDemoSnapshot(), demoSnapshot())
  return standIn(demoSnapshot())
}

export const batSignal: BatSignalApi = (window as { batSignal?: BatSignalApi }).batSignal ?? pickStandIn()
