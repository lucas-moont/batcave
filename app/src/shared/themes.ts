// The Themes Bat-Signal can wear, each one version of Batman (CONTEXT.md, Theme). The id is what
// settings.json keeps; it names the film or comic, while each Theme's display name alludes to it.
// A Theme's colors live in its stylesheet (renderer/src/styles/themes/<id>.css); what the main
// process or the renderer's code needs lives here.
import { emblem, WINGS, type Emblem } from './emblems'
import { STANDARD_WORDS, type Words } from './words'

export const THEME_IDS = ['the-batman-2022'] as const
export type ThemeId = (typeof THEME_IDS)[number]

/** The Batman (2022), VENGEANCE: the default Theme. */
export const DEFAULT_THEME: ThemeId = 'the-batman-2022'

export const isThemeId = (raw: unknown): raw is ThemeId => (THEME_IDS as readonly unknown[]).includes(raw)

export interface Theme {
  id: ThemeId
  /** Its word in a demo page's hash (#demo-vengeance): one word, since the hash splits on "-". */
  flag: string
  /** The window's background before the page paints: the Theme's --abyss. */
  ground: string
  /** Its Lexicon and Voice: one object per Theme, so whatever memoises on the words stays put. */
  words: Words
  /** Its bat: in the panel's masthead, on the disc, in the intro and on Bat-Clawd's chest. */
  emblem: Emblem
}

export const THEMES: Record<ThemeId, Theme> = {
  'the-batman-2022': {
    id: 'the-batman-2022',
    flag: 'vengeance',
    ground: '#000000',
    words: STANDARD_WORDS,
    emblem: emblem(WINGS, 'wear'),
  },
}

/** The Theme a demo page's hash names by its flag (#demo-vengeance), if any. */
export const themeFromFlags = (flags: ReadonlySet<string>): ThemeId | undefined =>
  THEME_IDS.find((id) => flags.has(THEMES[id].flag))
