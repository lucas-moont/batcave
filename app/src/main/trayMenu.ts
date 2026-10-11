// What the tray icon shows and offers, from the snapshot and the mode. Pure, so it is tested
// without a tray (tray.ts turns it into Electron's icon, tooltip and menu). The tray speaks the
// standard words only, whatever the Theme: it takes no words to speak any other.
import type { ViewMode, WindowMode } from '../shared/settings'
import type { StoreSnapshot } from '../shared/types'
import { STANDARD_TERMS, TRAY_WORDS as say } from '../shared/words'

/** The icon lights up while something needs you, like the disc. */
export function trayLook({ attention }: StoreSnapshot): { lit: boolean; tooltip: string } {
  const count = attention.length
  return {
    lit: count > 0,
    tooltip: `${say.name} · ${count ? STANDARD_TERMS.needsYou.count(count) : say.allQuiet}`,
  }
}

export type TrayAction = 'showHide' | ViewMode | 'settings' | 'quit'

/** A menu line, or a separator. A line with `checked` is one of a radio group. */
export type TrayItem = 'separator' | { label: string; action: TrayAction; checked?: boolean }

export function trayMenu(mode: WindowMode): TrayItem[] {
  return [
    { label: mode === 'hidden' ? say.show : say.hide, action: 'showHide' },
    'separator',
    { label: say.disc, action: 'signal', checked: mode === 'signal' },
    { label: say.panel, action: 'panel', checked: mode === 'panel' },
    { label: say.watch, action: 'watch', checked: mode === 'watch' },
    'separator',
    { label: say.settings, action: 'settings' },
    'separator',
    { label: say.quit, action: 'quit' },
  ]
}
