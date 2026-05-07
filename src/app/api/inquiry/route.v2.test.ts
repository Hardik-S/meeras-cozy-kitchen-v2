import { afterEach, describe, expect, it, vi } from "vitest";
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
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns order summary metadata for the payment instructions page", async () => {
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "shared-secret");
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, orderId: "ord_route_123" }), { status: 200 })
    ));

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
});
