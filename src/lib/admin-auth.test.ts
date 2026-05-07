import { describe, expect, it, vi } from "vitest";
import { createAdminSessionToken, verifyAdminPin, verifyAdminSessionToken } from "./admin-auth";

describe("admin auth helpers", () => {
  it("accepts the default admin PIN", () => {
    vi.unstubAllEnvs();

    expect(verifyAdminPin("149149")).toBe(true);
    expect(verifyAdminPin("000000")).toBe(false);
  });

  it("supports an ADMIN_PIN override", () => {
    vi.stubEnv("ADMIN_PIN", "246810");

    expect(verifyAdminPin("246810")).toBe(true);
    expect(verifyAdminPin("149149")).toBe(false);
  });

  it("creates a signed session token that can be verified", () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "test-session-secret");
    const token = createAdminSessionToken(1_800_000);

    expect(verifyAdminSessionToken(token, 1_800_100)).toBe(true);
    expect(verifyAdminSessionToken(`${token}tampered`, 1_800_100)).toBe(false);
  });
});
