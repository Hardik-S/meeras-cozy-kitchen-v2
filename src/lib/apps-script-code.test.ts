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
    extractFunction(source, "requireMutationId"),
    extractFunction(source, "isOrderStatus"),
    extractFunction(source, "updateOrderStatus"),
    "updateOrderStatus"
  ].join("\n");

  return runInNewContext(script, { patchByIdAndReturn }) as (payload: { id: string; status?: string }) => unknown;
}

function loadUpdateSettings(setSetting: (key: string, value: string) => unknown) {
  const source = readFileSync(join(process.cwd(), "docs/apps-script/Code.gs"), "utf8");
  const script = [
    extractFunction(source, "clean"),
    extractFunction(source, "assertSettingValue"),
    extractFunction(source, "updateSettings"),
    "updateSettings"
  ].join("\n");

  return runInNewContext(script, {
    setSetting,
    audit: vi.fn(),
    listAdminData: vi.fn()
  }) as (payload: { settings?: Record<string, unknown> }) => unknown;
}

function loadUpsertLedgerEntry(upsertById: (sheetName: string, entry: Record<string, unknown>) => unknown) {
  const source = readFileSync(join(process.cwd(), "docs/apps-script/Code.gs"), "utf8");
  const script = [
    extractFunction(source, "clean"),
    extractFunction(source, "toNumber"),
    extractFunction(source, "toPositiveNumber"),
    extractFunction(source, "isLedgerEntryType"),
    extractFunction(source, "upsertLedgerEntry"),
    "upsertLedgerEntry"
  ].join("\n");

  return runInNewContext(script, {
    upsertById,
    audit: vi.fn(),
    listAdminData: vi.fn(),
    makeId: vi.fn(() => "led_generated"),
    nowIso: vi.fn(() => "2026-06-22T00:00:00.000Z"),
    todayIso: vi.fn(() => "2026-06-22")
  }) as (payload: { entry?: Record<string, unknown> }) => unknown;
}

function loadUpdateOrderFlags(patchByIdAndReturn: (sheetName: string, id: string, patch: Record<string, unknown>, action: string) => unknown) {
  const source = readFileSync(join(process.cwd(), "docs/apps-script/Code.gs"), "utf8");
  const script = [
    extractFunction(source, "clean"),
    extractFunction(source, "requireMutationId"),
    extractFunction(source, "isOrderFlag"),
    extractFunction(source, "updateOrderFlags"),
    "updateOrderFlags"
  ].join("\n");

  return runInNewContext(script, { patchByIdAndReturn }) as (payload: {
    id: string;
    hearted?: unknown;
    pinned?: unknown;
  }) => unknown;
}

function loadToggleProduct(patchByIdAndReturn: (sheetName: string, id: string, patch: Record<string, unknown>, action: string) => unknown) {
  const source = readFileSync(join(process.cwd(), "docs/apps-script/Code.gs"), "utf8");
  const script = [
    extractFunction(source, "clean"),
    extractFunction(source, "requireMutationId"),
    extractFunction(source, "isCatalogToggleValue"),
    extractFunction(source, "toggleProduct"),
    "toggleProduct"
  ].join("\n");

  return runInNewContext(script, { patchByIdAndReturn, nowIso: vi.fn(() => "2026-06-22T00:00:00.000Z") }) as (payload: {
    id: string;
    enabled?: unknown;
  }) => unknown;
}

function loadUpsertProduct(upsertById: (sheetName: string, product: Record<string, unknown>) => unknown) {
  const source = readFileSync(join(process.cwd(), "docs/apps-script/Code.gs"), "utf8");
  const script = [
    extractFunction(source, "clean"),
    extractFunction(source, "slug"),
    extractFunction(source, "toNumber"),
    extractFunction(source, "isCatalogToggleValue"),
    extractFunction(source, "catalogEnabledOrDefault"),
    extractFunction(source, "upsertProduct"),
    "upsertProduct"
  ].join("\n");

  return runInNewContext(script, {
    upsertById,
    audit: vi.fn(),
    listAdminData: vi.fn(),
    nowIso: vi.fn(() => "2026-06-22T00:00:00.000Z")
  }) as (payload: { product?: Record<string, unknown> }) => unknown;
}

function loadUpsertOffering(upsertById: (sheetName: string, offering: Record<string, unknown>) => unknown) {
  const source = readFileSync(join(process.cwd(), "docs/apps-script/Code.gs"), "utf8");
  const script = [
    extractFunction(source, "clean"),
    extractFunction(source, "slug"),
    extractFunction(source, "toNumber"),
    extractFunction(source, "isCatalogToggleValue"),
    extractFunction(source, "catalogEnabledOrDefault"),
    extractFunction(source, "upsertOffering"),
    "upsertOffering"
  ].join("\n");

  return runInNewContext(script, {
    upsertById,
    audit: vi.fn(),
    listAdminData: vi.fn(),
    nowIso: vi.fn(() => "2026-06-22T00:00:00.000Z")
  }) as (payload: { offering?: Record<string, unknown> }) => unknown;
}

function loadToggleOffering(patchByIdAndReturn: (sheetName: string, id: string, patch: Record<string, unknown>, action: string) => unknown) {
  const source = readFileSync(join(process.cwd(), "docs/apps-script/Code.gs"), "utf8");
  const script = [
    extractFunction(source, "clean"),
    extractFunction(source, "requireMutationId"),
    extractFunction(source, "isCatalogToggleValue"),
    extractFunction(source, "toggleOffering"),
    "toggleOffering"
  ].join("\n");

  return runInNewContext(script, { patchByIdAndReturn, nowIso: vi.fn(() => "2026-06-22T00:00:00.000Z") }) as (payload: {
    id: string;
    enabled?: unknown;
  }) => unknown;
}

function loadDeleteProduct(deleteById: (sheetName: string, id: string) => unknown) {
  const source = readFileSync(join(process.cwd(), "docs/apps-script/Code.gs"), "utf8");
  const script = [
    extractFunction(source, "clean"),
    extractFunction(source, "requireMutationId"),
    extractFunction(source, "deleteProduct"),
    "deleteProduct"
  ].join("\n");

  return runInNewContext(script, {
    deleteById,
    audit: vi.fn(),
    listAdminData: vi.fn()
  }) as (payload: { id: string }) => unknown;
}

function loadDeleteOffering(deleteById: (sheetName: string, id: string) => unknown) {
  const source = readFileSync(join(process.cwd(), "docs/apps-script/Code.gs"), "utf8");
  const script = [
    extractFunction(source, "clean"),
    extractFunction(source, "requireMutationId"),
    extractFunction(source, "deleteOffering"),
    "deleteOffering"
  ].join("\n");

  return runInNewContext(script, {
    deleteById,
    audit: vi.fn(),
    listAdminData: vi.fn()
  }) as (payload: { id: string }) => unknown;
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

  it("rejects blank order ids before patching the sheet", () => {
    const patchByIdAndReturn = vi.fn();
    const updateOrderStatus = loadUpdateOrderStatus(patchByIdAndReturn);

    expect(() => updateOrderStatus({ id: "   ", status: "confirmed" })).toThrow("Unsupported admin target id.");
    expect(patchByIdAndReturn).not.toHaveBeenCalled();
  });
});

describe("Apps Script Code.gs updateSettings", () => {
  it("rejects non-string setting values before patching the sheet", () => {
    const setSetting = vi.fn();
    const updateSettings = loadUpdateSettings(setSetting);

    expect(() => updateSettings({ settings: { defaultReceiver: { email: "chef@example.com" } } }))
      .toThrow("Unsupported settings value.");
    expect(setSetting).not.toHaveBeenCalled();
  });
});

describe("Apps Script Code.gs upsertLedgerEntry", () => {
  it("rejects unsupported ledger entry types before patching the sheet", () => {
    const upsertById = vi.fn();
    const upsertLedgerEntry = loadUpsertLedgerEntry(upsertById);

    expect(() => upsertLedgerEntry({ entry: { id: "led_123", type: "refund", amount: 12 } }))
      .toThrow("Unsupported ledger entry type.");
    expect(upsertById).not.toHaveBeenCalled();
  });
});

describe("Apps Script Code.gs updateOrderFlags", () => {
  it("rejects non-boolean order flags before patching the sheet", () => {
    const patchByIdAndReturn = vi.fn();
    const updateOrderFlags = loadUpdateOrderFlags(patchByIdAndReturn);

    expect(() => updateOrderFlags({ id: "ord_123", hearted: "false", pinned: false }))
      .toThrow("Unsupported order flag value.");
    expect(patchByIdAndReturn).not.toHaveBeenCalled();
  });

  it("rejects blank order ids before patching the sheet", () => {
    const patchByIdAndReturn = vi.fn();
    const updateOrderFlags = loadUpdateOrderFlags(patchByIdAndReturn);

    expect(() => updateOrderFlags({ id: "   ", hearted: false, pinned: false }))
      .toThrow("Unsupported admin target id.");
    expect(patchByIdAndReturn).not.toHaveBeenCalled();
  });
});

describe("Apps Script Code.gs catalog toggles", () => {
  it("rejects non-boolean product upsert enabled values before patching the sheet", () => {
    const upsertById = vi.fn();
    const upsertProduct = loadUpsertProduct(upsertById);

    expect(() => upsertProduct({ product: { id: "cake", label: "Cake", enabled: "false" } }))
      .toThrow("Unsupported catalog enabled value.");
    expect(upsertById).not.toHaveBeenCalled();
  });

  it("rejects non-boolean offering upsert enabled values before patching the sheet", () => {
    const upsertById = vi.fn();
    const upsertOffering = loadUpsertOffering(upsertById);

    expect(() => upsertOffering({ offering: { id: "floral-piping", label: "Floral piping", enabled: "false" } }))
      .toThrow("Unsupported catalog enabled value.");
    expect(upsertById).not.toHaveBeenCalled();
  });

  it("rejects non-boolean product toggles before patching the sheet", () => {
    const patchByIdAndReturn = vi.fn();
    const toggleProduct = loadToggleProduct(patchByIdAndReturn);

    expect(() => toggleProduct({ id: "cake", enabled: "false" }))
      .toThrow("Unsupported catalog toggle value.");
    expect(patchByIdAndReturn).not.toHaveBeenCalled();
  });

  it("rejects blank product toggle ids before patching the sheet", () => {
    const patchByIdAndReturn = vi.fn();
    const toggleProduct = loadToggleProduct(patchByIdAndReturn);

    expect(() => toggleProduct({ id: "   ", enabled: false }))
      .toThrow("Unsupported admin target id.");
    expect(patchByIdAndReturn).not.toHaveBeenCalled();
  });

  it("rejects non-boolean offering toggles before patching the sheet", () => {
    const patchByIdAndReturn = vi.fn();
    const toggleOffering = loadToggleOffering(patchByIdAndReturn);

    expect(() => toggleOffering({ id: "floral-piping", enabled: "false" }))
      .toThrow("Unsupported catalog toggle value.");
    expect(patchByIdAndReturn).not.toHaveBeenCalled();
  });

  it("rejects blank offering toggle ids before patching the sheet", () => {
    const patchByIdAndReturn = vi.fn();
    const toggleOffering = loadToggleOffering(patchByIdAndReturn);

    expect(() => toggleOffering({ id: "   ", enabled: false }))
      .toThrow("Unsupported admin target id.");
    expect(patchByIdAndReturn).not.toHaveBeenCalled();
  });
});

describe("Apps Script Code.gs catalog deletes", () => {
  it("rejects blank product delete ids before deleting the sheet row", () => {
    const deleteById = vi.fn();
    const deleteProduct = loadDeleteProduct(deleteById);

    expect(() => deleteProduct({ id: "   " })).toThrow("Unsupported admin target id.");
    expect(deleteById).not.toHaveBeenCalled();
  });

  it("rejects blank offering delete ids before deleting the sheet row", () => {
    const deleteById = vi.fn();
    const deleteOffering = loadDeleteOffering(deleteById);

    expect(() => deleteOffering({ id: "   " })).toThrow("Unsupported admin target id.");
    expect(deleteById).not.toHaveBeenCalled();
  });
});
