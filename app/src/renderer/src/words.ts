// The renderer's one way to the words. Its own module, free of the bridge, so any component
// (Bat-Clawd, the emblem) can speak without pulling in the main process's API.
import { THEMES } from '@shared/themes'
import type { Words } from '@shared/words'
import { useTheme } from './theme'

/** The words the panel and the Signal speak: the worn Theme's, one stable object per Theme. */
export const useWords = (): Words => THEMES[useTheme()].words
