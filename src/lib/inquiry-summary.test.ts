import { describe, expect, it } from "vitest";
import { defaultPublicCatalog } from "./catalog";
import { buildInquirySummary } from "./inquiry-summary";
import type { InquiryInput } from "./validation";

const inquiry: InquiryInput = {
  name: "Amina",
  email: "amina@example.com",
  phone: "4165550101",
  eventDate: "2099-05-20",
  pickupTime: "12:00-14:00",
  cakeSizeId: "eight-inch",
  flavourId: "vanilla",
  frostingId: "white-chocolate-ganache",
  fillingIds: ["raspberry-filling", "apricot-filling"],
  toppingIds: ["fresh-strawberry", "chopped-pistachio"],
  message: "Birthday cake with soft florals.",
  acknowledgements: {
    notice: true,
    allergens: true,
    address: true,
    certification: true,
    inspiration: true,
    payment: true
  },
  website: ""
};

describe("buildInquirySummary", () => {
  it("includes pickup time and every selected cake option", () => {
    const summary = buildInquirySummary(inquiry);

    expect(summary).toContain("Pickup time: 12pm-2pm");
    expect(summary).toContain("Cake size: 8-inch cake");
    expect(summary).toContain("Cake flavour: Vanilla");
    expect(summary).toContain("Frosting flavour: White Chocolate Ganache");
    expect(summary).toContain("Fillings: Raspberry, Apricot");
    expect(summary).toContain("Toppings: Fresh Strawberry, Chopped Pistachio");
    expect(summary).toContain("Starting at $105");
    expect(summary).toContain(
      "Do not send payment until Meera accepts your order and confirms the final price in writing. Once accepted, 50% of the confirmed final price is due by e-transfer within 48 hours. The remaining 50% is due at pickup and may be paid by e-transfer or cash."
    );
    expect(summary).not.toContain("Product:");
    expect(summary).not.toContain("Servings:");
    expect(summary).not.toContain("Budget:");
  });

  it("uses normalized live catalog labels and prices", () => {
    const summary = buildInquirySummary(
      {
        ...inquiry,
        cakeSizeId: " sheet-eight-inch ",
        flavourId: " mango ",
        frostingId: undefined,
        fillingIds: [],
        toppingIds: []
      },
      {
        ...defaultPublicCatalog,
        cakeSizes: [{
          id: "sheet-eight-inch",
          productId: "cake",
          category: "cake-size",
          label: "Sheet\n eight\tinch",
          low: 80,
          high: 80,
          servings: "",
          enabled: true,
          sortOrder: 99
        }],
        flavours: [{
          id: "mango",
          productId: "cake",
          category: "flavour",
          label: "Mango\n cake",
          low: 0,
          high: 0,
          servings: "",
          enabled: true,
          sortOrder: 99
        }],
        frostings: [],
        fillings: [],
        toppings: []
      }
    );

    expect(summary).toContain("Cake size: Sheet eight inch");
    expect(summary).toContain("Cake flavour: Mango cake");
    expect(summary).toContain("Frosting flavour: Not recorded");
    expect(summary).toContain("Starting at $80");
  });
});
