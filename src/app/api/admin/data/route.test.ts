import { describe, expect, it, vi } from "vitest";
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
});
