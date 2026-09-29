import { parse as parseTemplate } from '@vue/compiler-dom'
import { type AstNode, parseScript, walk } from './ast'

export interface ExplicitImport {
  specifier: string
  names: string[]
  /** 1-based line of the import statement. */
  line: number
}

export interface FileScan {
  imports: ExplicitImport[]
  /** Free identifiers in scripts and template expressions, candidates for auto-imports, with the line of their first use. */
  identifiers: Map<string, number>
  /** Component tags in PascalCase, with the line of their first use. */
  components: Map<string, number>
  loc: number
}

const IDENTIFIER_RE = /(?<![.\w$])[A-Z_$][\w$]*/gi
const ELEMENT = 1
const TEXT = 2
const INTERPOLATION = 5
const ATTRIBUTE = 6
const DIRECTIVE = 7

interface Loc {
  start: { offset: number, line: number }
}

interface TemplateNode {
  type: number
  tag?: string
  loc: Loc
  props?: { type: number, name: string, value?: { content: string }, exp?: { content?: string, loc: Loc } }[]
  content?: string | { content?: string, loc: Loc }
  children?: TemplateNode[]
}

/** Maps string offsets to 1-based line numbers. */
function lineIndex(code: string) {
  const starts = [0]
  for (let i = code.indexOf('\n'); i !== -1; i = code.indexOf('\n', i + 1)) starts.push(i + 1)
  return (offset: number) => {
    let low = 0
    let high = starts.length - 1
    while (low < high) {
      const mid = (low + high + 1) >> 1
      if (starts[mid]! <= offset) low = mid
      else high = mid - 1
    }
    return low + 1
  }
}

function addFirst(map: Map<string, number>, name: string, line: number) {
  if (!map.has(name) || map.get(name)! > line) map.set(name, line)
}

function pascalCase(tag: string) {
  return tag.replace(/(^|-)(\w)/g, (_, _dash, char: string) => char.toUpperCase())
}

/** `lineOf` takes offsets into `code`, which starts at `base` in the whole file. */
function scanScript(filename: string, code: string, lang: string, scan: FileScan, lineOf: (offset: number) => number, base = 0) {
  const { program, module } = parseScript(`${filename}.${lang}`, code)
  const local = new Set<string>()
  const line = (offset: number) => lineOf(base + offset)

  const addImport = (specifier: string, names: string[], start: number) => scan.imports.push({ specifier, names, line: line(start) })
  for (const entry of module.staticImports) {
    addImport(entry.moduleRequest.value, entry.entries.map(e => e.importName.name ?? e.localName.value), entry.start)
    for (const e of entry.entries) local.add(e.localName.value)
  }
  for (const entry of module.staticExports) {
    const request = entry.entries.find(e => e.moduleRequest)?.moduleRequest
    if (request) addImport(request.value, entry.entries.flatMap(e => e.importName.name ? [e.importName.name] : []), entry.start)
  }
  for (const entry of module.dynamicImports) {
    const request = code.slice(entry.moduleRequest.start, entry.moduleRequest.end)
    const literal = request.match(/^(['"`])([^'"`$]+)\1$/)
    if (literal) addImport(literal[2]!, [], entry.start)
  }

  walk(program as unknown as AstNode, (node, parent, key) => {
    if (node.type !== 'Identifier') return
    const name = node.name as string
    if (parent?.type === 'MemberExpression' && key === 'property' && !parent.computed) return
    if (parent?.type === 'Property' && key === 'key' && !parent.computed && !parent.shorthand) return
    if ((parent?.type === 'VariableDeclarator' || parent?.type === 'FunctionDeclaration') && key === 'id') {
      local.add(name)
      return
    }
    addFirst(scan.identifiers, name, line(node.start as number))
  })
  for (const name of local) scan.identifiers.delete(name)
}

function scanTemplate(node: TemplateNode, scan: FileScan, lineOf: (offset: number) => number) {
  const addExpression = (expression?: { content?: string, loc: Loc }) => {
    for (const match of expression?.content?.matchAll(IDENTIFIER_RE) ?? []) {
      addFirst(scan.identifiers, match[0], lineOf(expression!.loc.start.offset + match.index))
    }
  }
  if (node.type === ELEMENT && node.tag && /[A-Z-]/.test(node.tag)) addFirst(scan.components, pascalCase(node.tag), node.loc.start.line)
  if (node.type === INTERPOLATION && typeof node.content === 'object') addExpression(node.content)
  for (const prop of node.props ?? []) {
    if (prop.type === DIRECTIVE) addExpression(prop.exp)
  }
  for (const child of node.children ?? []) scanTemplate(child, scan, lineOf)
}

/** Collects what a source file depends on: explicit imports plus auto-import candidates. */
export function scanFile(filename: string, code: string): FileScan {
  const scan: FileScan = {
    imports: [],
    identifiers: new Map(),
    components: new Map(),
    loc: code.split('\n').filter(line => line.trim()).length
  }
  const lineOf = lineIndex(code)
  if (filename.endsWith('.vue')) {
    // SFC mode parses only <template> as HTML, other blocks stay raw text.
    const root = parseTemplate(code, { parseMode: 'sfc' }) as unknown as TemplateNode
    for (const block of root.children ?? []) {
      if (block.type !== ELEMENT) continue
      if (block.tag === 'script') {
        const lang = block.props?.find(prop => prop.type === ATTRIBUTE && prop.name === 'lang')?.value?.content ?? 'js'
        const text = block.children?.find(child => child.type === TEXT)
        if (typeof text?.content === 'string') scanScript(filename, text.content, lang, scan, lineOf, text.loc.start.offset)
      } else if (block.tag === 'template') {
        for (const child of block.children ?? []) scanTemplate(child, scan, lineOf)
      }
    }
  } else {
    const lang = filename.match(/\.(\w+)$/)?.[1] ?? 'ts'
    scanScript(filename, code, lang.replace(/^m|^c/, ''), scan, lineOf)
  }
  return scan
}
