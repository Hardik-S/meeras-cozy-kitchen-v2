import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminSessionToken } from "@/lib/admin-auth";
import { mutateAdminDataInAppsScript } from "@/lib/apps-script";
import { GET, POST } from "./route";

vi.mock("@/lib/apps-script", () => ({
  listAdminDataFromAppsScript: vi.fn(),
  mutateAdminDataInAppsScript: vi.fn()
}));

describe("GET /api/admin/data", () => {
  it("rejects requests without an admin session", async () => {
    const response = await GET(new Request("http://localhost/api/admin/data"));

    expect(response.status).toBe(401);
  });

  it("rejects malformed admin session cookies without throwing", async () => {
    const response = await GET(new Request("http://localhost/api/admin/data", {
      headers: {
        cookie: "meera_admin_session=%E0%A4%A"
      }
    }));

    expect(response.status).toBe(401);
  });
});

describe("POST /api/admin/data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a null mutation body without throwing", async () => {
    const response = await POST(new Request("http://localhost/api/admin/data", {
      method: "POST",
      headers: {
        cookie: `meera_admin_session=${encodeURIComponent(createAdminSessionToken())}`
      },
      body: "null"
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Unsupported admin action." });
  });

  it("rejects non-string settings before reaching Apps Script", async () => {
    const response = await POST(new Request("http://localhost/api/admin/data", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `meera_admin_session=${encodeURIComponent(createAdminSessionToken())}`
      },
      body: JSON.stringify({
        action: "updateSettings",
        payload: {
          settings: {
            defaultReceiver: { email: "chef@example.com" }
          }
        }
      })
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Unsupported settings value." });
    expect(mutateAdminDataInAppsScript).not.toHaveBeenCalled();
  });

  it("rejects unknown settings keys before reaching Apps Script", async () => {
    const response = await POST(new Request("http://localhost/api/admin/data", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `meera_admin_session=${encodeURIComponent(createAdminSessionToken())}`
      },
      body: JSON.stringify({
        action: "updateSettings",
        payload: {
          settings: {
            defaultReciever: "chef@example.com"
          }
        }
      })
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Unsupported settings key." });
    expect(mutateAdminDataInAppsScript).not.toHaveBeenCalled();
  });

  it("rejects malformed settings payloads before reaching Apps Script", async () => {
    const response = await POST(new Request("http://localhost/api/admin/data", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `meera_admin_session=${encodeURIComponent(createAdminSessionToken())}`
      },
      body: JSON.stringify({
        action: "updateSettings",
        payload: {
          settings: ["defaultReceiver"]
        }
      })
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Unsupported settings payload." });
    expect(mutateAdminDataInAppsScript).not.toHaveBeenCalled();
  });

  it("trims copied settings values before reaching Apps Script", async () => {
    vi.mocked(mutateAdminDataInAppsScript).mockResolvedValue({ ok: true });

    const response = await POST(new Request("http://localhost/api/admin/data", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `meera_admin_session=${encodeURIComponent(createAdminSessionToken())}`
      },
      body: JSON.stringify({
        action: "updateSettings",
        payload: {
          settings: {
            defaultSender: " Meera's Cozy Kitchen <orders@example.com> ",
            defaultReceiver: " chef@example.com ",
            senderName: " Meera ",
            chefNotificationCopy: " prep@example.com "
          }
        }
      })
    }));

    expect(response.status).toBe(200);
    expect(mutateAdminDataInAppsScript).toHaveBeenCalledWith("updateSettings", {
      settings: {
        defaultSender: "Meera's Cozy Kitchen <orders@example.com>",
        defaultReceiver: "chef@example.com",
        senderName: "Meera",
        chefNotificationCopy: "prep@example.com"
      }
    });
  });

  it("rejects invalid order statuses before reaching Apps Script", async () => {
    const response = await POST(new Request("http://localhost/api/admin/data", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `meera_admin_session=${encodeURIComponent(createAdminSessionToken())}`
      },
      body: JSON.stringify({
        action: "updateOrderStatus",
        payload: { id: "ord_123", status: "refunded" }
      })
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Unsupported order status." });
    expect(mutateAdminDataInAppsScript).not.toHaveBeenCalled();
  });

  it("rejects missing order statuses before reaching Apps Script", async () => {
    const response = await POST(new Request("http://localhost/api/admin/data", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `meera_admin_session=${encodeURIComponent(createAdminSessionToken())}`
      },
      body: JSON.stringify({
        action: "updateOrderStatus",
        payload: { id: "ord_123" }
      })
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Unsupported order status." });
    expect(mutateAdminDataInAppsScript).not.toHaveBeenCalled();
  });

  it("normalizes copied order status casing before reaching Apps Script", async () => {
    vi.mocked(mutateAdminDataInAppsScript).mockResolvedValue({ ok: true });

    const response = await POST(new Request("http://localhost/api/admin/data", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `meera_admin_session=${encodeURIComponent(createAdminSessionToken())}`
      },
      body: JSON.stringify({
        action: "updateOrderStatus",
        payload: { id: "ord_123", status: " Confirmed " }
      })
    }));

    expect(response.status).toBe(200);
    expect(mutateAdminDataInAppsScript).toHaveBeenCalledWith("updateOrderStatus", {
      id: "ord_123",
      status: "confirmed"
    });
  });

  it("rejects invalid ledger entry types before reaching Apps Script", async () => {
    const response = await POST(new Request("http://localhost/api/admin/data", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `meera_admin_session=${encodeURIComponent(createAdminSessionToken())}`
      },
      body: JSON.stringify({
        action: "upsertLedgerEntry",
        payload: {
          entry: {
            id: "led_123",
            type: "refund",
            amount: 12
          }
        }
      })
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Unsupported ledger entry type." });
    expect(mutateAdminDataInAppsScript).not.toHaveBeenCalled();
  });

  it("normalizes copied ledger entry type casing before reaching Apps Script", async () => {
    vi.mocked(mutateAdminDataInAppsScript).mockResolvedValue({ ok: true });

    const response = await POST(new Request("http://localhost/api/admin/data", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `meera_admin_session=${encodeURIComponent(createAdminSessionToken())}`
      },
      body: JSON.stringify({
        action: "upsertLedgerEntry",
        payload: {
          entry: {
            id: "led_123",
            type: " Income ",
            amount: 12
          }
        }
      })
    }));

    expect(response.status).toBe(200);
    expect(mutateAdminDataInAppsScript).toHaveBeenCalledWith("upsertLedgerEntry", {
      entry: {
        id: "led_123",
        type: "income",
        amount: 12
      }
    });
  });

  it.each(["12", -12])("rejects invalid ledger amount %s before reaching Apps Script", async (amount) => {
    const response = await POST(new Request("http://localhost/api/admin/data", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `meera_admin_session=${encodeURIComponent(createAdminSessionToken())}`
      },
      body: JSON.stringify({
        action: "upsertLedgerEntry",
        payload: {
          entry: {
            id: "led_123",
            type: "expense",
            amount,
            quantity: 1
          }
        }
      })
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Unsupported ledger amount." });
    expect(mutateAdminDataInAppsScript).not.toHaveBeenCalled();
  });

  it.each(["2", 1.5])("rejects invalid ledger quantity %s before reaching Apps Script", async (quantity) => {
    const response = await POST(new Request("http://localhost/api/admin/data", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `meera_admin_session=${encodeURIComponent(createAdminSessionToken())}`
      },
      body: JSON.stringify({
        action: "upsertLedgerEntry",
        payload: {
          entry: {
            id: "led_123",
            type: "expense",
            amount: 12,
            quantity
          }
        }
      })
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Unsupported ledger quantity." });
    expect(mutateAdminDataInAppsScript).not.toHaveBeenCalled();
  });

  it("rejects malformed ledger entry payloads before reaching Apps Script", async () => {
    const response = await POST(new Request("http://localhost/api/admin/data", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `meera_admin_session=${encodeURIComponent(createAdminSessionToken())}`
      },
      body: JSON.stringify({
        action: "upsertLedgerEntry",
        payload: {
          entry: ["income", 12]
        }
      })
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Unsupported ledger entry payload." });
    expect(mutateAdminDataInAppsScript).not.toHaveBeenCalled();
  });

  it.each(["date", "category", "description", "orderId"])(
    "rejects non-string ledger %s values before reaching Apps Script",
    async (field) => {
      const response = await POST(new Request("http://localhost/api/admin/data", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `meera_admin_session=${encodeURIComponent(createAdminSessionToken())}`
        },
        body: JSON.stringify({
          action: "upsertLedgerEntry",
          payload: {
            entry: {
              id: "led_123",
              type: "expense",
              amount: 12,
              quantity: 1,
              [field]: { copied: true }
            }
          }
        })
      }));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ ok: false, error: "Unsupported ledger text value." });
      expect(mutateAdminDataInAppsScript).not.toHaveBeenCalled();
    }
  );

  it("rejects non-boolean order flags before reaching Apps Script", async () => {
    const response = await POST(new Request("http://localhost/api/admin/data", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `meera_admin_session=${encodeURIComponent(createAdminSessionToken())}`
      },
      body: JSON.stringify({
        action: "updateOrderFlags",
        payload: {
          id: "ord_123",
          hearted: "false",
          pinned: false
        }
      })
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Unsupported order flag value." });
    expect(mutateAdminDataInAppsScript).not.toHaveBeenCalled();
  });

  it.each(["toggleProduct", "toggleOffering"])("rejects non-boolean %s values before reaching Apps Script", async (action) => {
    const response = await POST(new Request("http://localhost/api/admin/data", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `meera_admin_session=${encodeURIComponent(createAdminSessionToken())}`
      },
      body: JSON.stringify({
        action,
        payload: {
          id: "cake",
          enabled: "false"
        }
      })
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Unsupported catalog toggle value." });
    expect(mutateAdminDataInAppsScript).not.toHaveBeenCalled();
  });

  it.each([
    ["upsertProduct", "product"],
    ["upsertOffering", "offering"]
  ])("rejects malformed %s payloads before reaching Apps Script", async (action, payloadKey) => {
    const response = await POST(new Request("http://localhost/api/admin/data", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `meera_admin_session=${encodeURIComponent(createAdminSessionToken())}`
      },
      body: JSON.stringify({
        action,
        payload: {
          [payloadKey]: ["cake"]
        }
      })
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Unsupported catalog payload." });
    expect(mutateAdminDataInAppsScript).not.toHaveBeenCalled();
  });

  it.each([
    ["upsertProduct", "product"],
    ["upsertOffering", "offering"]
  ])("rejects non-boolean %s enabled values before reaching Apps Script", async (action, payloadKey) => {
    const response = await POST(new Request("http://localhost/api/admin/data", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `meera_admin_session=${encodeURIComponent(createAdminSessionToken())}`
      },
      body: JSON.stringify({
        action,
        payload: {
          [payloadKey]: {
            id: "cake",
            label: "Cake",
            enabled: "false"
          }
        }
      })
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Unsupported catalog enabled value." });
    expect(mutateAdminDataInAppsScript).not.toHaveBeenCalled();
  });

  it.each([
    ["upsertProduct", "product"],
    ["upsertOffering", "offering"]
  ])("rejects non-number %s prices before reaching Apps Script", async (action, payloadKey) => {
    const response = await POST(new Request("http://localhost/api/admin/data", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `meera_admin_session=${encodeURIComponent(createAdminSessionToken())}`
      },
      body: JSON.stringify({
        action,
        payload: {
          [payloadKey]: {
            id: "cake",
            label: "Cake",
            low: "58",
            high: 68
          }
        }
      })
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Unsupported catalog price value." });
    expect(mutateAdminDataInAppsScript).not.toHaveBeenCalled();
  });

  it.each([
    ["upsertProduct", "product"],
    ["upsertOffering", "offering"]
  ])("rejects negative %s prices before reaching Apps Script", async (action, payloadKey) => {
    const response = await POST(new Request("http://localhost/api/admin/data", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `meera_admin_session=${encodeURIComponent(createAdminSessionToken())}`
      },
      body: JSON.stringify({
        action,
        payload: {
          [payloadKey]: {
            id: "cake",
            label: "Cake",
            low: -1,
            high: 68
          }
        }
      })
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Unsupported catalog price value." });
    expect(mutateAdminDataInAppsScript).not.toHaveBeenCalled();
  });

  it.each([
    ["upsertProduct", "product"],
    ["upsertOffering", "offering"]
  ])("rejects inverted %s price ranges before reaching Apps Script", async (action, payloadKey) => {
    const response = await POST(new Request("http://localhost/api/admin/data", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `meera_admin_session=${encodeURIComponent(createAdminSessionToken())}`
      },
      body: JSON.stringify({
        action,
        payload: {
          [payloadKey]: {
            id: "cake",
            label: "Cake",
            low: 88,
            high: 58
          }
        }
      })
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Unsupported catalog price range." });
    expect(mutateAdminDataInAppsScript).not.toHaveBeenCalled();
  });

  it.each([
    ["upsertProduct", "product", "1"],
    ["upsertOffering", "offering", "1"],
    ["upsertProduct", "product", 1.5],
    ["upsertOffering", "offering", 1.5],
    ["upsertProduct", "product", -1],
    ["upsertOffering", "offering", -1]
  ])("rejects invalid %s sort orders before reaching Apps Script", async (action, payloadKey, sortOrder) => {
    const response = await POST(new Request("http://localhost/api/admin/data", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `meera_admin_session=${encodeURIComponent(createAdminSessionToken())}`
      },
      body: JSON.stringify({
        action,
        payload: {
          [payloadKey]: {
            id: "cake",
            label: "Cake",
            low: 58,
            high: 68,
            sortOrder
          }
        }
      })
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Unsupported catalog sort order value." });
    expect(mutateAdminDataInAppsScript).not.toHaveBeenCalled();
  });

  it.each([
    ["upsertProduct", "product", "label"],
    ["upsertOffering", "offering", "category"]
  ])("rejects non-string %s text values before reaching Apps Script", async (action, payloadKey, field) => {
    const response = await POST(new Request("http://localhost/api/admin/data", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `meera_admin_session=${encodeURIComponent(createAdminSessionToken())}`
      },
      body: JSON.stringify({
        action,
        payload: {
          [payloadKey]: {
            id: "cake",
            label: "Cake",
            low: 58,
            high: 68,
            [field]: { copied: true }
          }
        }
      })
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Unsupported catalog text value." });
    expect(mutateAdminDataInAppsScript).not.toHaveBeenCalled();
  });

  it.each([
    ["upsertProduct", "product"],
    ["upsertOffering", "offering"]
  ])("rejects blank %s labels before reaching Apps Script", async (action, payloadKey) => {
    const response = await POST(new Request("http://localhost/api/admin/data", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `meera_admin_session=${encodeURIComponent(createAdminSessionToken())}`
      },
      body: JSON.stringify({
        action,
        payload: {
          [payloadKey]: {
            id: "custom-topper",
            label: "   ",
            low: 12,
            high: 18
          }
        }
      })
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Unsupported catalog text value." });
    expect(mutateAdminDataInAppsScript).not.toHaveBeenCalled();
  });

  it("rejects unsupported offering categories before reaching Apps Script", async () => {
    const response = await POST(new Request("http://localhost/api/admin/data", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `meera_admin_session=${encodeURIComponent(createAdminSessionToken())}`
      },
      body: JSON.stringify({
        action: "upsertOffering",
        payload: {
          offering: {
            id: "custom-topper",
            productId: "cake",
            category: "topping",
            label: "Custom topper",
            low: 12,
            high: 18
          }
        }
      })
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Unsupported catalog category." });
    expect(mutateAdminDataInAppsScript).not.toHaveBeenCalled();
  });

  it("normalizes copied offering category casing before reaching Apps Script", async () => {
    vi.mocked(mutateAdminDataInAppsScript).mockResolvedValue({ ok: true });

    const response = await POST(new Request("http://localhost/api/admin/data", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `meera_admin_session=${encodeURIComponent(createAdminSessionToken())}`
      },
      body: JSON.stringify({
        action: "upsertOffering",
        payload: {
          offering: {
            id: "custom-topper",
            productId: "cake",
            category: " Add-On ",
            label: "Custom topper",
            servings: "",
            low: 12,
            high: 18
          }
        }
      })
    }));

    expect(response.status).toBe(200);
    expect(mutateAdminDataInAppsScript).toHaveBeenCalledWith("upsertOffering", {
      offering: {
        id: "custom-topper",
        productId: "cake",
        category: "add-on",
        label: "Custom topper",
        servings: "",
        low: 12,
        high: 18
      }
    });
  });

  it("normalizes copied catalog ids before reaching Apps Script", async () => {
    vi.mocked(mutateAdminDataInAppsScript).mockResolvedValue({ ok: true });

    const productResponse = await POST(new Request("http://localhost/api/admin/data", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `meera_admin_session=${encodeURIComponent(createAdminSessionToken())}`
      },
      body: JSON.stringify({
        action: "upsertProduct",
        payload: {
          product: {
            id: " Cake ",
            label: "Cake",
            low: 58,
            high: 68
          }
        }
      })
    }));

    expect(productResponse.status).toBe(200);
    expect(mutateAdminDataInAppsScript).toHaveBeenLastCalledWith("upsertProduct", {
      product: {
        id: "cake",
        label: "Cake",
        low: 58,
        high: 68
      }
    });

    const offeringResponse = await POST(new Request("http://localhost/api/admin/data", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `meera_admin_session=${encodeURIComponent(createAdminSessionToken())}`
      },
      body: JSON.stringify({
        action: "upsertOffering",
        payload: {
          offering: {
            id: " Fresh-Berries ",
            productId: " Cake ",
            category: " Add-On ",
            label: "Fresh berries",
            servings: "",
            low: 10,
            high: 14
          }
        }
      })
    }));

    expect(offeringResponse.status).toBe(200);
    expect(mutateAdminDataInAppsScript).toHaveBeenLastCalledWith("upsertOffering", {
      offering: {
        id: "fresh-berries",
        productId: "cake",
        category: "add-on",
        label: "Fresh berries",
        servings: "",
        low: 10,
        high: 14
      }
    });
  });

  it("collapses copied catalog display text before reaching Apps Script", async () => {
    vi.mocked(mutateAdminDataInAppsScript).mockResolvedValue({ ok: true });

    const response = await POST(new Request("http://localhost/api/admin/data", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `meera_admin_session=${encodeURIComponent(createAdminSessionToken())}`
      },
      body: JSON.stringify({
        action: "upsertOffering",
        payload: {
          offering: {
            id: "fresh-berries",
            productId: "all",
            category: "add-on",
            label: " Fresh\nberry finish ",
            servings: " 12-14\npeople ",
            low: 10,
            high: 14
          }
        }
      })
    }));

    expect(response.status).toBe(200);
    expect(mutateAdminDataInAppsScript).toHaveBeenCalledWith("upsertOffering", {
      offering: {
        id: "fresh-berries",
        productId: "all",
        category: "add-on",
        label: "Fresh berry finish",
        servings: "12-14 people",
        low: 10,
        high: 14
      }
    });
  });

  it.each([
    ["toggleProduct", { id: " Cake ", enabled: false }, { id: "cake", enabled: false }],
    ["deleteProduct", { id: " Cake " }, { id: "cake" }],
    ["toggleOffering", { id: " Fresh-Berries ", enabled: true }, { id: "fresh-berries", enabled: true }],
    ["deleteOffering", { id: " Fresh-Berries " }, { id: "fresh-berries" }]
  ])("normalizes copied catalog target ids for %s before reaching Apps Script", async (action, payload, expectedPayload) => {
    vi.mocked(mutateAdminDataInAppsScript).mockResolvedValue({ ok: true });

    const response = await POST(new Request("http://localhost/api/admin/data", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `meera_admin_session=${encodeURIComponent(createAdminSessionToken())}`
      },
      body: JSON.stringify({
        action,
        payload
      })
    }));

    expect(response.status).toBe(200);
    expect(mutateAdminDataInAppsScript).toHaveBeenCalledWith(action, expectedPayload);
  });

  it.each([
    ["deleteProduct", { id: "   " }],
    ["toggleProduct", { id: "   ", enabled: false }],
    ["deleteOffering", { id: "   " }],
    ["toggleOffering", { id: "   ", enabled: false }],
    ["updateOrderFlags", { id: "   ", hearted: false, pinned: false }],
    ["updateOrderStatus", { id: "   ", status: "confirmed" }]
  ])("rejects blank %s ids before reaching Apps Script", async (action, payload) => {
    const response = await POST(new Request("http://localhost/api/admin/data", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `meera_admin_session=${encodeURIComponent(createAdminSessionToken())}`
      },
      body: JSON.stringify({
        action,
        payload
      })
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Unsupported admin target id." });
    expect(mutateAdminDataInAppsScript).not.toHaveBeenCalled();
  });

  it.each([
    ["deleteProduct", { id: { copied: true } }],
    ["toggleProduct", { id: { copied: true }, enabled: false }],
    ["deleteOffering", { id: { copied: true } }],
    ["toggleOffering", { id: { copied: true }, enabled: false }],
    ["updateOrderFlags", { id: { copied: true }, hearted: false, pinned: false }],
    ["updateOrderStatus", { id: { copied: true }, status: "confirmed" }]
  ])("rejects non-string %s ids before reaching Apps Script", async (action, payload) => {
    const response = await POST(new Request("http://localhost/api/admin/data", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `meera_admin_session=${encodeURIComponent(createAdminSessionToken())}`
      },
      body: JSON.stringify({
        action,
        payload
      })
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Unsupported admin target id." });
    expect(mutateAdminDataInAppsScript).not.toHaveBeenCalled();
  });
});
