export function useTrack() {
  return (event: string) => console.info('track', event)
}
