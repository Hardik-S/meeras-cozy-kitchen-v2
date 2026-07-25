import { afterEach, describe, expect, it, vi } from "vitest";
import { buildInquirySummary, sendInquiryEmail } from "./mail";

const sendMock = vi.hoisted(() => vi.fn());

vi.mock("resend", () => ({
  Resend: vi.fn(function Resend() {
    return {
      emails: {
        send: sendMock
      }
    };
  })
}));

describe("mail helpers", () => {
  afterEach(() => {
    sendMock.mockReset();
    vi.unstubAllEnvs();
  });

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

  it("uses product-neutral notification subjects for non-cake inquiries", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("ORDER_NOTIFY_EMAIL", "orders@example.com");
    sendMock.mockResolvedValue({ data: { id: "email_123" } });

    await expect(sendInquiryEmail({
      name: "Amina",
      email: "amina@example.com",
      phone: "4165550101",
      eventDate: "2026-05-20",
      servings: 24,
      productType: "cupcakes",
      flavourId: "vanilla-rose",
      addOnIds: [],
      budget: "80-100",
      message: "Cupcakes with soft floral piping.",
      acknowledgements: {
        notice: true,
        allergens: true,
        address: true,
        certification: true
      },
      website: ""
    })).resolves.toEqual({ status: "sent", id: "email_123" });

    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      subject: "New bakery inquiry from Amina"
    }));
    expect(sendMock).not.toHaveBeenCalledWith(expect.objectContaining({
      subject: expect.stringContaining("cake")
    }));
  });

  it("trims copied notification env vars before sending inquiry mail", async () => {
    vi.stubEnv("RESEND_API_KEY", " test-key ");
    vi.stubEnv("ORDER_NOTIFY_EMAIL", " orders@example.com ");
    sendMock.mockResolvedValue({ data: { id: "email_456" } });

    await expect(sendInquiryEmail({
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
    })).resolves.toEqual({ status: "sent", id: "email_456" });

    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      to: "orders@example.com"
    }));
  });

  it("normalizes copied customer fields before sending inquiry mail", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("ORDER_NOTIFY_EMAIL", "orders@example.com");
    sendMock.mockResolvedValue({ data: { id: "email_789" } });

    await expect(sendInquiryEmail({
      name: " Amina\nPatel ",
      email: " amina@example.com ",
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
    })).resolves.toEqual({ status: "sent", id: "email_789" });

    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      replyTo: "amina@example.com",
      subject: "New bakery inquiry from Amina Patel"
    }));
  });

  it("returns a controlled error when the provider rejects inquiry mail", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("ORDER_NOTIFY_EMAIL", "orders@example.com");
    sendMock.mockRejectedValue(new Error("provider unavailable"));

    await expect(sendInquiryEmail({
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
    })).resolves.toEqual({
      status: "error",
      message: "provider unavailable"
    });
  });
});
