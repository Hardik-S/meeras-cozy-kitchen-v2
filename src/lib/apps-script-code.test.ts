import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

function extractFunction(source: string, name: string) {
  const start = source.indexOf(`function ${name}`);
  if (start < 0) throw new Error(`Missing ${name}`);

  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }

  throw new Error(`Unclosed ${name}`);
}

function loadEstimateInquiry(readObjects: (sheetName: string) => Array<Record<string, unknown>>) {
  const source = readFileSync(join(process.cwd(), "docs/apps-script/Code.gs"), "utf8");
  const script = [
    extractFunction(source, "clean"),
    extractFunction(source, "toNumber"),
    extractFunction(source, "estimateInquiry"),
    "estimateInquiry"
  ].join("\n");

  return runInNewContext(script, { readObjects }) as (inquiry: {
    productType: string;
    cakeSizeId?: string;
    addOnIds?: string[];
  }) => { low: number; high: number };
}

function loadUpdateOrderStatus(patchByIdAndReturn: (sheetName: string, id: string, patch: Record<string, unknown>, action: string) => unknown) {
  const source = readFileSync(join(process.cwd(), "docs/apps-script/Code.gs"), "utf8");
  const script = [
    extractFunction(source, "clean"),
    extractFunction(source, "isOrderStatus"),
    extractFunction(source, "updateOrderStatus"),
    "updateOrderStatus"
  ].join("\n");

  return runInNewContext(script, { patchByIdAndReturn }) as (payload: { id: string; status?: string }) => unknown;
}

describe("Apps Script Code.gs estimateInquiry", () => {
  it("matches copied Sheet catalog ids after trimming them", () => {
    const estimateInquiry = loadEstimateInquiry((sheetName) => {
      if (sheetName === "Products") {
        return [{ id: " dessert-box ", low: 38, high: 48 }];
      }
      if (sheetName === "Offerings") {
        return [{ id: " fresh-berries ", productId: " all ", low: 10, high: 12 }];
      }
      return [];
    });

    expect(estimateInquiry({
      productType: "dessert-box",
      addOnIds: ["fresh-berries"]
    })).toEqual({ low: 48, high: 60 });
  });

  it("ignores copied add-ons scoped to another product", () => {
    const estimateInquiry = loadEstimateInquiry((sheetName) => {
      if (sheetName === "Products") {
        return [{ id: " cupcakes ", low: 34, high: 44 }];
      }
      if (sheetName === "Offerings") {
        return [
          { id: " cake-topper ", productId: " cake ", low: 10, high: 14 },
          { id: " sprinkle-pack ", productId: " cupcakes ", low: 4, high: 6 }
        ];
      }
      return [];
    });

    expect(estimateInquiry({
      productType: "cupcakes",
      addOnIds: ["cake-topper", "sprinkle-pack"]
    })).toEqual({ low: 38, high: 50 });
  });
});

describe("Apps Script Code.gs updateOrderStatus", () => {
  it("rejects unsupported order statuses before patching the sheet", () => {
    const patchByIdAndReturn = vi.fn();
    const updateOrderStatus = loadUpdateOrderStatus(patchByIdAndReturn);

    expect(() => updateOrderStatus({ id: "ord_123", status: "refunded" })).toThrow("Unsupported order status.");
    expect(patchByIdAndReturn).not.toHaveBeenCalled();
  });
});
