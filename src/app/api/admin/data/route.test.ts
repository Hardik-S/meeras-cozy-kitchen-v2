import { describe, expect, it } from "vitest";
import { GET } from "./route";

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
