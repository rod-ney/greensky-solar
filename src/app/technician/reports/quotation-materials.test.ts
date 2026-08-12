import { describe, expect, it } from "vitest";
import { getMaterialSelectOptions } from "./quotation-materials";

describe("getMaterialSelectOptions", () => {
  it("includes inventory materials and preserves a custom current selection", () => {
    const options = getMaterialSelectOptions(
      [
        { id: "1", name: "Solar Panel", sku: "SP-001", category: "solar_panels", quantity: 5, minStock: 2, unit: "unit", unitPrice: 100, location: "A", supplier: "S", status: "in_stock", lastRestocked: "", description: "" },
        { id: "2", name: "Inverter", sku: "INV-001", category: "inverters", quantity: 3, minStock: 1, unit: "unit", unitPrice: 200, location: "A", supplier: "S", status: "in_stock", lastRestocked: "", description: "" },
      ],
      "Cable"
    );

    expect(options.map((option) => option.value)).toEqual(["Cable", "Solar Panel", "Inverter"]);
    expect(options.find((option) => option.value === "Cable")?.label).toBe("Cable");
  });
});
