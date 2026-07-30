import { describe, expect, it } from "vitest";
import {
  calculateQuoteEstimate,
  cakeSizes,
  fillings,
  flavours,
  frostings,
  optionPriceLabel,
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
    expect(frostings.map(({ id, label, low, high }) => ({ id, label, low, high }))).toEqual([
      { id: "chocolate-frosting", label: "Chocolate", low: 0, high: 0 },
      { id: "vanilla-frosting", label: "Vanilla", low: 0, high: 0 },
      { id: "almond-frosting", label: "Almond", low: 0, high: 0 },
      { id: "lemon-frosting", label: "Lemon", low: 0, high: 0 },
      { id: "coconut-frosting", label: "Coconut", low: 0, high: 0 },
      { id: "oreo-crunch", label: "Oreo Crunch", low: 5, high: 5 },
      { id: "dark-chocolate-ganache", label: "Dark Chocolate Ganache", low: 10, high: 10 },
      { id: "white-chocolate-ganache", label: "White Chocolate Ganache", low: 10, high: 10 }
    ]);
    expect(fillings).toHaveLength(5);
    expect(toppings).toHaveLength(7);
  });

  it("totals one frosting and multiple fillings and toppings", () => {
    const estimate = calculateQuoteEstimate({
      cakeSizeId: "eight-inch",
      flavourId: "lemon",
      frostingId: "white-chocolate-ganache",
      fillingIds: ["raspberry-filling", "apricot-filling"],
      toppingIds: ["fresh-strawberry", "chopped-pistachio"]
    });

    expect(estimate.low).toBe(105);
    expect(estimate.high).toBe(105);
    expect(estimate.lines.map((line) => line.label)).toEqual([
      "8-inch cake",
      "Lemon",
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
        flavourId: " Mango ",
        frostingId: " Oreo-Crunch ",
        fillingIds: [" Berry-Filling "],
        toppingIds: []
      },
      {
        cakeSizes: [{ id: "sheet-eight-inch", label: "Sheet\n eight\tinch", low: 120, high: 95 }],
        flavours: [{ id: "mango", label: "Mango cake", low: 0, high: 0 }],
        frostings: [{ id: "oreo-crunch", label: "Oreo Crunch", low: 5, high: 5 }],
        fillings: [{ id: "berry-filling", label: "Berry\n filling", low: 8, high: 6 }],
        toppings: []
      }
    );

    expect(estimate).toMatchObject({ low: 106, high: 133 });
    expect(estimate.lines.map((line) => line.label)).toEqual([
      "Sheet eight inch",
      "Mango cake",
      "Oreo Crunch",
      "Berry filling"
    ]);
  });

  it("formats fixed prices and starting prices without ranges", () => {
    expect(quoteRangeLabel({ low: 5, high: 5 })).toBe("$5");
    expect(optionPriceLabel({ low: 0, high: 0 })).toBe("Included");
    expect(optionPriceLabel({ low: 5, high: 5 })).toBe("+$5");
    expect(startingPriceLabel({ low: 75, high: 75 })).toBe("Starting at $75");
  });

  it("keeps included frosting flavours at zero while retaining their estimate line", () => {
    const estimate = calculateQuoteEstimate({
      cakeSizeId: "six-inch",
      flavourId: "almond",
      frostingId: "vanilla-frosting"
    });

    expect(estimate).toMatchObject({ low: 60, high: 60 });
    expect(estimate.lines.map(({ label, kind }) => ({ label, kind }))).toEqual([
      { label: "6-inch cake", kind: "size" },
      { label: "Almond", kind: "included" },
      { label: "Vanilla", kind: "included" }
    ]);
  });
});
