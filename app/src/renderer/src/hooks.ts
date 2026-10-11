import { useEffect, useState } from 'react'
import { DEFAULT_SETTINGS, type Settings, type SettingsPatch, type WindowMode } from '@shared/settings'
import { DEFAULT_STATUS, type AppStatus } from '@shared/status'
import type { StoreSnapshot } from '@shared/types'
import { batSignal } from './bridge'

const EMPTY: StoreSnapshot = { sessions: [], attention: [] }

/**
 * A value owned by the main process: fetched once, then kept current by its pushes. Returns
 * the value and whether the real one has arrived yet.
 */
function useBridgedState<T>(
  initial: T,
  get: () => Promise<T>,
  on: (cb: (value: T) => void) => () => void,
): [T, boolean] {
  const [state, setState] = useState({ value: initial, loaded: false })
  useEffect(() => {
    let live = true
    const set = (value: T) => live && setState({ value, loaded: true })
    void get().then(set)
    const unsubscribe = on(set)
    return () => {
      live = false
      unsubscribe()
    }
  }, [get, on])
  return [state.value, state.loaded]
}

/** The latest store snapshot pushed by the main process, and whether the real one has arrived. */
export const useSnapshotState = (): [StoreSnapshot, boolean] =>
  useBridgedState(EMPTY, batSignal.getSnapshot, batSignal.onSnapshot)

export const useSnapshot = (): StoreSnapshot => useSnapshotState()[0]

/** What is happening now (the shortcut held or taken), pushed by the main process. */
export const useStatus = (): AppStatus =>
  useBridgedState(DEFAULT_STATUS, batSignal.getStatus, batSignal.onStatus)[0]

/** The settings, a setter, and whether the saved settings have arrived (render nothing before). */
export function useSettings(): [Settings, (patch: SettingsPatch) => void, boolean] {
  const [settings, loaded] = useBridgedState(DEFAULT_SETTINGS, batSignal.getSettings, batSignal.onSettings)
  return [settings, batSignal.setSettings, loaded]
}

/** Signal or panel: the main process owns it; pages only read it and ask to change it. */
export const useWindowMode = (): WindowMode =>
  useBridgedState<WindowMode>('signal', batSignal.getMode, batSignal.onMode)[0]

const NOW_EVERY_MS = 30_000

/** The current time, refreshed often enough for "2m ago" labels. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), NOW_EVERY_MS)
    return () => clearInterval(timer)
  }, [])
  return now
}
