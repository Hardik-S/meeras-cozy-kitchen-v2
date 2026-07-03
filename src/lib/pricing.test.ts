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

  it("normalizes copied catalog id casing before matching prices", () => {
    const estimate = calculateQuoteEstimate({
      productType: " Cake ",
      cakeSizeId: " Eight-Inch ",
      addOnIds: [" Fresh-Berries "]
    });

    expect(estimate.low).toBe(98);
    expect(estimate.high).toBe(112);
    expect(estimate.lines.map((line) => line.label)).toEqual([
      "8 inch round cake",
      "Fresh berry finish"
    ]);
  });

  it("keeps sheet-driven price ranges ordered when low and high are swapped", () => {
    const estimate = calculateQuoteEstimate(
      {
        productType: "cake",
        cakeSizeId: "sheet-eight-inch",
        addOnIds: ["rush-finish"]
      },
      {
        products: [],
        cakeSizes: [
          {
            id: "sheet-eight-inch",
            label: "Sheet eight inch",
            servings: "14-20",
            low: 120,
            high: 95
          }
        ],
        addOns: [
          {
            id: "rush-finish",
            label: "Rush finish",
            low: 15,
            high: 10
          }
        ]
      }
    );

    expect(estimate.low).toBe(105);
    expect(estimate.high).toBe(135);
    expect(estimate.lines).toEqual([
      { label: "Sheet eight inch", low: 95, high: 120 },
      { label: "Rush finish", low: 10, high: 15 }
    ]);
  });
});
