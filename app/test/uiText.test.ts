import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { rendererSources, sourcesUnder } from './rendererSources'

/** Props and fields that carry words a user reads or hears. */
const TEXT_PROPS = new Set([
  'aria-label',
  'title',
  'label',
  'hint',
  'kicker',
  'aside',
  'text',
  'placeholder',
  'alt',
])

/** Object fields that carry words: the props above, but not `alt`, which in code names the Alt key. */
const TEXT_FIELDS = new Set([...TEXT_PROPS].filter((name) => name !== 'alt' && name !== 'aria-label'))

/** Two words in a row, like a label or a sentence ("Back to the list", " running"). */
const PROSE = /[A-Za-z’']{2,}\s+[A-Za-z’']{2,}|^\s+[a-z’']{2,}/

const nameOf = (node: ts.JsxAttribute | ts.PropertyAssignment) =>
  ts.isIdentifier(node.name) || ts.isStringLiteral(node.name) ? node.name.text : node.name.getText()

/** A literal's own words: a string's text, or a template's text parts around its ${…}. */
function words(node: ts.Node): string[] {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node.text]
  if (ts.isTemplateExpression(node)) return [node.head.text, ...node.templateSpans.map((s) => s.literal.text)]
  return []
}

/** BEM class names, like "card--urgent" or "row row--just-done". */
const CLASSES = /^\s*(?:[a-z0-9]+(?:(?:--|__|-)[a-z0-9]+)*\s*)+$/

/** Is this literal a class list, an import, or a message for developers rather than words? */
const isCode = (node: ts.Node): boolean => {
  if (words(node).every((w) => CLASSES.test(w) && /--|__/.test(w))) return true
  const parent = node.parent
  if (ts.isJsxExpression(parent)) return isCode(parent)
  if (ts.isJsxAttribute(parent)) return !TEXT_PROPS.has(nameOf(parent))
  if (ts.isNewExpression(parent)) return parent.expression.getText() === 'Error'
  return ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)
}

/** Every piece of UI text written inline in a renderer file, as `file:line  "text"`. */
function inlineText(path: string, text: string): string[] {
  const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const found: string[] = []
  const report = (node: ts.Node, words: string) => {
    const line = file.getLineAndCharacterOfPosition(node.getStart()).line + 1
    found.push(`${path}:${line}  ${JSON.stringify(words.trim())}`)
  }
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node) && /[A-Za-z]/.test(node.text)) report(node, node.text)
    else if (
      (ts.isJsxAttribute(node) && TEXT_PROPS.has(nameOf(node))) ||
      (ts.isPropertyAssignment(node) && TEXT_FIELDS.has(nameOf(node)))
    ) {
      const value = ts.isJsxAttribute(node)
        ? node.initializer && ts.isJsxExpression(node.initializer)
          ? node.initializer.expression
          : node.initializer
        : node.initializer
      const said = value ? words(value).join(' ') : ''
      if (/[A-Za-z]/.test(said)) report(node, said)
      else ts.forEachChild(node, visit)
      return
    } else if (words(node).length && !isCode(node)) {
      const said = words(node).find((w) => PROSE.test(w))
      if (said) report(node, said)
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  return found
}

describe("the renderer's UI text", () => {
  // A Theme's Voice and Lexicon swap words in the catalogue (shared/words.ts); a word written in a
  // component would stay the same under every Theme.
  it('all comes from the catalogue', () => {
    const files = rendererSources('.tsx', '.ts').filter(({ path }) => path !== 'bridge.ts')
    expect(files.flatMap(({ path, text }) => inlineText(path, text))).toEqual([])
  })

  // The code the panel and the toasts share builds text too. (The main process isn't scanned: its
  // strings are PowerShell and C# scripts and logs, and its one surface, the tray, reads TRAY_WORDS.)
  it('is not written in the shared code either', () => {
    const files = sourcesUnder('shared', '.ts').filter(
      ({ path }) => path !== 'words.ts' && path !== 'demo.ts',
    )
    expect(files.flatMap(({ path, text }) => inlineText(path, text))).toEqual([])
  })

  it('is found in JSX text, text props and prose literals, not in class names', () => {
    const tsx = [
      '<p className="row row--task" aria-label="Back to the list">All quiet</p>',
      'const n = `${count} running`',
      "const s = { label: 'Rain', key: 'rain-on' }",
    ].join('\n')
    expect(inlineText('a.tsx', tsx)).toEqual([
      'a.tsx:1  "Back to the list"',
      'a.tsx:1  "All quiet"',
      'a.tsx:2  "running"',
      'a.tsx:3  "Rain"',
    ])
  })
})
