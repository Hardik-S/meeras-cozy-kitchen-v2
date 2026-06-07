import { describe, expect, it } from "vitest";
import { createAdminSessionToken } from "@/lib/admin-auth";
import { GET, POST } from "./route";

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
});
