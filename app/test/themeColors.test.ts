import { describe, expect, it } from 'vitest'
import { CSS_COLOR_NAMES } from './cssColorNames'
import { rendererSources } from './rendererSources'

type Source = { path: string; text: string }

/** The renderer's CSS and TS, without the Themes' own stylesheets, where every color is defined. */
const sources = () =>
  rendererSources('.css', '.ts', '.tsx').filter(({ path }) => !path.startsWith('styles/themes/'))

/** Blanks out comments, keeping line breaks, so prose like "#b47c0d" in a comment isn't a color. */
const withoutComments = (code: string) =>
  code.replace(/\/\*[\s\S]*?\*\/|(?<![:'"\w])\/\/.*$/gm, (comment) => comment.replace(/[^\n]/g, ' '))

const NAMES = CSS_COLOR_NAMES.join('|')
const FUNCTION_OR_HEX = String.raw`#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(`
// In CSS any bare color name is a value; in TS only a quoted one is (`fill="maroon"`), not a word.
const CSS_COLOR = new RegExp(String.raw`${FUNCTION_OR_HEX}|(?<![\w-])(?:${NAMES})(?![\w-])`, 'gi')
const TS_COLOR = new RegExp(String.raw`${FUNCTION_OR_HEX}|(['"\x60])(?:${NAMES})\1`, 'gi')

/** Every color written by hand in the files, as `file:line  literal`. */
function literals(files: Source[]): string[] {
  return files.flatMap(({ path, text }) => {
    const color = path.endsWith('.css') ? CSS_COLOR : TS_COLOR
    return withoutComments(text)
      .split('\n')
      .flatMap((line, i) => [...line.matchAll(color)].map((m) => `${path}:${i + 1}  ${m[0]}`))
  })
}

/**
 * A call's first argument from `from` (just past its opening parenthesis) to its first top-level
 * comma, keeping only its top-level words: a nested call like color-mix(in srgb, …) is left out.
 */
function firstArgument(text: string, from: number): string {
  let depth = 0
  let words = ''
  for (const c of text.slice(from)) {
    if (depth === 0 && (c === ',' || c === ')')) break
    if (c === '(') depth++
    else if (c === ')') depth--
    else if (depth === 0) words += c
  }
  return words
}

/** Every CSS gradient whose first argument doesn't name its interpolation space, as `file:line`. */
function gradientsWithoutSpace(files: Source[]): string[] {
  return files.flatMap(({ path, text }) => {
    const code = withoutComments(text)
    return [...code.matchAll(/-gradient\(/g)]
      .filter((m) => !/\bin srgb\b/.test(firstArgument(code, m.index + m[0].length)))
      .map((m) => `${path}:${code.slice(0, m.index).split('\n').length}`)
  })
}

describe("the renderer's colors", () => {
  // A Theme swaps the variables in its stylesheet; a color written anywhere else would stay behind.
  it('all come from a Theme variable', () => {
    expect(literals(sources())).toEqual([])
  })

  it('include every CSS color name, in CSS and in TSX strings', () => {
    const css = { path: 'a.css', text: '.a { color: crimson; }' }
    const tsx = { path: 'b.tsx', text: 'const b = <path fill="maroon" />' }
    expect(literals([css, tsx])).toEqual(['a.css:1  crimson', 'b.tsx:1  "maroon"'])
  })

  // A color-mix() is not a legacy color, and one in a gradient switches it from sRGB to Oklab
  // interpolation, which shifts its pixels. Whether a token is a color-mix() is up to each Theme,
  // so every gradient names its space and none depends on how a Theme writes its colors.
  it('blend in sRGB inside every gradient, whatever the Theme writes', () => {
    expect(gradientsWithoutSpace(rendererSources('.css'))).toEqual([])
  })

  it("can't be fooled by a color-mix() in a gradient's first stop", () => {
    const stop = 'color-mix(in srgb, var(--haze) 10%, transparent)'
    const css = `.a { background: radial-gradient(${stop}, transparent); }`
    expect(gradientsWithoutSpace([{ path: 'a.css', text: css }])).toEqual(['a.css:1'])
  })
})
