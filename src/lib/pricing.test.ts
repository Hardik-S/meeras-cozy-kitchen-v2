import { describe, expect, it } from "vitest";
import { calculateQuoteEstimate } from "./pricing";

describe("calculateQuoteEstimate", () => {
  it("totals cake base price and selected add-ons", () => {
    const estimate = calculateQuoteEstimate({
      productType: "cake",
      cakeSizeId: "eight-inch",
      addOnIds: ["fresh-berries", "fondant-name"]
    });

    expect(estimate.low).toBe(103);
    expect(estimate.high).toBe(120);
    expect(estimate.lines.map((line) => line.label)).toEqual([
      "8 inch round cake",
      "Fresh berry finish",
      "Fondant name or age"
    ]);
  });

  it("uses dessert-box pricing when no cake size is selected", () => {
    const estimate = calculateQuoteEstimate({
      productType: "dessert-box",
      addOnIds: []
    });

    expect(estimate.low).toBe(38);
    expect(estimate.high).toBe(48);
  });
});
