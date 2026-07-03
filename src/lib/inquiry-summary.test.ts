import { describe, expect, it } from "vitest";
import { defaultPublicCatalog } from "./catalog";
import { buildInquirySummary } from "./inquiry-summary";
import type { InquiryInput } from "./validation";

const inquiry: InquiryInput = {
  name: "Amina",
  email: "amina@example.com",
  phone: "4165550101",
  eventDate: "2099-05-20",
  servings: 18,
  productType: "mini-cheesecake-box",
  flavourId: "mango-saffron",
  addOnIds: [],
  budget: "100-150",
  message: "Birthday dessert box with soft florals.",
  acknowledgements: {
    notice: true,
    allergens: true,
    address: true,
    certification: true
  },
  website: ""
};

describe("buildInquirySummary", () => {
  it("uses live catalog labels and prices for Sheet-driven products", () => {
    const summary = buildInquirySummary(inquiry, {
      ...defaultPublicCatalog,
      products: [
        ...defaultPublicCatalog.products,
        {
          id: "mini-cheesecake-box",
          label: "Mini cheesecake box",
          low: 42,
          high: 52,
          enabled: true,
          sortOrder: 4
        }
      ],
      flavours: [
        ...defaultPublicCatalog.flavours,
        {
          id: "mango-saffron",
          productId: "all",
          category: "flavour",
          label: "Mango saffron",
          low: 0,
          high: 0,
          servings: "",
          enabled: true,
          sortOrder: 99
        }
      ]
    });

    expect(summary).toContain("Product: Mini cheesecake box");
    expect(summary).toContain("Flavour: Mango saffron");
    expect(summary).toContain("Estimated range: $42-$52");
  });

  it("includes selected Sheet-backed add-ons in the customer summary", () => {
    const summary = buildInquirySummary(
      {
        ...inquiry,
        addOnIds: ["gold-leaf", "custom-topper"]
      },
      {
        ...defaultPublicCatalog,
        products: [
          ...defaultPublicCatalog.products,
          {
            id: "mini-cheesecake-box",
            label: "Mini cheesecake box",
            low: 42,
            high: 52,
            enabled: true,
            sortOrder: 4
          }
        ],
        addOns: [
          ...defaultPublicCatalog.addOns,
          {
            id: "gold-leaf",
            productId: "all",
            category: "add-on",
            label: "Gold leaf finish",
            low: 18,
            high: 24,
            servings: "",
            enabled: true,
            sortOrder: 20
          },
          {
            id: "custom-topper",
            productId: "mini-cheesecake-box",
            category: "add-on",
            label: "Custom topper",
            low: 12,
            high: 16,
            servings: "",
            enabled: true,
            sortOrder: 21
          }
        ]
      }
    );

    expect(summary).toContain("Add-ons: Gold leaf finish, Custom topper");
    expect(summary).toContain("Estimated range: $72-$92");
  });

  it("ignores copied Sheet-backed add-ons scoped to another product", () => {
    const summary = buildInquirySummary(
      {
        ...inquiry,
        addOnIds: ["gold-leaf", "cake-topper"]
      },
      {
        ...defaultPublicCatalog,
        products: [
          ...defaultPublicCatalog.products,
          {
            id: "mini-cheesecake-box",
            label: "Mini cheesecake box",
            low: 42,
            high: 52,
            enabled: true,
            sortOrder: 4
          }
        ],
        addOns: [
          ...defaultPublicCatalog.addOns,
          {
            id: "gold-leaf",
            productId: "all",
            category: "add-on",
            label: "Gold leaf finish",
            low: 18,
            high: 24,
            servings: "",
            enabled: true,
            sortOrder: 20
          },
          {
            id: "cake-topper",
            productId: "cake",
            category: "add-on",
            label: "Cake topper",
            low: 12,
            high: 16,
            servings: "",
            enabled: true,
            sortOrder: 21
          }
        ]
      }
    );

    expect(summary).toContain("Add-ons: Gold leaf finish");
    expect(summary).not.toContain("Cake topper");
    expect(summary).toContain("Estimated range: $60-$76");
  });

  it("omits the cake-size line for non-cake product summaries", () => {
    const summary = buildInquirySummary(inquiry, {
      ...defaultPublicCatalog,
      products: [
        ...defaultPublicCatalog.products,
        {
          id: "mini-cheesecake-box",
          label: "Mini cheesecake box",
          low: 42,
          high: 52,
          enabled: true,
          sortOrder: 4
        }
      ]
    });

    expect(summary).toContain("Product: Mini cheesecake box");
    expect(summary).not.toContain("Cake size:");
  });
});
