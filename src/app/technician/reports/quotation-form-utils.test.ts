import { describe, expect, it } from "vitest";
import { calculateMaterialLineTotal, getQuotationMaterialValidationErrors } from "./quotation-form-utils";

describe("quotation form helpers", () => {
  it("calculates line totals from quantity and amount", () => {
    expect(calculateMaterialLineTotal(2, 150.5)).toBe(301);
  });

  it("flags incomplete rows so the form cannot be submitted until fixed", () => {
    const errors = getQuotationMaterialValidationErrors([
      { description: "", qty: 0, amt: 0, total: 0 },
    ]);

    expect(errors[0]?.errors).toContain("Select a material");
    expect(errors[0]?.errors).toContain("Quantity must be at least 1");
  });
});
