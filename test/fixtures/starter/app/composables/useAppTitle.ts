export function useAppTitle() {
  return computed(() => capitalize(useRoute().name?.toString() ?? 'home'))
}
