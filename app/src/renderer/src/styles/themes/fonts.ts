// Each Theme's faces (<id>.fonts.ts), loaded only when the Theme is worn: a separate chunk per
// Theme, so a Theme never downloads another's fonts.
import type { ThemeId } from '@shared/themes'

const FONTS = import.meta.glob('./*.fonts.ts')

/** Loads a Theme's faces; resolves once their stylesheet is in (the files follow as text uses them). */
export const loadFonts = (theme: ThemeId): Promise<unknown> =>
  FONTS[`./${theme}.fonts.ts`]?.() ?? Promise.resolve()
