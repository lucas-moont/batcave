import { motion, AnimatePresence } from 'motion/react'
import type { MascotMood } from '@shared/view'
import { useWords } from '../words'
import { BatClawd } from './BatClawd'
import { BatEmblem } from './BatEmblem'
import { Icon } from './Icon'

interface HeaderProps {
  needsYou: number
  mood: MascotMood
  onFold: () => void
  onWatch: () => void
  onHide: () => void
}

/** Title bar of the frameless window: drag it to move. */
export function Header({ needsYou, mood, onFold, onWatch, onHide }: HeaderProps) {
  const { terms, voice } = useWords()
  return (
    <header className="header">
      {/* The needs-you count hangs off the emblem like a stamp, taking no room in the row. */}
      <span className="header__brand">
        <BatEmblem size={48} />
        <AnimatePresence mode="popLayout">
          {needsYou > 0 && (
            <motion.span
              key={needsYou}
              className="header__count"
              title={terms.needsYou.count(needsYou)}
              initial={{ scale: 1.8, opacity: 0, rotate: -14 }}
              animate={{ scale: 1, opacity: 1, rotate: -5 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: 'spring', stiffness: 520, damping: 22 }}
            >
              {needsYou}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <h1 className="header__title">{voice.wordmark}</h1>
      <div className="header__mascot">
        <BatClawd mood={mood} size={54} />
      </div>
      <nav className="header__actions">
        <button
          className="icon-button"
          onClick={onWatch}
          aria-label={voice.chrome.toWatch}
          title={voice.chrome.toWatch}
        >
          <Icon name="watch" />
        </button>
        <button
          className="icon-button"
          onClick={onFold}
          aria-label={voice.chrome.toDisc}
          title={voice.chrome.toDiscTip}
        >
          <Icon name="fold" />
        </button>
        <button
          className="icon-button icon-button--danger"
          onClick={onHide}
          aria-label={voice.chrome.hide}
          title={voice.chrome.hide}
        >
          <Icon name="close" />
        </button>
      </nav>
    </header>
  )
}

export type Tab = 'needs' | 'cases'

export function Tabs({
  tab,
  counts,
  onChange,
  onSettings,
}: {
  tab: Tab
  counts: Record<Tab, number>
  onChange: (tab: Tab) => void
  onSettings: () => void
}) {
  const { terms, voice } = useWords()
  const label: Record<Tab, string> = { needs: terms.needsYou.label, cases: terms.case.many }
  return (
    <div className="tabs" role="tablist">
      {(['needs', 'cases'] as const).map((t) => (
        <button
          key={t}
          role="tab"
          aria-selected={tab === t}
          className="tabs__tab"
          onClick={() => onChange(t)}
        >
          {label[t]}
          <span className="tabs__count">{counts[t]}</span>
          {tab === t && <motion.span layoutId="tab-underline" className="tabs__underline" />}
        </button>
      ))}
      {/* Settings are rarely opened: they live here, leaving the title bar its room. */}
      <button
        className="icon-button tabs__settings"
        onClick={onSettings}
        aria-label={voice.chrome.settings}
        title={voice.chrome.settings}
      >
        <Icon name="gear" />
      </button>
    </div>
  )
}
