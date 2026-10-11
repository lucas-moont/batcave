// Which Theme the page wears: an attribute on <html> that scopes the Theme's stylesheet
// (styles/themes/<id>.css), and a context for the code that reads the Theme (its words, its
// emblem). Free of the bridge, so any component can read it and still render in a node test.
import { createContext, createElement, useContext, useEffect, type ReactNode } from 'react'
import { DEFAULT_THEME, isThemeId, type ThemeId } from '@shared/themes'

/** The Theme in the page's address (?theme=…), as the main process opens a window; else the default. */
export function themeFromSearch(search: string): ThemeId {
  const theme = new URLSearchParams(search).get('theme')
  return isThemeId(theme) ? theme : DEFAULT_THEME
}

/** Dresses the page in a Theme. main.tsx does it before the first render, so no frame paints bare. */
export function wearTheme(root: HTMLElement, theme: ThemeId): void {
  root.dataset.theme = theme
}

const ThemeContext = createContext<ThemeId>(DEFAULT_THEME)

/** The Theme the page wears: the default outside a Wearing (a component rendered on its own). */
export const useTheme = (): ThemeId => useContext(ThemeContext)

/** Wears the settings' Theme from here down, and on the page itself, changing live with the setting. */
export function Wearing({ theme, children }: { theme: ThemeId; children: ReactNode }) {
  useEffect(() => wearTheme(document.documentElement, theme), [theme])
  return createElement(ThemeContext, { value: theme }, children)
}
