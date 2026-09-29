export function useTodos() {
  const { data: todos } = useFetch("/api/todos", { default: () => [] });
  return { todos };
}
