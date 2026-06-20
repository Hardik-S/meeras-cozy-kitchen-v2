import { afterEach, describe, expect, it, vi } from "vitest";
import { listAdminDataFromAppsScript, mutateAdminDataInAppsScript, submitInquiryToAppsScript } from "./apps-script";
import { defaultAdminData, getPublicCatalogFromAdminData } from "./catalog";
import type { InquiryInput } from "./validation";

const inquiry: InquiryInput = {
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

describe("Apps Script integration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("skips submission when Apps Script env vars are missing", async () => {
    vi.unstubAllEnvs();

    await expect(submitInquiryToAppsScript(inquiry)).resolves.toEqual({
      status: "skipped",
      reason: "missing-env"
    });
  });

  it("skips submission when Apps Script env vars are blank copied values", async () => {
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "   ");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "   ");

    await expect(submitInquiryToAppsScript(inquiry)).resolves.toEqual({
      status: "skipped",
      reason: "missing-env"
    });
  });

  it("forwards a validated inquiry with the shared secret", async () => {
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", " https://script.google.com/macros/s/test/exec ");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", " shared-secret ");
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, orderId: "ord_123" }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitInquiryToAppsScript(inquiry);

    expect(result).toEqual({ status: "sent", orderId: "ord_123" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://script.google.com/macros/s/test/exec",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" }
      })
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toMatchObject({
      action: "submitOrder",
      secret: "shared-secret",
      inquiry: { name: "Amina", email: "amina@example.com" }
    });
  });

  it("reports malformed live admin data instead of treating it as catalog data", async () => {
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "shared-secret");
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, data: { products: null, offerings: [] } }), { status: 200 })
    ));

    await expect(listAdminDataFromAppsScript()).resolves.toEqual({
      status: "error",
      message: "Apps Script returned malformed admin data."
    });
  });

  it("rejects malformed live catalog rows before public catalog mapping", async () => {
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "shared-secret");
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({
        ok: true,
        data: {
          settings: {
            defaultSender: "batb4016@gmail.com",
            defaultReceiver: "batb4016@gmail.com",
            senderName: "Meera's Cozy Kitchen",
            chefNotificationCopy: "New inquiry"
          },
          products: [{ id: "cake", label: null, low: 58, high: 150, enabled: true, sortOrder: 1 }],
          offerings: [],
          orders: [],
          ledger: []
        }
      }), { status: 200 })
    ));

    await expect(listAdminDataFromAppsScript()).resolves.toEqual({
      status: "error",
      message: "Apps Script returned malformed admin data."
    });
  });

  it("rejects blank live catalog labels before public catalog mapping", async () => {
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "shared-secret");
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({
        ok: true,
        data: {
          settings: {
            defaultSender: "batb4016@gmail.com",
            defaultReceiver: "batb4016@gmail.com",
            senderName: "Meera's Cozy Kitchen",
            chefNotificationCopy: "New inquiry"
          },
          products: [{ id: "cake", label: "   ", low: 58, high: 150, enabled: true, sortOrder: 1 }],
          offerings: [{
            id: "six-inch",
            productId: "cake",
            category: "cake-size",
            label: "6 inch round cake",
            low: 58,
            high: 68,
            servings: "",
            enabled: true,
            sortOrder: 1
          }],
          orders: [],
          ledger: []
        }
      }), { status: 200 })
    ));

    await expect(listAdminDataFromAppsScript()).resolves.toEqual({
      status: "error",
      message: "Apps Script returned malformed admin data."
    });
  });

  it("defaults legacy ledger rows without quantity after Apps Script validation", async () => {
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "shared-secret");
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({
        ok: true,
        data: {
          ...defaultAdminData,
          ledger: [{
            id: "legacy_box_row",
            date: "2026-05-03",
            type: "expense",
            category: "Packaging",
            description: "Legacy cake box row",
            amount: 12,
            orderId: ""
          }]
        }
      }), { status: 200 })
    ));

    await expect(listAdminDataFromAppsScript()).resolves.toMatchObject({
      status: "live",
      data: {
        ledger: [
          expect.objectContaining({
            id: "legacy_box_row",
            quantity: 1
          })
        ]
      }
    });
  });

  it("normalizes copied offering categories before public catalog mapping", async () => {
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "shared-secret");
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({
        ok: true,
        data: {
          ...defaultAdminData,
          offerings: [
            ...defaultAdminData.offerings,
            {
              id: " cookie-topper ",
              productId: " cake ",
              category: " add-on ",
              label: " Cookie topper ",
              low: 8,
              high: 10,
              servings: "",
              enabled: true,
              sortOrder: 99
            }
          ]
        }
      }), { status: 200 })
    ));

    const result = await listAdminDataFromAppsScript();

    expect(result.status).toBe("live");
    if (result.status !== "live") return;

    const catalog = getPublicCatalogFromAdminData(result.data);
    expect(catalog.addOns.find((addOn) => addOn.id === "cookie-topper")).toMatchObject({
      productId: "cake",
      category: "add-on",
      label: "Cookie topper"
    });
  });

  it("defaults blank live email settings after Apps Script validation", async () => {
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "shared-secret");
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({
        ok: true,
        data: {
          ...defaultAdminData,
          settings: {
            defaultSender: "   ",
            defaultReceiver: "   ",
            senderName: "   ",
            chefNotificationCopy: "   "
          }
        }
      }), { status: 200 })
    ));

    await expect(listAdminDataFromAppsScript()).resolves.toMatchObject({
      status: "live",
      data: {
        settings: defaultAdminData.settings
      }
    });
  });

  it("reports non-object Apps Script responses as request failures", async () => {
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "shared-secret");
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response("null", { status: 200, headers: { "Content-Type": "application/json" } })
    ));

    await expect(listAdminDataFromAppsScript()).resolves.toEqual({
      status: "error",
      message: "Apps Script request failed."
    });
  });

  it("rejects malformed admin data returned after a mutation", async () => {
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "shared-secret");
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, data: { orders: null, products: [] } }), { status: 200 })
    ));

    await expect(mutateAdminDataInAppsScript("upsertProduct", { product: { id: "cake" } }))
      .rejects
      .toThrow("Apps Script returned malformed admin data.");
  });
});
