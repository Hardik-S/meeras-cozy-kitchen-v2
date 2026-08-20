import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminSessionToken } from "@/lib/admin-auth";
import { mutateAdminDataInAppsScript } from "@/lib/apps-script";
import { POST } from "./route";

vi.mock("@/lib/apps-script", () => ({
  listAdminDataFromAppsScript: vi.fn(),
  mutateAdminDataInAppsScript: vi.fn()
}));

function adminRequest(action: string, payload: Record<string, unknown>) {
  return new Request("http://localhost/api/admin/data", {
    method: "POST",
    headers: {
      cookie: `meera_admin_session=${encodeURIComponent(createAdminSessionToken())}`
    },
    body: JSON.stringify({ action, payload })
  });
}

describe("admin review mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes supported review statuses before reaching Apps Script", async () => {
    vi.mocked(mutateAdminDataInAppsScript).mockResolvedValue({ ok: true });

    const response = await POST(adminRequest("updateReviewStatus", { id: " rev_1 ", status: " PUBLISHED " }));

    expect(response.status).toBe(200);
    expect(mutateAdminDataInAppsScript).toHaveBeenCalledWith("updateReviewStatus", {
      id: "rev_1",
      status: "published"
    });
  });

  it.each(["pending", "rejected", "", 5])("rejects unsupported public review status %s", async (status) => {
    const response = await POST(adminRequest("updateReviewStatus", { id: "rev_1", status }));

    expect(response.status).toBe(400);
    expect(mutateAdminDataInAppsScript).not.toHaveBeenCalled();
  });

  it("allows authenticated deletion and rejects a blank id", async () => {
    vi.mocked(mutateAdminDataInAppsScript).mockResolvedValue({ ok: true });

    expect((await POST(adminRequest("deleteReview", { id: "rev_1" }))).status).toBe(200);
    expect(mutateAdminDataInAppsScript).toHaveBeenCalledWith("deleteReview", { id: "rev_1" });
    expect((await POST(adminRequest("deleteReview", { id: "   " }))).status).toBe(400);
  });
});
