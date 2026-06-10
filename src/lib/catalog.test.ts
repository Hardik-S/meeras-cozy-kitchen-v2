import { describe, expect, it } from "vitest";
import { defaultAdminData, getPublicCatalogFromAdminData } from "./catalog";

describe("catalog mappers", () => {
  it("seeds default admin data with owner settings", () => {
    expect(defaultAdminData.settings.defaultSender).toBe("batb4016@gmail.com");
    expect(defaultAdminData.settings.defaultReceiver).toBe("batb4016@gmail.com");
    expect(defaultAdminData.products.map((product) => product.id)).toEqual([
      "cake",
      "cupcakes",
      "dessert-box"
    ]);
  });

  it("filters disabled products and offerings from the public catalog", () => {
    const catalog = getPublicCatalogFromAdminData({
      ...defaultAdminData,
      products: defaultAdminData.products.map((product) =>
        product.id === "cupcakes" ? { ...product, enabled: false } : product
      ),
      offerings: defaultAdminData.offerings.map((offering) =>
        offering.id === "fresh-berries" ? { ...offering, enabled: false } : offering
      )
    });

    expect(catalog.products.map((product) => product.id)).not.toContain("cupcakes");
    expect(catalog.offerings.map((offering) => offering.id)).not.toContain("fresh-berries");
    expect(catalog.products.find((product) => product.id === "cake")?.low).toBe(58);
  });

  it("hides product-specific offerings when their product is disabled", () => {
    const catalog = getPublicCatalogFromAdminData({
      ...defaultAdminData,
      products: defaultAdminData.products.map((product) =>
        product.id === "cupcakes" ? { ...product, enabled: false } : product
      ),
      offerings: [
        ...defaultAdminData.offerings,
        {
          id: "mini-cupcake-tray",
          productId: "cupcakes",
          category: "add-on",
          label: "Mini cupcake tray",
          low: 24,
          high: 36,
          servings: "",
          enabled: true,
          sortOrder: 99
        }
      ]
    });

    expect(catalog.offerings.map((offering) => offering.id)).not.toContain("mini-cupcake-tray");
    expect(catalog.addOns.map((offering) => offering.id)).not.toContain("mini-cupcake-tray");
  });
});
