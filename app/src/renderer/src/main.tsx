import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/theme.css'
import './styles/themes'
import { App } from './App'
import { isSignalView } from './bridge'
import { Signal } from './components/Signal'
import { installRipple } from './ripple'
import { loadFonts } from './styles/themes/fonts'
import { themeFromSearch, wearTheme } from './theme'

const root = document.getElementById('root')
if (!root) throw new Error('#root not found')

const theme = themeFromSearch(location.search)
wearTheme(document.documentElement, theme)
if (isSignalView) document.documentElement.classList.add('view-signal')
else installRipple()

// The Theme's faces first, so the masthead and the intro never flash a fallback face at startup.
void loadFonts(theme).finally(() =>
  createRoot(root).render(<StrictMode>{isSignalView ? <Signal /> : <App />}</StrictMode>),
)
