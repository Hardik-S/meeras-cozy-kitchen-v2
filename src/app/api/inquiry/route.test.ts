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

describe("POST /api/inquiry", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("accepts a valid inquiry without email environment variables", async () => {
    const response = await POST(
      new Request("http://localhost/api/inquiry", {
        method: "POST",
        body: JSON.stringify(validPayload)
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.email.status).toBe("skipped");
    expect(body.summary).toContain("Name: Amina");
  });

  it("forwards a valid inquiry to Apps Script when configured", async () => {
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "shared-secret");
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, orderId: "ord_route_123" }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/inquiry", {
        method: "POST",
        body: JSON.stringify(validPayload)
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.appsScript).toEqual({ status: "sent", orderId: "ord_route_123" });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("rejects honeypot submissions", async () => {
    const response = await POST(
      new Request("http://localhost/api/inquiry", {
        method: "POST",
        body: JSON.stringify({ ...validPayload, website: "filled" })
      })
    );

    expect(response.status).toBe(400);
  });
});
