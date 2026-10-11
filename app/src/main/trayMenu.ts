// What the tray icon shows and offers, from the snapshot and the mode. Pure, so it is tested
// without a tray (tray.ts turns it into Electron's icon, tooltip and menu). The tray speaks the
// standard words only, whatever the Theme: it takes no words to speak any other.
import type { ViewMode, WindowMode } from '../shared/settings'
import type { StoreSnapshot } from '../shared/types'
import { STANDARD_WORDS } from '../shared/words'

const { terms, voice } = STANDARD_WORDS

/** The icon lights up while something needs you, like the disc. */
export function trayLook({ attention }: StoreSnapshot): { lit: boolean; tooltip: string } {
  const count = attention.length
  return {
    lit: count > 0,
    tooltip: `Bat-Signal · ${count ? terms.needsYou.count(count) : voice.tray.allQuiet}`,
  }
}

export type TrayAction = 'showHide' | ViewMode | 'settings' | 'quit'

/** A menu line, or a separator. A line with `checked` is one of a radio group. */
export type TrayItem = 'separator' | { label: string; action: TrayAction; checked?: boolean }

export function trayMenu(mode: WindowMode): TrayItem[] {
  return [
    { label: mode === 'hidden' ? voice.tray.show : voice.tray.hide, action: 'showHide' },
    'separator',
    { label: voice.tray.disc, action: 'signal', checked: mode === 'signal' },
    { label: voice.tray.panel, action: 'panel', checked: mode === 'panel' },
    { label: voice.tray.watch, action: 'watch', checked: mode === 'watch' },
    'separator',
    { label: voice.tray.settings, action: 'settings' },
    'separator',
    { label: voice.tray.quit, action: 'quit' },
  ]
}
