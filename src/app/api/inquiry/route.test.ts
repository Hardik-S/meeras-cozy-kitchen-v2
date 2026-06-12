import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultAdminData } from "@/lib/catalog";
import { POST } from "./route";

const resendSendMock = vi.hoisted(() => vi.fn());

vi.mock("resend", () => ({
  Resend: vi.fn(function Resend() {
    return {
      emails: {
        send: resendSendMock
      }
    };
  })
}));

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
    resendSendMock.mockReset();
    vi.useRealTimers();
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

  it("keeps the live catalog summary in fallback email when Apps Script submission fails", async () => {
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "shared-secret");
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("ORDER_NOTIFY_EMAIL", "orders@example.com");
    resendSendMock.mockResolvedValue({ data: { id: "email_123" } });
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

      return new Response(JSON.stringify({ ok: false, error: "Sheet write failed." }), { status: 500 });
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
    const fallbackEmail = resendSendMock.mock.calls[0][0];

    expect(response.status).toBe(200);
    expect(body.appsScript).toEqual({ status: "error", message: "Sheet write failed." });
    expect(body.email).toEqual({ status: "sent", id: "email_123" });
    expect(body.summary).toContain("Product: Mini cheesecake box");
    expect(body.summary).toContain("Estimated range: $42-$52");
    expect(fallbackEmail.text).toContain("Product: Mini cheesecake box");
    expect(fallbackEmail.text).toContain("Estimated range: $42-$52");
  });

  it("rejects stale add-ons that are no longer in the live catalog", async () => {
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "shared-secret");
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string);

      if (body.action === "listAdminData") {
        return new Response(JSON.stringify({
          ok: true,
          data: {
            ...defaultAdminData,
            offerings: defaultAdminData.offerings.filter((offering) => offering.id !== "fresh-berries")
          }
        }), { status: 200 });
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

    expect(response.status).toBe(400);
    expect(body.issues.addOnIds).toContain("Please remove unavailable add-ons and try again.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects product-scoped add-ons for the wrong live catalog product", async () => {
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "shared-secret");
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string);

      if (body.action === "listAdminData") {
        return new Response(JSON.stringify({
          ok: true,
          data: {
            ...defaultAdminData,
            offerings: [
              ...defaultAdminData.offerings,
              {
                id: "cake-topper",
                productId: "cake",
                category: "add-on",
                label: "Cake topper",
                low: 10,
                high: 14,
                servings: "",
                enabled: true,
                sortOrder: 99
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
          productType: "cupcakes",
          cakeSizeId: undefined,
          addOnIds: ["cake-topper"]
        })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.issues.addOnIds).toContain("Please remove unavailable add-ons and try again.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
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

  it("validates pickup notice against the current request date on long-lived servers", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2099-05-20T12:00:00-04:00"));

    const response = await POST(
      new Request("http://localhost/api/inquiry", {
        method: "POST",
        body: JSON.stringify(validPayload)
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.issues.eventDate).toContain("Please choose a pickup date at least 7 days away.");
  });
});
