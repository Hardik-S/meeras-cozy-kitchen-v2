import { describe, expect, it } from "vitest";
import { createInquirySchema, inquirySchema } from "./validation";

const baseInquiry = {
  name: "Amina",
  email: "amina@example.com",
  phone: "4165550101",
  eventDate: "2026-05-20",
  servings: 18,
  productType: "cake",
  cakeSizeId: "eight-inch",
  flavourId: "vanilla-rose",
  addOnIds: ["fresh-berries"],
  budget: "100-150",
  message: "Birthday cake with soft florals.",
  acknowledgements: {
    notice: true,
    allergens: true,
    address: true,
    certification: true
  },
  website: ""
};

describe("inquirySchema", () => {
  it("accepts a complete inquiry with required acknowledgements", () => {
    const parsed = inquirySchema.safeParse(baseInquiry);

    expect(parsed.success).toBe(true);
  });

  it("accepts Sheet-driven product ids from the admin catalog", () => {
    const parsed = inquirySchema.safeParse({
      ...baseInquiry,
      productType: "mini-cheesecake-box",
      cakeSizeId: undefined
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects missing acknowledgement and honeypot submissions", () => {
    const parsed = inquirySchema.safeParse({
      ...baseInquiry,
      acknowledgements: {
        ...baseInquiry.acknowledgements,
        certification: false
      },
      website: "spam"
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects pickup dates inside the seven-day notice window", () => {
    const schema = createInquirySchema(new Date("2026-05-06T12:00:00-04:00"));

    const parsed = schema.safeParse({
      ...baseInquiry,
      eventDate: "2026-05-12"
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects impossible pickup dates", () => {
    const schema = createInquirySchema(new Date("2026-05-06T12:00:00-04:00"));

    const parsed = schema.safeParse({
      ...baseInquiry,
      eventDate: "9999-99-99"
    });

    expect(parsed.success).toBe(false);
  });
});
