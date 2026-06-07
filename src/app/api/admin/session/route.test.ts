import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";

describe("POST /api/admin/session", () => {
  it("sets an HttpOnly admin session cookie for the default PIN", async () => {
    vi.unstubAllEnvs();
    const response = await POST(
      new Request("http://localhost/api/admin/session", {
        method: "POST",
        body: JSON.stringify({ pin: "149149" })
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("meera_admin_session=");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("rejects an invalid PIN", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/session", {
        method: "POST",
        body: JSON.stringify({ pin: "111111" })
      })
    );

    expect(response.status).toBe(401);
  });

  it("rejects a null login body without throwing", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/session", {
        method: "POST",
        body: JSON.stringify(null)
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Invalid PIN." });
  });
});
