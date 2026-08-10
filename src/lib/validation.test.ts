import { describe, expect, it } from "vitest";
import { createInquirySchema, pickupTimeOptions } from "./validation";

const fixtureToday = new Date("2026-05-06T12:00:00-04:00");

const baseInquiry = {
  name: "Amina",
  email: "amina@example.com",
  phone: "4165550101",
  eventDate: "2026-05-20",
  pickupTime: "12:00-14:00",
  cakeSizeId: "eight-inch",
  flavourId: "vanilla",
  frostingId: "oreo-crunch",
  fillingIds: ["raspberry-filling"],
  toppingIds: ["fresh-strawberry"],
  message: "Birthday cake with soft florals.",
  acknowledgements: {
    notice: true,
    allergens: true,
    address: true,
    inspiration: true,
    payment: true
  },
  website: ""
};

describe("inquirySchema", () => {
  it.each(pickupTimeOptions)("accepts pickup window $label", ({ value }) => {
    expect(createInquirySchema(fixtureToday).safeParse({
      ...baseInquiry,
      pickupTime: value
    }).success).toBe(true);
  });

  it("normalizes copied ids, multi-select values, and customer fields", () => {
    const parsed = createInquirySchema(fixtureToday).safeParse({
      ...baseInquiry,
      name: " Amina\nMemo ",
      email: "  amina@example.com  ",
      cakeSizeId: " Eight-Inch ",
      flavourId: " Vanilla ",
      frostingId: " Oreo-Crunch ",
      fillingIds: [" raspberry-filling ", "raspberry-filling", " apricot-filling "],
      toppingIds: [" Fresh-Strawberry "],
      website: "   "
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data).toMatchObject({
      name: "Amina Memo",
      email: "amina@example.com",
      cakeSizeId: "eight-inch",
      flavourId: "vanilla",
      frostingId: "oreo-crunch",
      fillingIds: ["raspberry-filling", "apricot-filling"],
      toppingIds: ["fresh-strawberry"],
      website: ""
    });
  });

  it("allows no fillings or toppings when a frosting is selected", () => {
    const parsed = createInquirySchema(fixtureToday).safeParse({
      ...baseInquiry,
      fillingIds: [],
      toppingIds: []
    });

    expect(parsed.success).toBe(true);
  });

  it.each([undefined, ""])("rejects missing frosting selection %s", (frostingId) => {
    expect(createInquirySchema(fixtureToday).safeParse({
      ...baseInquiry,
      frostingId
    }).success).toBe(false);
  });

  it("keeps cake and frosting flavours independent", () => {
    const parsed = createInquirySchema(fixtureToday).safeParse({
      ...baseInquiry,
      flavourId: "vanilla",
      frostingId: "chocolate-frosting"
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data).toMatchObject({
      flavourId: "vanilla",
      frostingId: "chocolate-frosting"
    });
  });

  it.each([undefined, "", "09:00-11:00"])("rejects missing or invalid pickup time %s", (pickupTime) => {
    expect(createInquirySchema(fixtureToday).safeParse({
      ...baseInquiry,
      pickupTime
    }).success).toBe(false);
  });

  it("enforces the inspiration-photo acknowledgement", () => {
    expect(createInquirySchema(fixtureToday).safeParse({
      ...baseInquiry,
      acknowledgements: {
        ...baseInquiry.acknowledgements,
        inspiration: false
      }
    }).success).toBe(false);
  });

  it("enforces the payment-policy acknowledgement", () => {
    expect(createInquirySchema(fixtureToday).safeParse({
      ...baseInquiry,
      acknowledgements: {
        ...baseInquiry.acknowledgements,
        payment: false
      }
    }).success).toBe(false);
  });

  it("rejects removed legacy inquiry fields", () => {
    expect(createInquirySchema(fixtureToday).safeParse({
      ...baseInquiry,
      productType: "cake",
      servings: 18,
      budget: "100-150",
      addOnIds: ["fresh-berries"]
    }).success).toBe(false);
  });

  it("uses an injected date for the seven-day notice boundary", () => {
    const schema = createInquirySchema(fixtureToday);

    expect(schema.safeParse({ ...baseInquiry, eventDate: "2026-05-13" }).success).toBe(true);
    expect(schema.safeParse({ ...baseInquiry, eventDate: "2026-05-12" }).success).toBe(false);
  });

  it("rejects impossible dates, missing flavours, and a filled honeypot", () => {
    const schema = createInquirySchema(fixtureToday);

    expect(schema.safeParse({ ...baseInquiry, eventDate: "9999-99-99" }).success).toBe(false);
    expect(schema.safeParse({ ...baseInquiry, flavourId: "" }).success).toBe(false);
    expect(schema.safeParse({ ...baseInquiry, website: "spam" }).success).toBe(false);
  });
});
