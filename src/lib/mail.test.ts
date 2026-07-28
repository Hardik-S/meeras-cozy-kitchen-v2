import { afterEach, describe, expect, it, vi } from "vitest";
import type { InquiryInput } from "./validation";
import { buildInquirySummary, sendInquiryEmail } from "./mail";

const sendMock = vi.hoisted(() => vi.fn());

vi.mock("resend", () => ({
  Resend: vi.fn(function Resend() {
    return { emails: { send: sendMock } };
  })
}));

const inquiry: InquiryInput = {
  name: "Amina",
  email: "amina@example.com",
  phone: "4165550101",
  eventDate: "2099-05-20",
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
    certification: true,
    inspiration: true
  },
  website: ""
};

describe("mail helpers", () => {
  afterEach(() => {
    sendMock.mockReset();
    vi.unstubAllEnvs();
  });

  it("builds the cake-only copyable summary", () => {
    const summary = buildInquirySummary(inquiry);

    expect(summary).toContain("Name: Amina");
    expect(summary).toContain("Pickup time: 12pm-2pm");
    expect(summary).toContain("Cake size: 8-inch cake");
    expect(summary).toContain("Starting at $");
  });

  it("skips provider send when email env vars are missing", async () => {
    await expect(sendInquiryEmail(inquiry)).resolves.toEqual({
      status: "skipped",
      reason: "missing-env"
    });
  });

  it("sends a cake inquiry notification", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("ORDER_NOTIFY_EMAIL", "orders@example.com");
    sendMock.mockResolvedValue({ data: { id: "email_123" } });

    await expect(sendInquiryEmail(inquiry)).resolves.toEqual({ status: "sent", id: "email_123" });
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      subject: "New bakery inquiry from Amina",
      text: expect.stringContaining("Cake size: 8-inch cake")
    }));
  });

  it("trims copied notification env vars before sending inquiry mail", async () => {
    vi.stubEnv("RESEND_API_KEY", " test-key ");
    vi.stubEnv("ORDER_NOTIFY_EMAIL", " orders@example.com ");
    sendMock.mockResolvedValue({ data: { id: "email_456" } });

    await sendInquiryEmail(inquiry);

    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ to: "orders@example.com" }));
  });

  it("normalizes copied customer fields used in mail headers", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("ORDER_NOTIFY_EMAIL", "orders@example.com");
    sendMock.mockResolvedValue({ data: { id: "email_789" } });

    await sendInquiryEmail({
      ...inquiry,
      name: " Amina\nPatel ",
      email: " amina@example.com "
    });

    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      replyTo: "amina@example.com",
      subject: "New bakery inquiry from Amina Patel"
    }));
  });

  it("returns a controlled error when the provider rejects mail", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("ORDER_NOTIFY_EMAIL", "orders@example.com");
    sendMock.mockRejectedValue(new Error("provider unavailable"));

    await expect(sendInquiryEmail(inquiry)).resolves.toEqual({
      status: "error",
      message: "provider unavailable"
    });
  });
});
