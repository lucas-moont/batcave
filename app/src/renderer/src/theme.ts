// Which Theme the page wears: an attribute on <html> that scopes the Theme's stylesheet
// (styles/themes/<id>.css). Set before the first render, from the Theme the window was opened
// with, so no frame paints without the Theme's colors; changed live when the setting changes.
import { DEFAULT_THEME, isThemeId, type ThemeId } from '@shared/themes'

/** The Theme in the page's address (?theme=…), as the main process opens a window; else the default. */
export function themeFromSearch(search: string): ThemeId {
  const theme = new URLSearchParams(search).get('theme')
  return isThemeId(theme) ? theme : DEFAULT_THEME
}

/** Dresses the page in a Theme. */
export function wearTheme(root: HTMLElement, theme: ThemeId): void {
  root.dataset.theme = theme
}
