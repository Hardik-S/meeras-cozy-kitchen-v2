import { describe, expect, it } from "vitest";
import { defaultAdminData, getPublicCatalogFromAdminData } from "./catalog";

describe("cake-only catalog mappers", () => {
  it("seeds only the canonical cake product and menu categories", () => {
    expect(defaultAdminData.settings.defaultSender).toBe("batb4016@gmail.com");
    expect(defaultAdminData.products.map((product) => product.id)).toEqual(["cake"]);
    expect(defaultAdminData.offerings.reduce<Record<string, number>>((counts, item) => {
      counts[item.category] = (counts[item.category] ?? 0) + 1;
      return counts;
    }, {})).toEqual({
      "cake-size": 3,
      flavour: 5,
      frosting: 3,
      filling: 5,
      topping: 7
    });
  });

  it("filters disabled, non-cake, invalid, and obsolete-category rows", () => {
    const catalog = getPublicCatalogFromAdminData({
      ...defaultAdminData,
      products: [
        ...defaultAdminData.products,
        { id: "cupcakes", label: "Cupcakes", low: 30, high: 30, enabled: true, sortOrder: 2 }
      ],
      offerings: [
        ...defaultAdminData.offerings.map((item) =>
          item.id === "oreo-crunch" ? { ...item, enabled: false } : item
        ),
        {
          id: "cupcake-tray",
          productId: "cupcakes",
          category: "topping",
          label: "Cupcake tray",
          low: 5,
          high: 5,
          servings: "",
          enabled: true,
          sortOrder: 99
        },
        {
          id: "old-addon",
          productId: "cake",
          category: "add-on" as "topping",
          label: "Old add-on",
          low: 5,
          high: 5,
          servings: "",
          enabled: true,
          sortOrder: 100
        },
        {
          id: "bad-price",
          productId: "cake",
          category: "topping",
          label: "Bad price",
          low: 10,
          high: 5,
          servings: "",
          enabled: true,
          sortOrder: 101
        }
      ]
    });

    expect(catalog.products.map((item) => item.id)).toEqual(["cake"]);
    expect(catalog.frostings.map((item) => item.id)).not.toContain("oreo-crunch");
    expect(catalog.offerings.map((item) => item.id)).not.toEqual(expect.arrayContaining([
      "cupcake-tray",
      "old-addon",
      "bad-price"
    ]));
  });

  it("normalizes copied Sheet ids and labels", () => {
    const catalog = getPublicCatalogFromAdminData({
      ...defaultAdminData,
      offerings: [
        ...defaultAdminData.offerings,
        {
          id: " Mango-Filling ",
          productId: " Cake ",
          category: " Filling " as "filling",
          label: " Mango\n filling ",
          low: 5,
          high: 5,
          servings: " ",
          enabled: true,
          sortOrder: 99
        }
      ]
    });

    expect(catalog.fillings.find((item) => item.id === "mango-filling")).toMatchObject({
      productId: "cake",
      label: "Mango filling",
      servings: ""
    });
  });
});
