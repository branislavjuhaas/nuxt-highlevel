/** Finds strongly connected components with more than one node (Tarjan). */
export function findCycles(nodes: string[], edges: Map<string, Set<string>>): string[][] {
  let index = 0
  const indices = new Map<string, number>()
  const lowlink = new Map<string, number>()
  const stack: string[] = []
  const onStack = new Set<string>()
  const cycles: string[][] = []

  const connect = (node: string) => {
    indices.set(node, index)
    lowlink.set(node, index++)
    stack.push(node)
    onStack.add(node)
    for (const next of edges.get(node) ?? []) {
      if (!indices.has(next)) {
        connect(next)
        lowlink.set(node, Math.min(lowlink.get(node)!, lowlink.get(next)!))
      } else if (onStack.has(next)) {
        lowlink.set(node, Math.min(lowlink.get(node)!, indices.get(next)!))
      }
    }
    if (lowlink.get(node) === indices.get(node)) {
      const component: string[] = []
      let member: string
      do {
        member = stack.pop()!
        onStack.delete(member)
        component.push(member)
      } while (member !== node)
      if (component.length > 1) cycles.push(component.reverse())
    }
  }
  for (const node of nodes) {
    if (!indices.has(node)) connect(node)
  }
  return cycles
}
