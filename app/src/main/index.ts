import { app, globalShortcut } from 'electron'
import { obj } from '../shared/guards'
import { IPC } from '../shared/ipc'
import { announce, emptyAnnouncer } from '../shared/announcer'
import { applySettingsPatch, parseViewMode, type Settings } from '../shared/settings'
import type { AppStatus } from '../shared/status'
import { startBatSignal } from './batSignal'
import { settingsFile } from './settings'
import { appIdFor } from './identity'
import { handleIpc, isOwnPage, onIpc } from './appIpc'
import { isLoginLaunch } from './loginItem'
import { createShortcut } from './shortcut'
import { createStartup } from './startup'
import { BatSignalCues } from './cues'
import { warmQuiet } from './quiet'
import { powershell } from './powershell'
import { BatSignalToasts } from './toasts'
import { migrateUserData } from './userData'
import { BatSignalTray } from './tray'
import { BatSignalWindows } from './window'

/** Brings Bat-Signal forward when it is launched again; nothing to bring until it has started. */
let summon = (): void => undefined

function start(): void {
  migrateUserData()
  let settings = settingsFile.load()
  const windows = new BatSignalWindows(settings)
  // Before anything can hide the windows: the tray is the way back.
  const tray = new BatSignalTray(windows)
  // A clicked toast opens its case, as a notice card does (or the panel, for a case gone); it is
  // not the user picking the panel for the disc to open.
  const toasts = new BatSignalToasts((sessionId) => windows.setMode('panel', sessionId, false))
  // The burst's sound, at the volume set when it plays; the switch and the panel are asked again
  // then, since either may have changed while Windows answered.
  const cues = new BatSignalCues((cue) => {
    if (!settings.announce.sound || windows.panelFocused) return false
    windows.cue({ cue, volume: settings.announce.volume })
    return true
  })
  // With sound on, the quiet check is made ready ahead, so the first sound is not late.
  if (settings.announce.sound) warmQuiet()
  // News is found once, and what each way of announcing it wants comes out of the same list.
  let announcer = emptyAnnouncer()
  const stop = startBatSignal((snapshot) => {
    windows.publish(snapshot)
    tray.update(snapshot)
    const out = announce(announcer, snapshot, {
      prefs: settings.announce,
      panelFocused: windows.panelFocused,
    })
    announcer = out.state
    toasts.add(out.toast)
    cues.add(out.sound)
  })
  // The global shortcut opens what the disc would, and folds it back (applied below, once the
  // status it tells of can be sent).
  const shortcut = createShortcut(
    globalShortcut,
    () => windows.act('shortcut'),
    () => publishStatus(),
  )
  // Starting with Windows: what Windows has (Task Manager can change it too), read when the
  // settings sheet, the one place that shows it, opens.
  const startup = createStartup(() => publishStatus())
  // What is happening now, read from each feature; sent to the pages only when it changed (each
  // feature keeps the same value until then).
  const readStatus = (): AppStatus => ({ shortcut: shortcut.status, startup: startup.state })
  let published = readStatus()
  function publishStatus(): void {
    const next = readStatus()
    if ((Object.keys(next) as (keyof AppStatus)[]).every((key) => next[key] === published[key])) return
    published = next
    windows.publishStatus(next)
  }
  shortcut.apply(settings.shortcut)

  /** New settings take effect: the one path for the settings sheet's patches and hand edits alike. */
  const adopt = (next: Settings, { touchesShortcut }: { touchesShortcut: boolean }) => {
    settings = next
    if (settings.announce.sound) warmQuiet()
    windows.apply(settings)
    // Only a change that names the shortcut touches it (and retries it, if another app had it).
    if (touchesShortcut) shortcut.apply(settings.shortcut)
  }

  handleIpc(IPC.getSettings, () => settings)
  onIpc(IPC.setSettings, (_event, patch: unknown) => {
    adopt(applySettingsPatch(settings, patch), { touchesShortcut: 'shortcut' in obj(patch) })
    settingsFile.saveSoon(settings)
  })
  // settings.json edited by hand (until the Theme picker, that's how a Theme changes) applies at once.
  settingsFile.watch((next) => adopt(next, { touchesShortcut: next.shortcut !== settings.shortcut }))
  handleIpc(IPC.getStatus, () => readStatus())
  // The settings sheet opened: what it shows is read again from Windows (Task Manager may have
  // moved the switch since); a change goes out as status.
  onIpc(IPC.refreshStatus, () => void startup.refresh())
  // While the settings sheet records a new shortcut, the current one must reach it as keys. A page
  // that reloads or dies mid-recording never says it stopped: its going ends the pause.
  let stopWatching = (): void => undefined
  const record = (on: boolean) => {
    stopWatching()
    shortcut.pause(on)
  }
  onIpc(IPC.recordShortcut, (event, on: unknown) => {
    record(on === true)
    if (on !== true) return
    const page = event.sender
    const resume = () => record(false)
    page.once('did-start-loading', resume)
    page.once('render-process-gone', resume)
    stopWatching = () => {
      page.off('did-start-loading', resume)
      page.off('render-process-gone', resume)
      stopWatching = () => undefined
    }
  })
  onIpc(IPC.setStartWithWindows, (_event, on: unknown) => startup.set(on === true))
  handleIpc(IPC.getMode, () => windows.mode)
  onIpc(IPC.setMode, (_event, mode: unknown, sessionId: unknown) => {
    const next = parseViewMode(mode)
    if (next) windows.setMode(next, typeof sessionId === 'string' ? sessionId : undefined)
  })
  handleIpc(IPC.noticeOut, (_event, out: unknown) => windows.setNoticeOut(out === true))
  onIpc(IPC.interactive, (_event, on: unknown) => windows.setInteractive(on === true))
  onIpc(IPC.moveSignal, (_event, dx: unknown, dy: unknown) => {
    if (typeof dx === 'number' && typeof dy === 'number') windows.moveSignalBy(dx, dy)
  })
  onIpc(IPC.reopen, () => windows.reopen())
  onIpc(IPC.watchHeight, (_event, height: unknown) => {
    if (typeof height === 'number') windows.setWatchHeight(height)
  })
  onIpc(IPC.hide, () => windows.act('close'))

  summon = () => windows.act('summon')
  // Written at before-quit: Windows ending the session may close the app before will-quit.
  app.once('before-quit', () => {
    settingsFile.flush()
    stop()
  })
  app.once('will-quit', () => {
    toasts.dispose()
    cues.dispose()
    powershell.close()
    shortcut.dispose()
  })
}

// A checkout keeps its settings, and the single-instance lock that lives with them, beside the
// installed app's: each runs once. A --user-data-dir given on the command line (a test instance) wins.
if (!app.isPackaged && !app.commandLine.hasSwitch('user-data-dir'))
  app.setPath('userData', `${app.getPath('userData')} Dev`)

// The windows show Bat-Signal's own page and nothing else: a dropped link or a redirect away from
// it is refused, and no page may open a window or a webview of its own.
app.on('web-contents-created', (_event, contents) => {
  const keepToApp = (event: Electron.Event, url: string) => {
    if (!isOwnPage(url)) event.preventDefault()
  }
  contents.on('will-navigate', keepToApp)
  contents.on('will-redirect', keepToApp)
  contents.setWindowOpenHandler(() => ({ action: 'deny' }))
  contents.on('will-attach-webview', (event) => event.preventDefault())
})

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.setAppUserModelId(appIdFor(app.isPackaged))
  // Launching Bat-Signal again (it runs once) brings it back instead of doing nothing; listened
  // for from the start, since a second launch can come while this one is still getting ready.
  // A launch at sign-in while Bat-Signal already runs (started by hand) changes nothing.
  app.on('second-instance', (_event, argv) => {
    if (!isLoginLaunch(argv)) summon()
  })
  void app.whenReady().then(start)
  app.on('window-all-closed', () => app.quit())
}
