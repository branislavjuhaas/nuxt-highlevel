import { sum } from "@mono/utils";

export function useCart() {
  const items = useState<number[]>("cart", () => []);
  return { total: computed(() => sum(items.value)) };
}
