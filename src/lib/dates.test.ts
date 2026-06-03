import { describe, expect, it } from "vitest";
import { getMinimumPickupDate, isAtLeastMinimumNotice } from "./dates";

describe("date notice helpers", () => {
  it("adds seven full days to the selected date", () => {
    const minimum = getMinimumPickupDate(new Date("2026-05-06T12:00:00-04:00"));

    expect(minimum).toBe("2026-05-13");
  });

  it("rejects pickup dates inside the seven-day notice window", () => {
    const today = new Date("2026-05-06T12:00:00-04:00");

    expect(isAtLeastMinimumNotice("2026-05-12", today)).toBe(false);
    expect(isAtLeastMinimumNotice("2026-05-13", today)).toBe(true);
  });

  it("adds calendar days across daylight saving time changes", () => {
    const minimum = getMinimumPickupDate(new Date("2026-10-31T12:00:00-04:00"));

    expect(minimum).toBe("2026-11-07");
  });

  it("rejects impossible calendar dates before applying notice rules", () => {
    const today = new Date("2026-05-06T12:00:00-04:00");

    expect(isAtLeastMinimumNotice("9999-99-99", today)).toBe(false);
  });
});
