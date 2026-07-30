import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultAdminData } from "@/lib/catalog";
import { POST } from "./route";

const validPayload = {
  name: "Amina",
  email: "amina@example.com",
  phone: "4165550101",
  eventDate: "2099-05-20",
  pickupTime: "12:00-14:00",
  cakeSizeId: "eight-inch",
  flavourId: "vanilla",
  frostingId: "chocolate-frosting",
  fillingIds: [],
  toppingIds: [],
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

describe("POST /api/inquiry response metadata", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it.each([
    { orderId: "ord_route_123", expectedId: "ord_route_123" },
    { orderId: 123, expectedId: "pending_4070970000000" }
  ])("returns a safe confirmation id for $orderId", async ({ orderId, expectedId }) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2099-01-01T12:00:00-05:00"));
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "shared-secret");
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string);
      return new Response(JSON.stringify(body.action === "listAdminData"
        ? { ok: true, data: defaultAdminData }
        : { ok: true, orderId }), { status: 200 });
    }));

    const response = await POST(new Request("http://localhost/api/inquiry", {
      method: "POST",
      body: JSON.stringify(validPayload)
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.order).toMatchObject({
      id: expectedId,
      name: "Amina",
      email: "amina@example.com",
      pickupTime: "12:00-14:00",
      productType: "cake",
      cakeSizeId: "eight-inch",
      flavourId: "vanilla",
      frostingId: "chocolate-frosting",
      paymentEmail: "meerascozykitchen@gmail.com"
    });
  });
});
