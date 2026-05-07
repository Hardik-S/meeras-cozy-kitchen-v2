import { describe, expect, it } from "vitest";
import { buildInquirySummary, sendInquiryEmail } from "./mail";

describe("mail helpers", () => {
  it("builds a copyable customer summary", () => {
    const summary = buildInquirySummary({
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
    });

    expect(summary).toContain("Name: Amina");
    expect(summary).toContain("Product: Cake");
    expect(summary).toContain("Estimated range: $");
  });

  it("skips provider send when email env vars are missing", async () => {
    const result = await sendInquiryEmail({
      name: "Amina",
      email: "amina@example.com",
      phone: "4165550101",
      eventDate: "2026-05-20",
      servings: 18,
      productType: "cake",
      cakeSizeId: "eight-inch",
      flavourId: "vanilla-rose",
      addOnIds: [],
      budget: "100-150",
      message: "Birthday cake with soft florals.",
      acknowledgements: {
        notice: true,
        allergens: true,
        address: true,
        certification: true
      },
      website: ""
    });

    expect(result).toEqual({ status: "skipped", reason: "missing-env" });
  });
});
