import { describe, expect, it } from 'vitest'
import { acceleratorFromKey, keycaps, normalizeAccelerator, type KeyLike } from '../src/shared/accelerator'

/** A key press on a US keyboard, unless `key` (what it typed) says otherwise. */
const key = (code: string, mods: Partial<Omit<KeyLike, 'code'>> = {}): KeyLike => ({
  code,
  key: /^Key[A-Z]$/.test(code) ? code.slice(3).toLowerCase() : /^Digit\d$/.test(code) ? code.slice(5) : code,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: false,
  ...mods,
})

describe('acceleratorFromKey: recording a shortcut', () => {
  it('turns a combination into an Electron accelerator, modifiers in a fixed order', () => {
    expect(acceleratorFromKey(key('KeyB', { ctrlKey: true, altKey: true }))).toEqual({
      kind: 'ok',
      accelerator: 'Ctrl+Alt+B',
    })
    expect(acceleratorFromKey(key('Digit7', { shiftKey: true, ctrlKey: true }))).toEqual({
      kind: 'ok',
      accelerator: 'Ctrl+Shift+7',
    })
    expect(acceleratorFromKey(key('F9', { altKey: true }))).toEqual({ kind: 'ok', accelerator: 'Alt+F9' })
    expect(acceleratorFromKey(key('ArrowUp', { metaKey: true, ctrlKey: true }))).toEqual({
      kind: 'ok',
      accelerator: 'Ctrl+Super+Up',
    })
  })

  it('names a letter as the keyboard layout does, as Windows will register it', () => {
    // On a French AZERTY keyboard the key in the place of Q types "a".
    expect(acceleratorFromKey(key('KeyQ', { key: 'a', ctrlKey: true, altKey: true }))).toMatchObject({
      accelerator: 'Ctrl+Alt+A',
    })
  })

  it('takes a number by its place, whatever the layout types there', () => {
    // On AZERTY the 1 key types "&" until Shift is held.
    expect(acceleratorFromKey(key('Digit1', { key: '&', ctrlKey: true, altKey: true }))).toMatchObject({
      accelerator: 'Ctrl+Alt+1',
    })
  })

  it('takes a letter by its place on a layout without Latin letters', () => {
    expect(acceleratorFromKey(key('KeyQ', { key: 'й', ctrlKey: true }))).toMatchObject({
      accelerator: 'Ctrl+Q',
    })
  })

  it('refuses Ctrl+Alt on a letter that AltGr turns into a character, which typing needs', () => {
    // On a Brazilian ABNT2 keyboard, AltGr (Ctrl+Alt) with Q types "/".
    expect(acceleratorFromKey(key('KeyQ', { key: '/', ctrlKey: true, altKey: true }))).toEqual({
      kind: 'invalid',
      problem: { why: 'typed', char: '/' },
    })
  })

  it('keeps waiting while only modifiers are down', () => {
    expect(acceleratorFromKey(key('ControlLeft', { ctrlKey: true }))).toEqual({ kind: 'partial' })
    expect(acceleratorFromKey(key('AltRight', { ctrlKey: true, altKey: true }))).toEqual({ kind: 'partial' })
  })

  it('cancels on Esc and turns the shortcut off on Backspace or Delete', () => {
    expect(acceleratorFromKey(key('Escape'))).toEqual({ kind: 'cancel' })
    expect(acceleratorFromKey(key('Backspace'))).toEqual({ kind: 'clear' })
    expect(acceleratorFromKey(key('Delete'))).toEqual({ kind: 'clear' })
  })

  it('refuses a key alone or with Shift alone, which would steal typing', () => {
    expect(acceleratorFromKey(key('KeyB'))).toMatchObject({ kind: 'invalid' })
    expect(acceleratorFromKey(key('KeyB', { shiftKey: true }))).toMatchObject({ kind: 'invalid' })
  })

  it('takes F13 to F24 alone, which nothing types', () => {
    expect(acceleratorFromKey(key('F13'))).toEqual({ kind: 'ok', accelerator: 'F13' })
  })

  it('refuses keys it cannot name', () => {
    expect(acceleratorFromKey(key('IntlBackslash', { ctrlKey: true }))).toMatchObject({ kind: 'invalid' })
  })
})

describe('normalizeAccelerator: a shortcut read from settings', () => {
  it('accepts any case and order, and writes it the one way', () => {
    expect(normalizeAccelerator('alt+ctrl+b')).toBe('Ctrl+Alt+B')
    expect(normalizeAccelerator('Control+Shift+F9')).toBe('Ctrl+Shift+F9')
    expect(normalizeAccelerator('super+ctrl+up')).toBe('Ctrl+Super+Up')
  })

  it('rejects what Electron could not register or recording would refuse', () => {
    for (const bad of ['Ctrl+Banana', 'Ctrl+', 'B', 'Shift+B', 'Ctrl+Ctrl+B', 'Ctrl+A+B', ''])
      expect(normalizeAccelerator(bad), bad).toBeUndefined()
  })
})

describe('keycaps', () => {
  it('splits a shortcut into the keys to show, the Windows key by its name', () => {
    expect(keycaps('Ctrl+Alt+B')).toEqual(['Ctrl', 'Alt', 'B'])
    expect(keycaps('Ctrl+Super+Up')).toEqual(['Ctrl', 'Win', 'Up'])
  })
})
