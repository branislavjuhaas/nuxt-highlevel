export function formatCount(n: number) {
  return new Intl.NumberFormat('en').format(n)
}

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
