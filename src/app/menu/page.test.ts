import { describe, expect, it } from "vitest";
import { dynamic } from "./page";

describe("/menu v2 rendering", () => {
  it("does not force dynamic server rendering for the sheet catalog", () => {
    expect(dynamic).not.toBe("force-dynamic");
  });
});
