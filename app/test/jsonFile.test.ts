import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it, vi } from 'vitest'

const dir = vi.hoisted(() => ({ path: '' }))
vi.mock('electron', () => ({ app: { getPath: () => dir.path } }))

import { jsonFile } from '../src/main/jsonFile'

dir.path = mkdtempSync(join(tmpdir(), 'bat-signal-json-'))
afterAll(() => rmSync(dir.path, { recursive: true, force: true }))

const parse = (raw: unknown) => (typeof raw === 'object' && raw ? (raw as { theme?: string }) : {})
const settle = () => new Promise((r) => setTimeout(r, 400))

describe('a JSON file someone edits by hand', () => {
  // Until the Theme picker, editing settings.json is how a Theme changes; it must apply at once.
  it('is read again, and its new value handed over', async () => {
    const file = jsonFile('settings.json', parse)
    file.save({ theme: 'the-batman-2022' })
    const seen: unknown[] = []
    const stop = file.watch((value) => seen.push(value))
    await settle()
    writeFileSync(join(dir.path, 'settings.json'), JSON.stringify({ theme: 'burton-1989' }))
    await settle()
    stop()
    expect(seen).toEqual([{ theme: 'burton-1989' }])
  })

  it("isn't news when the app wrote it itself", async () => {
    const file = jsonFile('window.json', parse)
    const seen: unknown[] = []
    const stop = file.watch((value) => seen.push(value))
    await settle()
    file.save({ theme: 'the-batman-2022' })
    await settle()
    stop()
    expect(seen).toEqual([])
  })
})
