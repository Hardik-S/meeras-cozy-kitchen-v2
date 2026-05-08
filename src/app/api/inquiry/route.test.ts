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
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string);

      if (body.action === "listAdminData") {
        return new Response(JSON.stringify({ ok: true, data: defaultAdminData }), { status: 200 });
      }

      return new Response(JSON.stringify({ ok: true, orderId: "ord_route_123" }), { status: 200 });
    });
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
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("sends Sheet-driven product summaries with live catalog prices", async () => {
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "shared-secret");
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string);

      if (body.action === "listAdminData") {
        return new Response(JSON.stringify({
          ok: true,
          data: {
            ...defaultAdminData,
            products: [
              ...defaultAdminData.products,
              {
                id: "mini-cheesecake-box",
                label: "Mini cheesecake box",
                low: 42,
                high: 52,
                enabled: true,
                sortOrder: 4
              }
            ]
          }
        }), { status: 200 });
      }

      return new Response(JSON.stringify({ ok: true, orderId: "ord_route_123" }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/inquiry", {
        method: "POST",
        body: JSON.stringify({
          ...validPayload,
          productType: "mini-cheesecake-box",
          cakeSizeId: undefined,
          addOnIds: []
        })
      })
    );
    const body = await response.json();
    const submitBody = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);

    expect(response.status).toBe(200);
    expect(body.summary).toContain("Product: Mini cheesecake box");
    expect(body.summary).toContain("Estimated range: $42-$52");
    expect(submitBody.summary).toContain("Product: Mini cheesecake box");
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
