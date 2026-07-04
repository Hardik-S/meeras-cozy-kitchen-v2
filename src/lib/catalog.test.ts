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

  it("normalizes Sheet text keys before public catalog consumers use them", () => {
    const catalog = getPublicCatalogFromAdminData({
      ...defaultAdminData,
      products: [
        ...defaultAdminData.products,
        {
          id: " mini-cheesecake-box ",
          label: " Mini cheesecake box ",
          low: 42,
          high: 52,
          enabled: true,
          sortOrder: 99
        }
      ],
      offerings: [
        ...defaultAdminData.offerings,
        {
          id: " Cookie-Topper ",
          productId: " Mini-Cheesecake-Box ",
          category: " Add-On " as "add-on",
          label: " Cookie topper ",
          low: 8,
          high: 10,
          servings: " ",
          enabled: true,
          sortOrder: 99
        }
      ]
    });

    expect(catalog.products.find((product) => product.label === "Mini cheesecake box")?.id).toBe("mini-cheesecake-box");
    expect(catalog.addOns.find((addOn) => addOn.label === "Cookie topper")).toMatchObject({
      id: "cookie-topper",
      productId: "mini-cheesecake-box",
      servings: ""
    });
  });

  it("filters copied catalog rows with impossible price ranges or ambiguous sort orders", () => {
    const catalog = getPublicCatalogFromAdminData({
      ...defaultAdminData,
      products: [
        ...defaultAdminData.products,
        {
          id: "bad-product",
          label: "Impossible product",
          low: -4,
          high: 12,
          enabled: true,
          sortOrder: 99
        },
        {
          id: "fractional-product",
          label: "Fractional product",
          low: 24,
          high: 30,
          enabled: true,
          sortOrder: 1.5
        }
      ],
      offerings: [
        ...defaultAdminData.offerings,
        {
          id: "bad-offering",
          productId: "all",
          category: "add-on",
          label: "Impossible add-on",
          low: 18,
          high: 8,
          servings: "",
          enabled: true,
          sortOrder: 99
        },
        {
          id: "fractional-offering",
          productId: "all",
          category: "add-on",
          label: "Fractional add-on",
          low: 8,
          high: 10,
          servings: "",
          enabled: true,
          sortOrder: 2.5
        }
      ]
    });

    expect(catalog.products.map((product) => product.id)).not.toContain("bad-product");
    expect(catalog.products.map((product) => product.id)).not.toContain("fractional-product");
    expect(catalog.addOns.map((offering) => offering.id)).not.toContain("bad-offering");
    expect(catalog.addOns.map((offering) => offering.id)).not.toContain("fractional-offering");
  });
});
