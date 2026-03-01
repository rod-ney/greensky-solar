import { z } from "zod";
import { nonNegativeNumber, optionalString } from "./common";

const inventoryCategory = z.enum([
  "solar_panels",
  "inverters",
  "batteries",
  "mounting",
  "wiring",
  "tools",
  "accessories",
]);

export const createInventoryItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(200).trim(),
  sku: z.string().min(1, "SKU is required").max(100).trim(),
  category: inventoryCategory.default("solar_panels"),
  quantity: nonNegativeNumber.default(0),
  minStock: nonNegativeNumber.default(0),
  unit: z.string().max(20).trim().default("pcs"),
  unitPrice: nonNegativeNumber.default(0),
  location: optionalString,
  supplier: optionalString,
  description: optionalString,
});

export const updateInventoryItemSchema = createInventoryItemSchema.partial();

export const allocateInventorySchema = z.object({
  items: z.array(
    z.object({
      inventoryItemId: z.string().min(1, "Inventory item ID is required"),
      quantity: z.number().int().positive("Quantity must be positive"),
      notes: z.string().optional(),
    })
  ).min(1, "At least one item is required"),
});
