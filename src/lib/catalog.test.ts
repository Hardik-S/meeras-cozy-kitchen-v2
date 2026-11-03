import { describe, expect, it } from "vitest";
import { defaultAdminData, getPublicCatalogFromAdminData, offeringsForProduct } from "./catalog";

describe("catalog mappers", () => {
  it("seeds cake and cake shooters with shared menu categories", () => {
    expect(defaultAdminData.settings.defaultSender).toBe("meerascozykitchen@gmail.com");
    expect(defaultAdminData.settings.defaultReceiver).toBe("meerascozykitchen@gmail.com");
    expect(defaultAdminData.products.map((product) => product.id)).toEqual(["cake", "cake-shooters"]);
    expect(defaultAdminData.offerings.reduce<Record<string, number>>((counts, item) => {
      counts[item.category] = (counts[item.category] ?? 0) + 1;
      return counts;
    }, {})).toEqual({
      "cake-size": 3,
      flavour: 5,
      frosting: 8,
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

    expect(catalog.products.map((item) => item.id)).toEqual(["cake", "cake-shooters"]);
    expect(catalog.frostings.map((item) => item.id)).not.toContain("oreo-crunch");
    expect(catalog.offerings.map((item) => item.id)).not.toEqual(expect.arrayContaining([
      "cupcake-tray",
      "old-addon",
      "bad-price"
    ]));
  });

  it("keeps all-product options available to shooters and honours product assignments", () => {
    const catalog = getPublicCatalogFromAdminData({
      ...defaultAdminData,
      offerings: [
        ...defaultAdminData.offerings,
        { id: "cake-only-filling", productId: "cake", category: "filling", label: "Cake only", low: 3, high: 3, servings: "", enabled: true, sortOrder: 99 }
      ]
    });

    expect(offeringsForProduct(catalog.fillings, "cake-shooters").map((item) => item.id)).not.toContain("cake-only-filling");
    expect(offeringsForProduct(catalog.fillings, "cake").map((item) => item.id)).toContain("cake-only-filling");
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
