export function useCounter() {
  const count = useState("count", () => 0);
  const increment = () => count.value++;
  const reset = () => (count.value = 0);
  return { count, increment, reset };
}
