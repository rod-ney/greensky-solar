import type { InventoryItem } from "@/types";

export function getMaterialSelectOptions(items: InventoryItem[], currentValue: string) {
  const options = new Map<string, { label: string; value: string }>();

  if (currentValue.trim()) {
    const currentValueTrimmed = currentValue.trim();
    options.set(currentValueTrimmed, {
      label: currentValueTrimmed,
      value: currentValueTrimmed,
    });
  }

  items.forEach((item) => {
    const value = item.name?.trim();
    if (!value) return;
    options.set(value, {
      label: `${value}${item.sku ? ` (${item.sku})` : ""}`,
      value,
    });
  });

  return Array.from(options.values()).map((option) => ({
    label: option.label,
    value: option.value,
  }));
}
