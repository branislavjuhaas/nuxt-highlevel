export function useOpenInEditor() {
  const toast = useToast()

  async function open(path: string) {
    try {
      await $fetch('/api/open', { method: 'POST', body: { path } })
    } catch (error) {
      const message = (error as { statusMessage?: string }).statusMessage ?? String(error)
      toast.add({ title: 'Could not open the editor', description: message, color: 'error' })
    }
  }

  return { open }
}
