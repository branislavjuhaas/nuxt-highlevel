import { parseSync } from "oxc-parser";

export interface AstNode {
  type: string;
  [key: string]: unknown;
}

export function parseScript(filename: string, code: string) {
  return parseSync(filename, code, { sourceType: "module" });
}

function isNode(value: unknown): value is AstNode {
  return typeof value === "object" && value !== null && typeof (value as AstNode).type === "string";
}

/** Depth-first walk over an ESTree AST. */
export function walk(
  node: AstNode,
  visit: (node: AstNode, parent: AstNode | null, key: string) => void,
  parent: AstNode | null = null,
  key = "",
) {
  visit(node, parent, key);
  for (const [childKey, value] of Object.entries(node)) {
    if (childKey === "parent") continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (isNode(item)) walk(item, visit, node, childKey);
      }
    } else if (isNode(value)) {
      walk(value, visit, node, childKey);
    }
  }
}

/** String value of a literal or an expression-free template literal. */
export function stringValue(node: unknown): string | undefined {
  if (!isNode(node)) return;
  if (node.type === "Literal" && typeof node.value === "string") return node.value;
  if (node.type === "TemplateLiteral" && (node.expressions as unknown[]).length === 0) {
    const [quasi] = node.quasis as { value: { cooked: string } }[];
    return quasi?.value.cooked;
  }
}

export function propertyName(node: AstNode): string | undefined {
  const key = node.key as AstNode;
  if (node.computed) return;
  if (key.type === "Identifier") return key.name as string;
  return stringValue(key);
}
