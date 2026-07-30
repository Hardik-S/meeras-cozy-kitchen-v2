import { afterEach, describe, expect, it, vi } from "vitest";
import { listAdminDataFromAppsScript, mutateAdminDataInAppsScript, submitInquiryToAppsScript } from "./apps-script";
import { defaultAdminData, getPublicCatalogFromAdminData } from "./catalog";
import { calculateMonthlyFinanceReport } from "./finance";
import type { InquiryInput } from "./validation";

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
    inspiration: true,
    payment: true
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
    const body = JSON.parse((fetchMock.mock.calls as unknown as Array<[string, RequestInit]>)[0][1].body as string);
    expect(body).toMatchObject({
      action: "submitOrder",
      secret: "shared-secret",
      inquiry: {
        name: "Amina",
        email: "amina@example.com",
        pickupTime: "12:00-14:00",
        cakeSizeId: "eight-inch",
        frostingId: "oreo-crunch",
        fillingIds: ["raspberry-filling"],
        toppingIds: ["fresh-strawberry"]
      }
    });
  });

  it("collapses copied Apps Script order ids before returning them", async () => {
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "shared-secret");
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, orderId: " ord_copied\nMemo: redirected " }), { status: 200 })
    ));

    await expect(submitInquiryToAppsScript(inquiry)).resolves.toEqual({
      status: "sent",
      orderId: "ord_copied Memo: redirected"
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
            defaultSender: "meerascozykitchen@gmail.com",
            defaultReceiver: "meerascozykitchen@gmail.com",
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

  it("tolerates disabled historical offerings with legacy categories", async () => {
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "shared-secret");
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({
        ok: true,
        data: {
          settings: {
            defaultSender: "meerascozykitchen@gmail.com",
            defaultReceiver: "meerascozykitchen@gmail.com",
            senderName: "Meera's Cozy Kitchen",
            chefNotificationCopy: "New inquiry"
          },
          products: [{
            id: "cake",
            label: "Custom cake",
            low: 35,
            high: 75,
            enabled: true,
            sortOrder: 1
          }],
          offerings: [{
            id: "legacy-addon",
            productId: "cake",
            category: "add-on",
            label: "Legacy add-on",
            low: 5,
            high: 5,
            servings: "",
            enabled: false,
            sortOrder: 1
          }],
          orders: [],
          ledger: []
        }
      }), { status: 200 })
    ));

    const result = await listAdminDataFromAppsScript();

    expect(result.status).toBe("live");
    if (result.status !== "live") return;
    expect(result.data.offerings).toEqual([
      expect.objectContaining({
        id: "legacy-addon",
        category: "topping",
        enabled: false
      })
    ]);
    expect(getPublicCatalogFromAdminData(result.data).offerings).toEqual([]);
  });

  it("rejects blank live catalog labels before public catalog mapping", async () => {
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "shared-secret");
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({
        ok: true,
        data: {
          settings: {
            defaultSender: "meerascozykitchen@gmail.com",
            defaultReceiver: "meerascozykitchen@gmail.com",
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

  it("rejects fractional live catalog sort orders before public catalog mapping", async () => {
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "shared-secret");
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({
        ok: true,
        data: {
          ...defaultAdminData,
          products: [{ ...defaultAdminData.products[0], sortOrder: 1.5 }]
        }
      }), { status: 200 })
    ));

    await expect(listAdminDataFromAppsScript()).resolves.toEqual({
      status: "error",
      message: "Apps Script returned malformed admin data."
    });
  });

  it.each([
    {
      products: [{ ...defaultAdminData.products[0], sortOrder: -1 }],
      offerings: defaultAdminData.offerings
    },
    {
      products: defaultAdminData.products,
      offerings: [{ ...defaultAdminData.offerings[0], sortOrder: -1 }]
    }
  ])("rejects negative live catalog sort orders before admin consumers use them", async ({ products, offerings }) => {
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "shared-secret");
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({
        ok: true,
        data: {
          ...defaultAdminData,
          products,
          offerings
        }
      }), { status: 200 })
    ));

    await expect(listAdminDataFromAppsScript()).resolves.toEqual({
      status: "error",
      message: "Apps Script returned malformed admin data."
    });
  });

  it.each([
    {
      products: [{ ...defaultAdminData.products[0], low: -1 }],
      offerings: defaultAdminData.offerings
    },
    {
      products: defaultAdminData.products,
      offerings: [{ ...defaultAdminData.offerings[0], low: 88, high: 58 }]
    }
  ])("rejects impossible live catalog price ranges before public catalog mapping", async ({ products, offerings }) => {
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "shared-secret");
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({
        ok: true,
        data: {
          ...defaultAdminData,
          products,
          offerings
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

  it("rejects fractional live ledger quantities before finance summaries use them", async () => {
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "shared-secret");
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({
        ok: true,
        data: {
          ...defaultAdminData,
          ledger: [{
            id: "led_fractional_quantity",
            date: "2026-06-10",
            type: "expense",
            category: "Packaging",
            description: "Cake box",
            amount: 12,
            quantity: 1.5,
            orderId: ""
          }]
        }
      }), { status: 200 })
    ));

    await expect(listAdminDataFromAppsScript()).resolves.toEqual({
      status: "error",
      message: "Apps Script returned malformed admin data."
    });
  });

  it("normalizes copied cake-only offering categories before public catalog mapping", async () => {
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
              id: " Cookie-Crumb ",
              productId: " Cake ",
              category: " topping ",
              label: " Cookie crumb ",
              low: 5,
              high: 5,
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
    expect(catalog.toppings.find((topping) => topping.id === "cookie-crumb")).toMatchObject({
      productId: "cake",
      category: "topping",
      label: "Cookie crumb"
    });
  });

  it("normalizes copied live catalog text before admin consumers use it", async () => {
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "shared-secret");
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({
        ok: true,
        data: {
          ...defaultAdminData,
          products: [{
            id: " cake ",
            label: " Custom\nCakes ",
            low: 58,
            high: 150,
            enabled: true,
            sortOrder: 1
          }],
          offerings: [{
            id: " eight-inch ",
            productId: " cake ",
            category: " Cake-Size " as "cake-size",
            label: " 8 inch\nround cake ",
            low: 88,
            high: 110,
            servings: " 16-20\nservings ",
            enabled: true,
            sortOrder: 2
          }]
        }
      }), { status: 200 })
    ));

    await expect(listAdminDataFromAppsScript()).resolves.toMatchObject({
      status: "live",
      data: {
        products: [expect.objectContaining({
          id: "cake",
          label: "Custom Cakes"
        })],
        offerings: [expect.objectContaining({
          id: "eight-inch",
          productId: "cake",
          category: "cake-size",
          label: "8 inch round cake",
          servings: "16-20 servings"
        })]
      }
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

  it("collapses copied live notification routing settings after Apps Script validation", async () => {
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "shared-secret");
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({
        ok: true,
        data: {
          ...defaultAdminData,
          settings: {
            defaultSender: " bakery\nsender@example.com ",
            defaultReceiver: " meera\ninbox@example.com ",
            senderName: " Meera's\nCozy\tKitchen ",
            chefNotificationCopy: " New inquiry\nreceived. "
          }
        }
      }), { status: 200 })
    ));

    await expect(listAdminDataFromAppsScript()).resolves.toMatchObject({
      status: "live",
      data: {
        settings: {
          defaultSender: "bakery sender@example.com",
          defaultReceiver: "meera inbox@example.com",
          senderName: "Meera's Cozy Kitchen",
          chefNotificationCopy: "New inquiry\nreceived."
        }
      }
    });
  });

  it("normalizes copied live order strings before finance summaries use them", async () => {
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "shared-secret");
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({
        ok: true,
        data: {
          ...defaultAdminData,
          orders: [{
            id: " ord_copied_date ",
            createdAt: " 2026-06-20T10:00:00.000Z ",
            name: " Amina ",
            email: " amina@example.com ",
            phone: " 4165550101 ",
            eventDate: " 2026-06-28 ",
            productType: " Cake ",
            cakeSizeId: " Eight-Inch ",
            flavourId: " Vanilla-Rose ",
            budget: " 100-150 ",
            message: " Birthday cake with soft florals. ",
            estimateLow: 95,
            estimateHigh: 125,
            status: " Confirmed ",
            hearted: false,
            pinned: false,
            summary: " Custom cake inquiry "
          }]
        }
      }), { status: 200 })
    ));

    const result = await listAdminDataFromAppsScript();

    expect(result.status).toBe("live");
    if (result.status !== "live") return;

    expect(result.data.orders[0]).toMatchObject({
      id: "ord_copied_date",
      eventDate: "2026-06-28",
      email: "amina@example.com",
      productType: "cake",
      cakeSizeId: "eight-inch",
      flavourId: "vanilla-rose",
      status: "confirmed"
    });
    expect(calculateMonthlyFinanceReport([], result.data.orders, "2026-06").confirmedPotential).toBe(125);
  });

  it("collapses copied live order text before admin consumers use it", async () => {
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "shared-secret");
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({
        ok: true,
        data: {
          ...defaultAdminData,
          orders: [{
            id: " ord_copied\nMemo: hidden ",
            createdAt: "2026-06-20T10:00:00.000Z",
            name: " Amina\nKhan ",
            email: " amina@example.com ",
            phone: " 416\n555\n0101 ",
            eventDate: "2026-06-28",
            productType: "cake",
            cakeSizeId: "eight-inch",
            flavourId: "vanilla-rose",
            budget: " 100-150\nflexible ",
            message: " Birthday cake\nwith soft florals. ",
            estimateLow: 95,
            estimateHigh: 125,
            status: "confirmed",
            hearted: false,
            pinned: false,
            summary: " Custom cake\ninquiry "
          }]
        }
      }), { status: 200 })
    ));

    await expect(listAdminDataFromAppsScript()).resolves.toMatchObject({
      status: "live",
      data: {
        orders: [expect.objectContaining({
          id: "ord_copied Memo: hidden",
          name: "Amina Khan",
          phone: "416 555 0101",
          budget: "100-150 flexible",
          message: "Birthday cake with soft florals.",
          summary: "Custom cake inquiry"
        })]
      }
    });
  });

  it("normalizes copied live order estimate ranges before finance summaries use them", async () => {
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "shared-secret");
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({
        ok: true,
        data: {
          ...defaultAdminData,
          orders: [{
            id: "ord_copied_estimate",
            createdAt: "2026-06-20T10:00:00.000Z",
            name: "Amina",
            email: "amina@example.com",
            phone: "4165550101",
            eventDate: "2026-06-28",
            productType: "cake",
            cakeSizeId: "eight-inch",
            flavourId: "vanilla-rose",
            budget: "100-150",
            message: "Birthday cake with soft florals.",
            estimateLow: 160,
            estimateHigh: -20,
            status: "confirmed",
            hearted: false,
            pinned: false,
            summary: "Custom cake inquiry"
          }]
        }
      }), { status: 200 })
    ));

    const result = await listAdminDataFromAppsScript();

    expect(result.status).toBe("live");
    if (result.status !== "live") return;

    expect(result.data.orders[0]).toMatchObject({
      estimateLow: 0,
      estimateHigh: 160
    });
    expect(calculateMonthlyFinanceReport([], result.data.orders, "2026-06").confirmedPotential).toBe(160);
  });

  it("normalizes copied live ledger strings before finance summaries use them", async () => {
    vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "shared-secret");
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({
        ok: true,
        data: {
          ...defaultAdminData,
          ledger: [{
            id: " led_copied ",
            date: " 2026-06-10 ",
            type: " Income ",
            category: " Order ",
            description: " Cake balance ",
            amount: 80,
            quantity: 2,
            orderId: " ord_copied "
          }]
        }
      }), { status: 200 })
    ));

    const result = await listAdminDataFromAppsScript();

    expect(result.status).toBe("live");
    if (result.status !== "live") return;

    expect(result.data.ledger[0]).toMatchObject({
      id: "led_copied",
      date: "2026-06-10",
      type: "income",
      category: "Order",
      description: "Cake balance",
      orderId: "ord_copied"
    });
    expect(calculateMonthlyFinanceReport(result.data.ledger, [], "2026-06").income).toBe(160);
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
