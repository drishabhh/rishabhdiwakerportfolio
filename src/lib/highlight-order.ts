import type { HighlightItem } from "@/lib/content-types";

export function withHighlightOrders(items: HighlightItem[]): HighlightItem[] {
  return items.map((item, index) => ({
    ...item,
    order: Number.isFinite(item.order) && (item.order as number) > 0 ? Math.round(item.order as number) : index + 1,
  }));
}

export function sortedHighlights(items: HighlightItem[]): HighlightItem[] {
  return withHighlightOrders(items)
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || 0);
}

/** Move one highlight to `targetOrder` (1-based). Matching numbers shift so every slot stays unique. */
export function moveHighlightToOrder(
  items: HighlightItem[],
  fromIndex: number,
  targetOrder: number,
): HighlightItem[] {
  if (fromIndex < 0 || fromIndex >= items.length) return sortedHighlights(items);

  const dest = Math.max(1, Math.min(items.length, Math.round(targetOrder) || 1));
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return sortedHighlights(items);
  next.splice(dest - 1, 0, moved);
  return next.map((item, index) => ({ ...item, order: index + 1 }));
}

export function insertHighlightAtTop(items: HighlightItem[], item: HighlightItem): HighlightItem[] {
  return [item, ...items].map((entry, index) => ({ ...entry, order: index + 1 }));
}
