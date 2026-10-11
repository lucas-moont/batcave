import { useEffect, useEffectEvent, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import type { AttentionItem } from '@shared/types'
import { mascotMood, pluginSilent, unheardCount } from '@shared/view'
import { batSignal } from './bridge'
import { Atmosphere } from './components/Atmosphere'
import { BatSignalIntro } from './components/BatSignalIntro'
import { AttentionList, CaseList } from './components/Cards'
import { CaseDetail, sheetExists, type SheetTarget } from './components/CaseDetail'
import { Header, Tabs, type Tab } from './components/Header'
import { NightReport } from './components/NightReport'
import { PluginHint } from './components/PluginHint'
import { WatchStrip } from './components/WatchStrip'
import { DetailSheet, SettingsSheet } from './components/Sheets'
import { CalmContext, useCalm } from './calm'
import { Wearing } from './theme'
import { useNow, useSettings, useSnapshot, useStatus, useWindowMode } from './hooks'
import './App.css'

export function App() {
  const snapshot = useSnapshot()
  const [settings, changeSettings, settingsLoaded] = useSettings()
  const status = useStatus()
  const calm = useCalm(settings)
  const mode = useWindowMode()
  // Hidden keeps the view the window had, rather than mounting the panel nobody sees; showing it
  // again finds it as it was.
  const [view, setView] = useState(mode)
  if (mode !== 'hidden' && mode !== view) setView(mode)
  const now = useNow()

  const [tab, setTab] = useState<Tab | null>(null)
  const [openCase, setOpenCase] = useState<string | null>(null)
  const [sheet, setSheet] = useState<SheetTarget | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const { sessions, attention } = snapshot
  // What counts as news for the rain: new alerts or new activity, not every snapshot push
  // (the main process re-sends an unchanged snapshot every minute for the clock).
  const activity = useMemo(
    () =>
      [
        ...attention.map((a) => `${a.sessionId}:${a.kind}:${a.at}`),
        ...sessions.map((s) => `${s.sessionId}:${s.status}:${s.lastActivityAt}`),
      ].join('|'),
    [attention, sessions],
  )
  const mood = mascotMood(snapshot)
  const fold = () => batSignal.setMode('signal')
  // The night report opens a case in place, among its case notes, instead of sliding a detail in.
  const report = settings.layout === 'report'
  // A case that ends while open simply disappears: no session, no detail.
  const session = openCase ? sessions.find((s) => s.sessionId === openCase) : undefined
  // Open on whatever matters: the needs-you list when something is waiting. In the report an open
  // case shows on the case notes, without pinning that choice for later.
  const activeTab: Tab = report && session ? 'cases' : (tab ?? (attention.length ? 'needs' : 'cases'))
  // A drawer whose task, subagent or job left the session is gone too (and must not eat an Esc).
  const activeSheet = session && sheet && sheetExists(session, sheet) ? sheet : null

  const open = (sessionId: string, target: SheetTarget | null = null) => {
    setOpenCase(sessionId)
    setSheet(target)
    batSignal.markSeen(sessionId)
  }
  // A click on a notice card opens the panel on that case.
  const onFocusCase = useEffectEvent((sessionId: string) => open(sessionId))
  useEffect(() => batSignal.onFocusCase((sessionId) => onFocusCase(sessionId)), [])
  useEffect(() => batSignal.onOpenSettings(() => setSettingsOpen(true)), [])

  const openAttention = (item: AttentionItem) =>
    open(item.sessionId, item.kind === 'stalled' && item.taskId ? { kind: 'task', id: item.taskId } : null)

  // Esc closes the top-most layer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (settingsOpen) setSettingsOpen(false)
      else if (activeSheet) setSheet(null)
      else if (openCase) setOpenCase(null)
      else fold()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [settingsOpen, activeSheet, openCase])

  // Until the saved settings arrive (one IPC round trip), show the empty dark window rather
  // than flashing an intro or rain the user may have turned off.
  if (!settingsLoaded) return <main className="app" />

  // Every view wears the settings' Theme and their calm.
  const dressed = (page: ReactNode) => (
    <Wearing theme={settings.theme}>
      <CalmContext value={calm}>{page}</CalmContext>
    </Wearing>
  )

  if (view === 'watch') {
    return dressed(<WatchStrip sessions={sessions} attention={attention} layout={settings.layout} />)
  }

  return dressed(
    <MotionConfig reducedMotion={calm ? 'always' : 'never'}>
      <main className="app">
        <Atmosphere rain={settings.rain && !calm} activity={activity} />
        <Header
          needsYou={attention.length}
          mood={mood}
          onFold={fold}
          onWatch={() => batSignal.setMode('watch')}
          onHide={batSignal.hide}
        />
        <Tabs
          tab={activeTab}
          counts={{ needs: attention.length, cases: sessions.length }}
          onChange={(next) => {
            // In the report, leaving the case notes closes the case opened there.
            if (report && next === 'needs') setOpenCase(null)
            setTab(next)
          }}
          onSettings={() => setSettingsOpen(true)}
        />

        <div className="stage">
          <div className="stage__scroll">
            {!report && activeTab === 'needs' && pluginSilent(snapshot) && (
              <PluginHint sessions={unheardCount(snapshot)} />
            )}
            {report ? (
              <NightReport
                tab={activeTab}
                unheard={unheardCount(snapshot)}
                sessions={sessions}
                attention={attention}
                now={now}
                openCase={session ? openCase : null}
                onToggleCase={(id) => (openCase === id ? setOpenCase(null) : open(id))}
                onOpenAlert={openAttention}
                onOpenSheet={open}
              />
            ) : activeTab === 'needs' ? (
              <AttentionList
                items={attention}
                sessions={sessions}
                now={now}
                quietIsKnown={!pluginSilent(snapshot)}
                onOpen={openAttention}
              />
            ) : (
              <CaseList sessions={sessions} attention={attention} now={now} onOpen={(id) => open(id)} />
            )}
          </div>

          <AnimatePresence>
            {session && !report && (
              <motion.div
                key="detail"
                className="stage__layer"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              >
                <CaseDetail
                  session={session}
                  attention={attention}
                  now={now}
                  onBack={() => setOpenCase(null)}
                  onOpen={setSheet}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {session && activeSheet && (
              <DetailSheet
                key="sheet"
                session={session}
                target={activeSheet}
                now={now}
                onClose={() => setSheet(null)}
              />
            )}
            {settingsOpen && (
              <SettingsSheet
                key="settings"
                settings={settings}
                status={status}
                onChange={changeSettings}
                onClose={() => setSettingsOpen(false)}
              />
            )}
          </AnimatePresence>
        </div>

        {!calm && <BatSignalIntro />}
      </main>
    </MotionConfig>,
  )
}
