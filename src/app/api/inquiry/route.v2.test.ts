import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultAdminData } from "@/lib/catalog";
import { POST } from "./route";

const validPayload = {
  name: "Amina",
  email: "amina@example.com",
  phone: "4165550101",
  eventDate: "2099-05-20",
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

describe("POST /api/inquiry v2 response", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns order summary metadata for the payment instructions page", async () => {
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "shared-secret");
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string);

      if (body.action === "listAdminData") {
        return new Response(JSON.stringify({ ok: true, data: defaultAdminData }), { status: 200 });
      }

      return new Response(JSON.stringify({ ok: true, orderId: "ord_route_123" }), { status: 200 });
    }));

    const response = await POST(
      new Request("http://localhost/api/inquiry", {
        method: "POST",
        body: JSON.stringify(validPayload)
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.order).toMatchObject({
      id: "ord_route_123",
      name: "Amina",
      email: "amina@example.com",
      paymentEmail: "m.ssethi1123@gmail.com"
    });
    expect(body.order.summary).toContain("Name: Amina");
  });

  it("falls back to a pending payment id when Apps Script returns a malformed order id", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2099-01-01T12:00:00-05:00"));
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "shared-secret");
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string);

      if (body.action === "listAdminData") {
        return new Response(JSON.stringify({ ok: true, data: defaultAdminData }), { status: 200 });
      }

      return new Response(JSON.stringify({ ok: true, orderId: 123 }), { status: 200 });
    }));

    const response = await POST(
      new Request("http://localhost/api/inquiry", {
        method: "POST",
        body: JSON.stringify(validPayload)
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.appsScript).toEqual({ status: "sent" });
    expect(body.order.id).toBe("pending_4070970000000");
  });
});
