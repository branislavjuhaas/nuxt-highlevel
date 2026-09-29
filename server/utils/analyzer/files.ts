import { parse as parseTemplate } from '@vue/compiler-dom'
import { type AstNode, parseScript, walk } from './ast'

export interface ExplicitImport {
  specifier: string
  names: string[]
}

export interface FileScan {
  imports: ExplicitImport[]
  /** Free identifiers in scripts and template expressions, candidates for auto-imports. */
  identifiers: Set<string>
  /** Component tags in PascalCase. */
  components: Set<string>
  loc: number
}

const IDENTIFIER_RE = /(?<![.\w$])[A-Z_$][\w$]*/gi
const ELEMENT = 1
const TEXT = 2
const INTERPOLATION = 5
const ATTRIBUTE = 6
const DIRECTIVE = 7

interface TemplateNode {
  type: number
  tag?: string
  props?: { type: number, name: string, value?: { content: string }, exp?: { content?: string } }[]
  content?: string | { content?: string }
  children?: TemplateNode[]
}

function pascalCase(tag: string) {
  return tag.replace(/(^|-)(\w)/g, (_, _dash, char: string) => char.toUpperCase())
}

function scanScript(filename: string, code: string, lang: string, scan: FileScan) {
  const { program, module } = parseScript(`${filename}.${lang}`, code)
  const local = new Set<string>()

  const addImport = (specifier: string, names: string[]) => scan.imports.push({ specifier, names })
  for (const entry of module.staticImports) {
    addImport(entry.moduleRequest.value, entry.entries.map(e => e.importName.name ?? e.localName.value))
    for (const e of entry.entries) local.add(e.localName.value)
  }
  for (const entry of module.staticExports) {
    const request = entry.entries.find(e => e.moduleRequest)?.moduleRequest
    if (request) addImport(request.value, entry.entries.flatMap(e => e.importName.name ? [e.importName.name] : []))
  }
  for (const entry of module.dynamicImports) {
    const request = code.slice(entry.moduleRequest.start, entry.moduleRequest.end)
    const literal = request.match(/^(['"`])([^'"`$]+)\1$/)
    if (literal) addImport(literal[2]!, [])
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
    scan.identifiers.add(name)
  })
  for (const name of local) scan.identifiers.delete(name)
}

function scanTemplate(node: TemplateNode, scan: FileScan) {
  const addExpression = (expression?: string) => {
    for (const [name] of expression?.matchAll(IDENTIFIER_RE) ?? []) scan.identifiers.add(name)
  }
  if (node.type === ELEMENT && node.tag && /[A-Z-]/.test(node.tag)) scan.components.add(pascalCase(node.tag))
  if (node.type === INTERPOLATION && typeof node.content === 'object') addExpression(node.content.content)
  for (const prop of node.props ?? []) {
    if (prop.type === DIRECTIVE) addExpression(prop.exp?.content)
  }
  for (const child of node.children ?? []) scanTemplate(child, scan)
}

/** Collects what a source file depends on: explicit imports plus auto-import candidates. */
export function scanFile(filename: string, code: string): FileScan {
  const scan: FileScan = {
    imports: [],
    identifiers: new Set(),
    components: new Set(),
    loc: code.split('\n').filter(line => line.trim()).length
  }
  if (filename.endsWith('.vue')) {
    // SFC mode parses only <template> as HTML, other blocks stay raw text.
    const root = parseTemplate(code, { parseMode: 'sfc' }) as unknown as TemplateNode
    for (const block of root.children ?? []) {
      if (block.type !== ELEMENT) continue
      if (block.tag === 'script') {
        const lang = block.props?.find(prop => prop.type === ATTRIBUTE && prop.name === 'lang')?.value?.content ?? 'js'
        const text = block.children?.find(child => child.type === TEXT)?.content
        if (typeof text === 'string') scanScript(filename, text, lang, scan)
      } else if (block.tag === 'template') {
        for (const child of block.children ?? []) scanTemplate(child, scan)
      }
    }
  } else {
    const lang = filename.match(/\.(\w+)$/)?.[1] ?? 'ts'
    scanScript(filename, code, lang.replace(/^m|^c/, ''), scan)
  }
  return scan
}
