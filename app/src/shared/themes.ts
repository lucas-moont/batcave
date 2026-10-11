// The Themes Bat-Signal can wear, each one version of Batman (CONTEXT.md, Theme). The id is what
// settings.json keeps; it names the film or comic, while each Theme's display name alludes to it.

export const THEME_IDS = ['the-batman-2022'] as const
export type ThemeId = (typeof THEME_IDS)[number]

/** The Batman (2022), VENGEANCE: the default Theme. */
export const DEFAULT_THEME: ThemeId = 'the-batman-2022'

export const isThemeId = (raw: unknown): raw is ThemeId => (THEME_IDS as readonly unknown[]).includes(raw)
