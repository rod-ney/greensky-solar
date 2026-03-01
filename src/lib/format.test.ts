import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate } from "./format";

describe("format", () => {
  describe("formatCurrency", () => {
    it("formats PHP amount", () => {
      expect(formatCurrency(1000)).toMatch(/1,?000|1.?000/);
      expect(formatCurrency(0)).toContain("0");
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
