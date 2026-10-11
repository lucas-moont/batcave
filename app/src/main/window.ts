import { join } from 'node:path'
import { app, BrowserWindow, screen } from 'electron'
import type { CuePlay } from '../shared/announcer'
import { num, obj } from '../shared/guards'
import { IPC } from '../shared/ipc'
import {
  isOpenMode,
  type NoticeLayout,
  type OpenMode,
  type Settings,
  type ViewMode,
  type WindowMode,
} from '../shared/settings'
import type { AppStatus } from '../shared/status'
import { THEMES, type ThemeId } from '../shared/themes'
import type { StoreSnapshot } from '../shared/types'
import { DEV_SERVER, isOwnPage, RENDERER_FILE } from './appIpc'
import { jsonFile } from './jsonFile'
import { nextMode, type ModeAction } from './modes'
import {
  anchoredRect,
  cornerOf,
  noticePlacement,
  perchRect,
  resolveAnchor,
  type Anchor,
  type Size,
} from './windowState'

const MARGIN = 16
/** A corner companion, not a big-screen app: the panel opens small. */
const PANEL = { width: 320, height: 440, minWidth: 300, minHeight: 360 }
/** The watch strip: narrow, as tall as its rows ask for (see setWatchHeight). */
const WATCH = { width: 280, minHeight: 56, initialHeight: 160, maxShare: 0.7 }
/** The signal window: just the disc, or the disc with a notice card next to it. */
const SIGNAL = { disc: { width: 96, height: 96 }, notice: { width: 320, height: 230 } }
/** In watch mode the transparent signal window is Bat-Clawd's perch, on the strip's top edge. */
const PERCH = { width: 88, height: 56 }
/** How long the strip, opening, waits for its page to measure it before showing anyway. */
const WATCH_SHOW_FALLBACK_MS = 150
/**
 * How often visible windows reassert always-on-top. Windows' screenshot overlay can demote the
 * window that was active, dropping it behind everything; reasserting is one cheap z-order call.
 */
const ON_TOP_EVERY_MS = 3000

/** How a mode shows the panel window (the full panel and the watch strip share it). */
interface PanelSpec {
  /** As the user dragged it (the panel), or fitted to its rows (the strip, see setWatchHeight). */
  size: 'dragged' | 'fitted'
  minSize: Size
  resizable: boolean
  /**
   * Whether it takes the keyboard. The strip never does: Windows demotes the active window behind
   * everything after a screenshot, and the strip needs no keys (its rows take clicks regardless).
   */
  focusable: boolean
}

/**
 * What each mode does with the two windows: the panel window shown one way or hidden, and the
 * signal window as the disc, as Bat-Clawd's perch on the strip's top edge, or hidden.
 */
const MODES: Record<WindowMode, { panel?: PanelSpec; signal: 'disc' | 'perch' | 'hidden' }> = {
  signal: { signal: 'disc' },
  panel: {
    panel: {
      size: 'dragged',
      minSize: { width: PANEL.minWidth, height: PANEL.minHeight },
      resizable: true,
      focusable: true,
    },
    signal: 'hidden',
  },
  watch: {
    panel: {
      size: 'fitted',
      minSize: { width: WATCH.width, height: WATCH.minHeight },
      resizable: false,
      focusable: false,
    },
    signal: 'perch',
  },
  // Nothing on screen but the tray icon.
  hidden: { signal: 'hidden' },
}

interface Place {
  anchor?: Anchor
  panel: Size
  open: OpenMode
}

const pair = <A extends string, B extends string>(o: Record<string, unknown>, a: A, b: B) => {
  const [x, y] = [num(o[a]), num(o[b])]
  return x === undefined || y === undefined ? undefined : ({ [a]: x, [b]: y } as Record<A | B, number>)
}

/** Reads window.json, including the { x, y, width, height } that the single window used to save. */
function parsePlace(raw: unknown): Place {
  const o = obj(raw)
  const old = pair(o, 'x', 'y')
  const oldSize = pair(o, 'width', 'height')
  const anchor =
    pair(obj(o['anchor']), 'x', 'y') ?? (old && oldSize ? cornerOf({ ...old, ...oldSize }) : undefined)
  const panel = pair(obj(o['panel']), 'width', 'height') ??
    oldSize ?? { width: PANEL.width, height: PANEL.height }
  return { anchor, panel, open: o['open'] === 'watch' ? 'watch' : 'panel' }
}

const placeFile = jsonFile('window.json', parsePlace)

function displaysPrimaryFirst() {
  const primary = screen.getPrimaryDisplay()
  return [primary, ...screen.getAllDisplays().filter((d) => d.id !== primary.id)]
}

/** Opens a window's page wearing the Theme, so its first frame already has the Theme's colors. */
function load(win: BrowserWindow, view: 'panel' | 'signal', theme: ThemeId): void {
  if (DEV_SERVER) void win.loadURL(`${DEV_SERVER}?view=${view}&theme=${theme}`)
  else void win.loadFile(RENDERER_FILE, { query: { view, theme } })
}

const webPreferences = {
  preload: join(__dirname, '../preload/index.js'),
  sandbox: true,
  contextIsolation: true,
}

/**
 * Bat-Signal's two windows, both hanging from one corner: the signal disc (transparent, the
 * resting form, grows when a notice card comes out) and the panel. Only one shows at a time;
 * the main process owns which (the mode) and the corner.
 */
export class BatSignalWindows {
  private readonly panel: BrowserWindow
  private readonly signal: BrowserWindow
  private current: WindowMode = 'signal'
  private anchor: Anchor
  private panelSize: Size
  /** What the disc opens: the panel or the strip, whichever the user picked last. */
  private lastOpened: OpenMode
  /** What was showing when Bat-Signal hid, to show again. Never saved: every launch wakes as the disc. */
  private beforeHidden: ViewMode = 'signal'
  private watchHeight: number = WATCH.initialHeight
  private noticeOut = false
  private latest?: StoreSnapshot
  private quitting = false
  private onTop = true
  /** Set while the strip waits for its first height (see setMode). */
  private stripPending?: NodeJS.Timeout

  constructor(settings: Settings) {
    const place = placeFile.load()
    this.anchor = resolveAnchor(place.anchor, displaysPrimaryFirst(), MARGIN)
    this.panelSize = place.panel
    this.lastOpened = place.open

    this.panel = new BrowserWindow({
      ...this.rect(this.panelSize),
      minWidth: PANEL.minWidth,
      minHeight: PANEL.minHeight,
      frame: false,
      resizable: true,
      skipTaskbar: true,
      show: false,
      // What shows before the page paints: the Theme's ground, so opening never flashes another color.
      backgroundColor: THEMES[settings.theme].ground,
      // Otherwise Electron reports the never-shown panel as visible and its loops keep running.
      paintWhenInitiallyHidden: false,
      webPreferences,
    })
    this.signal = new BrowserWindow({
      ...this.rect(SIGNAL.disc),
      frame: false,
      transparent: true,
      resizable: false,
      hasShadow: false,
      skipTaskbar: true,
      show: false,
      webPreferences,
    })
    this.apply(settings)

    // ready-to-show did not fire for this transparent window in testing; show it once it has loaded.
    this.signal.webContents.once('did-finish-load', () => this.setMode(this.current))
    // The panel is moved and resized by hand: its bottom-right corner becomes the anchor.
    this.panel.on('moved', () => this.followPanel())
    // Bat-Clawd rides along while the strip is dragged.
    this.panel.on('move', () => {
      if (MODES[this.current].signal === 'perch') this.placePerch()
    })
    this.panel.on('resized', () => this.followPanel())
    const onTopTimer = setInterval(() => this.keepOnTop(), ON_TOP_EVERY_MS)
    app.on('before-quit', () => {
      clearInterval(onTopTimer)
      this.cancelStrip() // a strip held back must not show into windows on their way out
      this.quitting = true
      this.saveNow()
    })
    // Alt+F4 on the panel folds it away; on the disc it hides Bat-Signal to the tray, as the
    // close button does. Quitting is the tray's Quit.
    this.panel.on('close', (e) => {
      if (this.quitting) return
      e.preventDefault()
      this.act('fold')
    })
    this.signal.on('close', (e) => {
      if (this.quitting) return
      e.preventDefault()
      this.act('close')
    })
    // Windows ending the session (shutting down, restarting, signing out) closes for real: hiding
    // to the tray instead would keep it waiting on Bat-Signal.
    for (const win of [this.panel, this.signal])
      win.on('session-end', () => {
        this.quitting = true
        app.quit()
      })

    load(this.panel, 'panel', settings.theme)
    load(this.signal, 'signal', settings.theme)
  }

  get mode(): WindowMode {
    return this.current
  }

  /** The panel window is on screen, as the panel or the strip. */
  private get panelShown(): boolean {
    return Boolean(MODES[this.current].panel) && !this.panel.isDestroyed()
  }

  /** The panel is the window in front (the strip never takes the focus): the user sees the news already. */
  get panelFocused(): boolean {
    return this.panelShown && this.panel.isFocused()
  }

  /**
   * Sends to one page, unless its window is already gone (the app is quitting) or holds a page that
   * is not Bat-Signal's (the windows refuse to leave it, but sessions are never sent on that alone).
   */
  private send(win: BrowserWindow, channel: string, payload?: unknown): void {
    if (!win.isDestroyed() && isOwnPage(win.webContents.getURL())) win.webContents.send(channel, payload)
  }

  /** Sends to every page (both windows render the same data). */
  private broadcast(channel: string, payload: unknown): void {
    for (const win of [this.panel, this.signal]) this.send(win, channel, payload)
  }

  /**
   * A new store snapshot. The signal always gets it (it compares snapshots to find news); the
   * panel window, hidden while the disc rests, gets only the latest one when it opens (as panel or
   * strip) instead of re-rendering for nothing.
   */
  publish(snapshot: StoreSnapshot): void {
    this.latest = snapshot
    this.send(this.signal, IPC.snapshot, snapshot)
    if (this.panelShown) this.send(this.panel, IPC.snapshot, snapshot)
  }

  /** A sound, to the signal window: the page that is always loaded. */
  cue(play: CuePlay): void {
    this.send(this.signal, IPC.cue, play)
  }

  /** What is happening now (the shortcut held or taken), to every page. */
  publishStatus(status: AppStatus): void {
    this.broadcast(IPC.status, status)
  }

  apply(settings: Settings): void {
    this.onTop = settings.alwaysOnTop
    // The signal window is transparent and keeps no ground; the pages change Theme themselves.
    this.panel.setBackgroundColor(THEMES[settings.theme].ground)
    for (const win of [this.panel, this.signal]) {
      win.setAlwaysOnTop(settings.alwaysOnTop, 'floating')
      win.setOpacity(settings.opacity)
    }
    this.broadcast(IPC.settings, settings)
  }

  private keepOnTop(): void {
    if (!this.onTop) return
    // Only the panel window: the signal window is click-through (as the perch) or inactive (as
    // the disc), and the overlay leaves those alone; toggling it would only redraw a transparent window.
    const win = this.panel
    // isAlwaysOnTop reads Windows' own flag, so asking is free; setting it again makes Windows
    // redraw the windows, about 1% of a core every 3 s, so it happens only once the overlay cleared it.
    if (win.isDestroyed() || !win.isVisible() || win.isAlwaysOnTop()) return
    // Electron skips a repeat of the same level, so drop it and set it again to reach Windows.
    win.setAlwaysOnTop(false)
    win.setAlwaysOnTop(true, 'floating')
  }

  /** Opens what the disc opened last: the panel or the watch strip. */
  reopen(): void {
    this.setMode(this.lastOpened)
  }

  /**
   * Does what the user's action leads to (see modes.ts): the shortcut, the tray, closing, a
   * relaunch. None of them is the user picking a view for the disc to open.
   */
  act(action: ModeAction): void {
    const { current: mode, lastOpened, beforeHidden } = this
    this.setMode(nextMode({ mode, lastOpened, beforeHidden }, action), undefined, false)
  }

  /** Opens the panel with its settings sheet up (the tray's Settings…). */
  openSettings(): void {
    this.setMode('panel', undefined, false)
    this.send(this.panel, IPC.openSettings)
  }

  /**
   * Shows the panel (optionally on one case) or the watch strip, folds back into the signal, or
   * hides. `picked`: the user chose this view (a header button, the tray's Panel or Watch strip),
   * so the disc opens it from now on; a notice card opening one case is no such choice.
   */
  setMode(mode: WindowMode, focusSessionId?: string, picked = !focusSessionId): void {
    const spec = MODES[mode]
    const entering = mode !== this.current
    if (mode === 'hidden' && this.current !== 'hidden') this.beforeHidden = this.current
    // The strip opening anew is held back until its page has measured it (see setWatchHeight),
    // so it never shows at a stale height, or with the panel still in it, and then jumps.
    const holdStrip = entering && spec.panel?.size === 'fitted'
    if (entering) this.cancelStrip() // opening the strip again while it is held keeps the hold
    if (spec.signal !== 'disc') {
      // Leaving the disc (for the panel, the strip or the tray) silences the cards, and the
      // hidden page may never finish their exit: put the card's room and click-through away now.
      this.setClickThrough(false)
      this.noticeOut = false
    }
    if (spec.panel) {
      this.preparePanel(spec.panel)
      if (holdStrip) {
        // Out of sight and at the strip's width, so the page measures the rows it will show.
        this.panel.hide()
        this.panel.setBounds(this.watchRect())
      }
      // The latest snapshot before the mode, so the page lays out the sessions of now.
      if (this.latest) this.send(this.panel, IPC.snapshot, this.latest)
    } else {
      this.panel.hide()
    }
    if (entering) {
      this.current = mode
      // A held strip is news only to its own page for now: the disc stays the disc until the
      // strip shows, and turns into the perch then (revealStrip).
      if (holdStrip) this.send(this.panel, IPC.mode, mode)
      else this.broadcast(IPC.mode, mode)
    }
    if (spec.panel && focusSessionId) this.send(this.panel, IPC.focusCase, focusSessionId)
    if (holdStrip) this.stripPending = setTimeout(() => this.revealStrip(), WATCH_SHOW_FALLBACK_MS)
    else if (!this.stripPending) this.show()
    if (picked && isOpenMode(mode) && mode !== this.lastOpened) {
      this.lastOpened = mode
      this.scheduleSave()
    }
  }

  private preparePanel(spec: PanelSpec): void {
    this.panel.setResizable(spec.resizable)
    this.panel.setMinimumSize(spec.minSize.width, spec.minSize.height)
    this.panel.setFocusable(spec.focusable)
  }

  /** Puts both windows where the current mode wants them, and shows them. */
  private show(): void {
    const { panel, signal } = MODES[this.current]
    if (panel) {
      this.panel.setBounds(panel.size === 'dragged' ? this.rect(this.panelSize) : this.watchRect())
      if (panel.focusable) {
        this.panel.show()
        this.panel.focus()
      } else {
        this.panel.showInactive()
      }
    }
    if (signal === 'disc') {
      this.signal.setIgnoreMouseEvents(false) // the perch let every click through; the disc takes them
      this.placeSignal()
      this.signal.showInactive()
    } else if (signal === 'perch') {
      this.placePerch()
    } else {
      this.signal.hide()
    }
  }

  /** Shows the strip held back by setMode, at the height its page measured (or the last one). */
  private revealStrip(): void {
    this.cancelStrip()
    this.send(this.signal, IPC.mode, this.current)
    this.show()
  }

  private cancelStrip(): void {
    clearTimeout(this.stripPending)
    this.stripPending = undefined
  }

  /**
   * The signal page is about to show a card (or has hidden the last one): grow the window
   * around the disc, or shrink it back. Returns which way the card opens.
   */
  setNoticeOut(out: boolean): NoticeLayout {
    if (out !== this.noticeOut) {
      this.setClickThrough(out)
      this.noticeOut = out
      if (MODES[this.current].signal === 'disc') this.placeSignal()
    }
    const { below, right } = noticePlacement(this.anchor, SIGNAL, displaysPrimaryFirst())
    return { below, right }
  }

  /** While a card is out, the page turns clicks back on when the pointer is over the disc or the card. */
  setInteractive(interactive: boolean): void {
    if (this.noticeOut) this.signal.setIgnoreMouseEvents(!interactive, { forward: true })
  }

  /**
   * While a card is out, clicks on the window's transparent parts fall through to whatever is
   * underneath. Only then: forwarding the pointer to the page costs ~10% of a core on Windows,
   * and the disc alone leaves only small transparent corners.
   */
  private setClickThrough(on: boolean): void {
    this.signal.setIgnoreMouseEvents(on, { forward: true })
  }

  /** The disc is dragged by hand (a drag region would swallow its clicks). */
  moveSignalBy(dx: number, dy: number): void {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return
    // Keep the disc itself on screen, so dragging back works at once.
    const moved = { x: this.anchor.x + dx, y: this.anchor.y + dy }
    this.anchor = cornerOf(anchoredRect(moved, SIGNAL.disc, displaysPrimaryFirst()))
    this.placeSignal()
    this.scheduleSave()
  }

  /**
   * Bat-Clawd on the strip's top edge: the signal window, moved there and made fully click-through
   * (without forwarding, which would cost CPU). Hidden when the strip has no room above it.
   */
  private placePerch(): void {
    const rect = perchRect(this.panel.getBounds(), PERCH, displaysPrimaryFirst())
    if (!rect) return this.signal.hide()
    this.signal.setIgnoreMouseEvents(true)
    this.signal.setBounds(rect)
    this.signal.showInactive()
  }

  private watchRect() {
    return this.rect({ width: WATCH.width, height: this.watchHeight })
  }

  private rect(size: Size) {
    return anchoredRect(this.anchor, size, displaysPrimaryFirst())
  }

  /** The signal window at its current size: the disc, or the disc with a notice card. */
  private placeSignal(): void {
    this.signal.setBounds(
      this.noticeOut
        ? noticePlacement(this.anchor, SIGNAL, displaysPrimaryFirst()).rect
        : this.rect(SIGNAL.disc),
    )
  }

  /** The watch strip measured its rows: fit the window to them, growing up from the corner. */
  setWatchHeight(height: number): void {
    if (!Number.isFinite(height)) return
    const area = screen.getDisplayNearestPoint(this.anchor).workArea
    const next = Math.round(Math.min(Math.max(height, WATCH.minHeight), area.height * WATCH.maxShare))
    // The first height after the strip opens is its page saying it is ready (WatchStrip sends one
    // as it mounts): the strip shows now, at that height.
    if (this.stripPending) {
      this.watchHeight = next
      this.revealStrip()
      return
    }
    if (next === this.watchHeight) return
    this.watchHeight = next
    if (MODES[this.current].panel?.size === 'fitted') {
      this.panel.setBounds(this.watchRect())
      this.placePerch()
    }
  }

  private followPanel(): void {
    const panel = MODES[this.current].panel
    if (!panel) return
    const b = this.panel.getBounds()
    this.anchor = cornerOf(b)
    if (panel.size === 'dragged') this.panelSize = { width: b.width, height: b.height }
    this.scheduleSave()
  }

  private get place(): Place {
    return { anchor: this.anchor, panel: this.panelSize, open: this.lastOpened }
  }

  /** A move or resize: written once the window settles. */
  private scheduleSave(): void {
    placeFile.saveSoon(this.place)
  }

  private saveNow(): void {
    placeFile.save(this.place)
  }
}
