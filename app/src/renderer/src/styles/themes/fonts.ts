// Each Theme's faces, loaded only when the Theme is worn: a separate chunk per Theme, so a Theme
// never downloads another's fonts.
import type { ThemeId } from '@shared/themes'

const FONTS: Record<ThemeId, () => Promise<unknown>> = {
  'the-batman-2022': () => import('./the-batman-2022.fonts'),
}

/** Loads a Theme's faces; resolves once their stylesheet is in (the files follow as text uses them). */
export const loadFonts = (theme: ThemeId): Promise<unknown> => FONTS[theme]()
