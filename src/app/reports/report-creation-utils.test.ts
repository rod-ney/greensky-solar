import { describe, expect, it } from "vitest";
import { canCreateReport } from "./report-creation-utils";

describe("canCreateReport", () => {
  it("requires an attachment for service reports", () => {
    expect(
      canCreateReport({
        title: "Warranty document",
        type: "service",
        attachment: null,
      })
    ).toBe(false);
  });

  it("allows quotations to be created without an attachment", () => {
    expect(
      canCreateReport({
        title: "Quotation for rooftop install",
        type: "quotation",
        attachment: null,
      })
    ).toBe(true);
  });

  it("requires a title before submission", () => {
    expect(
      canCreateReport({
        title: "   ",
        type: "quotation",
        attachment: null,
      })
    ).toBe(false);
  });
});
