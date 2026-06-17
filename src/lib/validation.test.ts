import { describe, expect, it } from "vitest";
import { createInquirySchema } from "./validation";

const fixtureToday = new Date("2026-05-06T12:00:00-04:00");

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
    const inquirySchema = createInquirySchema(fixtureToday);
    const parsed = inquirySchema.safeParse(baseInquiry);

    expect(parsed.success).toBe(true);
  });

  it("trims pasted whitespace around customer email addresses", () => {
    const inquirySchema = createInquirySchema(fixtureToday);
    const parsed = inquirySchema.safeParse({
      ...baseInquiry,
      email: "  amina@example.com  "
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data?.email).toBe("amina@example.com");
  });

  it("normalizes copied add-on ids before pricing and summaries use them", () => {
    const inquirySchema = createInquirySchema(fixtureToday);
    const parsed = inquirySchema.safeParse({
      ...baseInquiry,
      addOnIds: [" fresh-berries ", "fresh-berries", " floral-piping "]
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data?.addOnIds).toEqual(["fresh-berries", "floral-piping"]);
  });

  it("accepts Sheet-driven product ids from the admin catalog", () => {
    const inquirySchema = createInquirySchema(fixtureToday);
    const parsed = inquirySchema.safeParse({
      ...baseInquiry,
      productType: "mini-cheesecake-box",
      cakeSizeId: undefined
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts Sheet-driven cake size ids for cake inquiries", () => {
    const inquirySchema = createInquirySchema(fixtureToday);
    const parsed = inquirySchema.safeParse({
      ...baseInquiry,
      cakeSizeId: "sheet-tall-six-inch"
    });

    expect(parsed.success).toBe(true);
  });

  it("trims copied cake size ids before catalog validation uses them", () => {
    const inquirySchema = createInquirySchema(fixtureToday);
    const parsed = inquirySchema.safeParse({
      ...baseInquiry,
      cakeSizeId: " eight-inch "
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data?.cakeSizeId).toBe("eight-inch");
  });

  it("rejects missing acknowledgement and honeypot submissions", () => {
    const inquirySchema = createInquirySchema(fixtureToday);
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
    const schema = createInquirySchema(fixtureToday);

    const parsed = schema.safeParse({
      ...baseInquiry,
      eventDate: "2026-05-12"
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects inquiries without a selected flavour", () => {
    const schema = createInquirySchema(fixtureToday);

    const parsed = schema.safeParse({
      ...baseInquiry,
      flavourId: ""
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects impossible pickup dates", () => {
    const schema = createInquirySchema(fixtureToday);

    const parsed = schema.safeParse({
      ...baseInquiry,
      eventDate: "9999-99-99"
    });

    expect(parsed.success).toBe(false);
  });
});
