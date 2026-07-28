import { describe, expect, it } from "vitest";
import {
  calculateQuoteEstimate,
  cakeSizes,
  fillings,
  flavours,
  frostings,
  quoteRangeLabel,
  startingPriceLabel,
  toppings
} from "./pricing";

describe("cake-only pricing", () => {
  it("exposes the canonical menu", () => {
    expect(cakeSizes.map(({ label, low }) => [label, low])).toEqual([
      ["4-inch cake", 35],
      ["6-inch cake", 60],
      ["8-inch cake", 75]
    ]);
    expect(flavours.map((item) => item.label)).toEqual([
      "Chocolate",
      "Vanilla",
      "Almond",
      "Lemon",
      "Coconut"
    ]);
    expect(frostings).toHaveLength(3);
    expect(fillings).toHaveLength(5);
    expect(toppings).toHaveLength(7);
  });

  it("totals one frosting and multiple fillings and toppings", () => {
    const estimate = calculateQuoteEstimate({
      cakeSizeId: "eight-inch",
      frostingId: "white-chocolate-ganache",
      fillingIds: ["raspberry-filling", "apricot-filling"],
      toppingIds: ["fresh-strawberry", "chopped-pistachio"]
    });

    expect(estimate.low).toBe(105);
    expect(estimate.high).toBe(105);
    expect(estimate.lines.map((line) => line.label)).toEqual([
      "8-inch cake",
      "White Chocolate Ganache",
      "Raspberry",
      "Apricot",
      "Fresh Strawberry",
      "Chopped Pistachio"
    ]);
  });

  it("normalizes copied ids and reversed live price ranges", () => {
    const estimate = calculateQuoteEstimate(
      {
        cakeSizeId: " Sheet-Eight-Inch ",
        frostingId: " Oreo-Crunch ",
        fillingIds: [" Berry-Filling "],
        toppingIds: []
      },
      {
        cakeSizes: [{ id: "sheet-eight-inch", label: "Sheet\n eight\tinch", low: 120, high: 95 }],
        frostings: [{ id: "oreo-crunch", label: "Oreo Crunch", low: 5, high: 5 }],
        fillings: [{ id: "berry-filling", label: "Berry\n filling", low: 8, high: 6 }],
        toppings: []
      }
    );

    expect(estimate).toMatchObject({ low: 106, high: 133 });
    expect(estimate.lines.map((line) => line.label)).toEqual([
      "Sheet eight inch",
      "Oreo Crunch",
      "Berry filling"
    ]);
  });

  it("formats fixed prices and starting prices without ranges", () => {
    expect(quoteRangeLabel({ low: 5, high: 5 })).toBe("$5");
    expect(startingPriceLabel({ low: 75, high: 75 })).toBe("Starting at $75");
  });
});
