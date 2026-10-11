import { describe, expect, it } from 'vitest'
import {
  applySettingsPatch,
  DEFAULT_SETTINGS,
  everyToast,
  parseSettings,
  toastsOn,
} from '../src/shared/settings'

/** settings.json as Bat-Signal wrote it before Phase 4: five fields, nothing else. */
const OLD_FILE = { animations: false, rain: false, alwaysOnTop: false, opacity: 0.8, layout: 'report' }

describe('parseSettings: whatever the file holds', () => {
  it('falls back to the defaults for a missing or broken file', () => {
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings('not json')).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings([1, 2])).toEqual(DEFAULT_SETTINGS)
  })

  it('replaces bad values with defaults and drops unknown keys', () => {
    const parsed = parseSettings({ animations: 'yes', layout: 'grid', palette: 'arkham' })
    expect(parsed).toEqual(DEFAULT_SETTINGS)
    expect(parsed).not.toHaveProperty('palette')
  })

  // A Theme a newer or older Bat-Signal wrote, or a typo, must not leave the app without one.
  it('falls back to The Batman (2022) for a Theme it does not know', () => {
    expect(DEFAULT_SETTINGS.theme).toBe('the-batman-2022')
    expect(parseSettings({ theme: 'arkham' }).theme).toBe('the-batman-2022')
    expect(parseSettings({ theme: 42 }).theme).toBe('the-batman-2022')
  })

  it('keeps a Theme it knows', () => {
    expect(parseSettings({ theme: 'the-batman-2022' }).theme).toBe('the-batman-2022')
  })

  it('keeps the opacity between 50% and 100%', () => {
    expect(parseSettings({ opacity: 0.1 }).opacity).toBe(0.5)
    expect(parseSettings({ opacity: 3 }).opacity).toBe(1)
  })
})

describe('parseSettings: a file from before Phase 4', () => {
  it('keeps what the user chose and turns every new announcement off', () => {
    expect(parseSettings(OLD_FILE)).toEqual({
      ...OLD_FILE,
      shortcut: 'Ctrl+Alt+B',
      announce: {
        toast: { needsYou: false, reply: false, taskDone: false, sessions: false },
        sound: false,
        volume: 0.6,
      },
    })
  })
})

describe('parseSettings: how news is announced', () => {
  it('turns on only the toasts set to true, nothing truthy', () => {
    const { announce } = parseSettings({ announce: { toast: { reply: true, taskDone: 'yes', needsYou: 1 } } })
    expect(announce.toast).toEqual({ needsYou: false, reply: true, taskDone: false, sessions: false })
  })

  it('keeps the volume between 0 and 1, at 60% when unknown', () => {
    const volume = (v: unknown) => parseSettings({ announce: { volume: v } }).announce.volume
    expect(volume(3)).toBe(1)
    expect(volume(-1)).toBe(0)
    expect(volume(0.25)).toBe(0.25)
    expect(volume('loud')).toBe(0.6)
    expect(volume(Number.NaN)).toBe(0.6)
  })

  it('falls back to the defaults when announce is not an object', () => {
    expect(parseSettings({ announce: 5 }).announce).toEqual(DEFAULT_SETTINGS.announce)
  })
})

describe('applySettingsPatch: changing one switch', () => {
  const current = applySettingsPatch(DEFAULT_SETTINGS, {
    announce: { toast: { needsYou: true }, volume: 0.3 },
  })

  it('keeps the other announce settings when sound is turned on', () => {
    const next = applySettingsPatch(current, { announce: { sound: true } })
    expect(next.announce).toEqual({ ...current.announce, sound: true })
  })

  it('keeps the other toasts when one is turned on', () => {
    const next = applySettingsPatch(current, { announce: { toast: { taskDone: true } } })
    expect(next.announce.toast).toEqual({ needsYou: true, reply: false, taskDone: true, sessions: false })
    expect(next.announce.volume).toBe(0.3)
  })

  it('ignores a patch of the wrong shape instead of resetting them', () => {
    expect(applySettingsPatch(current, { announce: 5 }).announce).toEqual(current.announce)
    expect(applySettingsPatch(current, { announce: { toast: 'all' } }).announce).toEqual(current.announce)
  })

  it('keeps the current value when one switch gets a bad or missing value', () => {
    const tuned = applySettingsPatch(current, { opacity: 0.7, announce: { sound: true } })
    const bad = (patch: unknown) => applySettingsPatch(tuned, patch)
    expect(bad({ opacity: 'x' }).opacity).toBe(0.7)
    expect(bad({ opacity: undefined }).opacity).toBe(0.7)
    expect(bad({ announce: { volume: 'loud' } }).announce.volume).toBe(0.3)
    expect(bad({ announce: { sound: 'yes' } }).announce.sound).toBe(true)
    expect(bad({ announce: { toast: { needsYou: 'yes' } } }).announce.toast.needsYou).toBe(true)
  })

  it('leaves the other settings alone', () => {
    const next = applySettingsPatch(parseSettings(OLD_FILE), { announce: { sound: true } })
    expect(next).toMatchObject(OLD_FILE)
  })
})

describe('applySettingsPatch: an untrusted patch', () => {
  it('changes no setting through __proto__', () => {
    const patch: unknown = JSON.parse(
      '{"__proto__": {"animations": false}, "announce": {"__proto__": {"sound": true}}}',
    )
    const next = applySettingsPatch(DEFAULT_SETTINGS, patch)
    expect(next).toEqual(DEFAULT_SETTINGS)
  })
})

describe('settings across a restart', () => {
  it('come back as they were saved (as jsonFile writes and reads them)', () => {
    const chosen = applySettingsPatch(parseSettings(OLD_FILE), {
      announce: { toast: { reply: true, sessions: true }, sound: true, volume: 0.2 },
    })
    const saved = JSON.stringify(chosen, null, 2)
    expect(parseSettings(JSON.parse(saved))).toEqual(chosen)
  })
})

describe('parseSettings: the global shortcut', () => {
  it('is Ctrl+Alt+B unless the file says otherwise', () => {
    expect(parseSettings({}).shortcut).toBe('Ctrl+Alt+B')
    expect(parseSettings({ shortcut: 42 }).shortcut).toBe('Ctrl+Alt+B')
  })

  it('reads a shortcut written any way, and none as off', () => {
    expect(parseSettings({ shortcut: 'alt+ctrl+n' }).shortcut).toBe('Ctrl+Alt+N')
    expect(parseSettings({ shortcut: '' }).shortcut).toBe('')
  })

  it('falls back to Ctrl+Alt+B for a shortcut that cannot be registered', () => {
    expect(parseSettings({ shortcut: 'Ctrl+Banana' }).shortcut).toBe('Ctrl+Alt+B')
  })
})

describe('applySettingsPatch: a value of the right type but no meaning', () => {
  it('keeps the current setting, as a value of the wrong type does', () => {
    const mine = applySettingsPatch(DEFAULT_SETTINGS, { shortcut: 'Ctrl+Alt+N', layout: 'report' })
    expect(applySettingsPatch(mine, { shortcut: 'Ctrl+Banana' }).shortcut).toBe('Ctrl+Alt+N')
    expect(applySettingsPatch(mine, { layout: 'grid' }).layout).toBe('report')
    expect(applySettingsPatch(mine, { theme: 'arkham' } as never).theme).toBe(DEFAULT_SETTINGS.theme)
  })
})

describe('every Windows notification at once', () => {
  const some = applySettingsPatch(DEFAULT_SETTINGS, { announce: { toast: { needsYou: true, reply: true } } })

  it('counts the kinds of news picked for a toast', () => {
    expect(toastsOn(DEFAULT_SETTINGS.announce.toast)).toBe(0)
    expect(toastsOn(some.announce.toast)).toBe(2)
  })

  it('turns every kind on, or every kind off, and nothing else', () => {
    const all = applySettingsPatch(some, everyToast(true))
    expect(all.announce.toast).toEqual({ needsYou: true, reply: true, taskDone: true, sessions: true })
    expect(toastsOn(all.announce.toast)).toBe(4)
    const none = applySettingsPatch(all, everyToast(false))
    expect(toastsOn(none.announce.toast)).toBe(0)
    expect({ ...none, announce: { ...none.announce, toast: some.announce.toast } }).toEqual(some)
  })
})
