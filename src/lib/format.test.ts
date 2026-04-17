import { describe, it, expect } from "vitest";
import { formatCurrency, formatCurrencyDecimal, formatDate } from "./format";

describe("format", () => {
  describe("formatCurrency", () => {
    it("formats PHP amount", () => {
      expect(formatCurrency(1000)).toMatch(/1,?000|1.?000/);
      expect(formatCurrency(0)).toContain("0");
    });
  });

  describe("formatCurrencyDecimal", () => {
    it("formats PHP with two fraction digits", () => {
      expect(formatCurrencyDecimal(1000)).toMatch(/1,?000\.00|1[.,]000[.,]00/);
      expect(formatCurrencyDecimal(99.5)).toMatch(/99\.50|99,50/);
    });
  });

  describe("formatDate", () => {
    it("formats YYYY-MM-DD string", () => {
      const result = formatDate("2024-06-15");
      expect(result).toMatch(/2024/);
      expect(result).toMatch(/Jun|June/);
      expect(result).toMatch(/15/);
    });
  });
});
