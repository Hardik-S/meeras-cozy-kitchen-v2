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

function loadRequirePostPayload() {
  const source = readFileSync(join(process.cwd(), "docs/apps-script/Code.gs"), "utf8");
  const script = [
    extractFunction(source, "requirePostPayload"),
    "requirePostPayload"
  ].join("\n");

  return runInNewContext(script) as (payload: unknown) => Record<string, unknown>;
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

function loadSubmitOrder(appendObject: (sheetName: string, object: Record<string, unknown>) => unknown) {
  const source = readFileSync(join(process.cwd(), "docs/apps-script/Code.gs"), "utf8");
  const script = [
    extractFunction(source, "clean"),
    extractFunction(source, "toNumber"),
    extractFunction(source, "summaryTextOrDefault"),
    extractFunction(source, "inquiryTextOrDefault"),
    extractFunction(source, "assertInquiryAddOns"),
    extractFunction(source, "requireInquiryPayload"),
    extractFunction(source, "assertInquiryTextFields"),
    extractFunction(source, "estimateInquiry"),
    extractFunction(source, "buildSummary"),
    extractFunction(source, "submitOrder"),
    "submitOrder"
  ].join("\n");

  return runInNewContext(script, {
    appendObject,
    audit: vi.fn(),
    makeId: vi.fn(() => "ord_generated"),
    nowIso: vi.fn(() => "2026-06-24T00:00:00.000Z"),
    readObjects: vi.fn(() => []),
    sendInquiryEmails: vi.fn()
  }) as (payload: { inquiry?: Record<string, unknown>; summary?: unknown }) => unknown;
}

function loadUpdateSettings(setSetting: (key: string, value: string) => unknown) {
  const source = readFileSync(join(process.cwd(), "docs/apps-script/Code.gs"), "utf8");
  const script = [
    extractFunction(source, "clean"),
    extractFunction(source, "assertSettingValue"),
    extractFunction(source, "assertSettingKeys"),
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
    extractFunction(source, "requireLedgerEntryPayload"),
    extractFunction(source, "assertLedgerAmount"),
    extractFunction(source, "ledgerQuantityOrDefault"),
    extractFunction(source, "ledgerTextOrDefault"),
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
    extractFunction(source, "requireCatalogPayload"),
    extractFunction(source, "catalogTextOrDefault"),
    extractFunction(source, "assertCatalogPrice"),
    extractFunction(source, "assertCatalogPriceRange"),
    extractFunction(source, "catalogSortOrderOrDefault"),
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
    extractFunction(source, "requireCatalogPayload"),
    extractFunction(source, "catalogTextOrDefault"),
    extractFunction(source, "assertCatalogPrice"),
    extractFunction(source, "assertCatalogPriceRange"),
    extractFunction(source, "catalogSortOrderOrDefault"),
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

describe("Apps Script Code.gs submitOrder", () => {
  it("rejects malformed inquiry payloads before appending order rows", () => {
    const appendObject = vi.fn();
    const submitOrder = loadSubmitOrder(appendObject);

    expect(() => submitOrder({ inquiry: ["Amina"] as unknown as Record<string, unknown> }))
      .toThrow("Unsupported inquiry payload.");
    expect(appendObject).not.toHaveBeenCalled();
  });

  it("rejects non-string inquiry text before appending order rows", () => {
    const appendObject = vi.fn();
    const submitOrder = loadSubmitOrder(appendObject);

    expect(() => submitOrder({ inquiry: { name: { copied: true } } }))
      .toThrow("Unsupported inquiry text value.");
    expect(appendObject).not.toHaveBeenCalled();
  });

  it("rejects non-string add-on ids before appending order rows", () => {
    const appendObject = vi.fn();
    const submitOrder = loadSubmitOrder(appendObject);

    expect(() => submitOrder({ inquiry: { addOnIds: [{ copied: true }] } }))
      .toThrow("Unsupported inquiry add-on value.");
    expect(appendObject).not.toHaveBeenCalled();
  });

  it("rejects non-string inquiry summaries before appending order rows", () => {
    const appendObject = vi.fn();
    const submitOrder = loadSubmitOrder(appendObject);

    expect(() => submitOrder({
      inquiry: { name: "Amina", productType: "dessert-box" },
      summary: { copied: true }
    })).toThrow("Unsupported inquiry summary.");
    expect(appendObject).not.toHaveBeenCalled();
  });
});

describe("Apps Script Code.gs request payloads", () => {
  it.each([null, ["submitOrder"]])("rejects malformed top-level POST payloads", (payload) => {
    const requirePostPayload = loadRequirePostPayload();

    expect(() => requirePostPayload(payload)).toThrow("Unsupported request payload.");
  });
});

describe("Apps Script Code.gs updateOrderStatus", () => {
  it("rejects unsupported order statuses before patching the sheet", () => {
    const patchByIdAndReturn = vi.fn();
    const updateOrderStatus = loadUpdateOrderStatus(patchByIdAndReturn);

    expect(() => updateOrderStatus({ id: "ord_123", status: "refunded" })).toThrow("Unsupported order status.");
    expect(patchByIdAndReturn).not.toHaveBeenCalled();
  });

  it("rejects missing order statuses before patching the sheet", () => {
    const patchByIdAndReturn = vi.fn();
    const updateOrderStatus = loadUpdateOrderStatus(patchByIdAndReturn);

    expect(() => updateOrderStatus({ id: "ord_123" })).toThrow("Unsupported order status.");
    expect(patchByIdAndReturn).not.toHaveBeenCalled();
  });

  it("rejects blank order ids before patching the sheet", () => {
    const patchByIdAndReturn = vi.fn();
    const updateOrderStatus = loadUpdateOrderStatus(patchByIdAndReturn);

    expect(() => updateOrderStatus({ id: "   ", status: "confirmed" })).toThrow("Unsupported admin target id.");
    expect(patchByIdAndReturn).not.toHaveBeenCalled();
  });

  it("rejects non-string order ids before patching the sheet", () => {
    const patchByIdAndReturn = vi.fn();
    const updateOrderStatus = loadUpdateOrderStatus(patchByIdAndReturn);

    expect(() => updateOrderStatus({ id: { copied: true } as unknown as string, status: "confirmed" }))
      .toThrow("Unsupported admin target id.");
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

  it("rejects unknown setting keys before patching the sheet", () => {
    const setSetting = vi.fn();
    const updateSettings = loadUpdateSettings(setSetting);

    expect(() => updateSettings({ settings: { defaultReciever: "chef@example.com" } }))
      .toThrow("Unsupported settings key.");
    expect(setSetting).not.toHaveBeenCalled();
  });

  it("rejects malformed settings payloads before patching the sheet", () => {
    const setSetting = vi.fn();
    const updateSettings = loadUpdateSettings(setSetting);

    expect(() => updateSettings({ settings: ["defaultReceiver"] as unknown as Record<string, unknown> }))
      .toThrow("Unsupported settings payload.");
    expect(setSetting).not.toHaveBeenCalled();
  });
});

describe("Apps Script Code.gs upsertLedgerEntry", () => {
  it("rejects malformed ledger entry payloads before patching the sheet", () => {
    const upsertById = vi.fn();
    const upsertLedgerEntry = loadUpsertLedgerEntry(upsertById);

    expect(() => upsertLedgerEntry({ entry: ["income", 12] as unknown as Record<string, unknown> }))
      .toThrow("Unsupported ledger entry payload.");
    expect(upsertById).not.toHaveBeenCalled();
  });

  it("rejects unsupported ledger entry types before patching the sheet", () => {
    const upsertById = vi.fn();
    const upsertLedgerEntry = loadUpsertLedgerEntry(upsertById);

    expect(() => upsertLedgerEntry({ entry: { id: "led_123", type: "refund", amount: 12 } }))
      .toThrow("Unsupported ledger entry type.");
    expect(upsertById).not.toHaveBeenCalled();
  });

  it("rejects non-number ledger amounts before patching the sheet", () => {
    const upsertById = vi.fn();
    const upsertLedgerEntry = loadUpsertLedgerEntry(upsertById);

    expect(() => upsertLedgerEntry({ entry: { id: "led_123", type: "expense", amount: "12" } }))
      .toThrow("Unsupported ledger amount.");
    expect(upsertById).not.toHaveBeenCalled();
  });

  it("rejects invalid ledger quantities before patching the sheet", () => {
    const upsertById = vi.fn();
    const upsertLedgerEntry = loadUpsertLedgerEntry(upsertById);

    expect(() => upsertLedgerEntry({ entry: { id: "led_123", type: "expense", amount: 12, quantity: "2" } }))
      .toThrow("Unsupported ledger quantity.");
    expect(upsertById).not.toHaveBeenCalled();
  });

  it.each(["date", "category", "description", "orderId"])(
    "rejects non-string ledger %s values before patching the sheet",
    (field) => {
      const upsertById = vi.fn();
      const upsertLedgerEntry = loadUpsertLedgerEntry(upsertById);

      expect(() => upsertLedgerEntry({
        entry: {
          id: "led_123",
          type: "expense",
          amount: 12,
          quantity: 1,
          [field]: { copied: true }
        }
      })).toThrow("Unsupported ledger text value.");
      expect(upsertById).not.toHaveBeenCalled();
    }
  );
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
  it("rejects malformed product upsert payloads before patching the sheet", () => {
    const upsertById = vi.fn();
    const upsertProduct = loadUpsertProduct(upsertById);

    expect(() => upsertProduct({ product: ["cake"] as unknown as Record<string, unknown> }))
      .toThrow("Unsupported catalog payload.");
    expect(upsertById).not.toHaveBeenCalled();
  });

  it("rejects malformed offering upsert payloads before patching the sheet", () => {
    const upsertById = vi.fn();
    const upsertOffering = loadUpsertOffering(upsertById);

    expect(() => upsertOffering({ offering: ["floral-piping"] as unknown as Record<string, unknown> }))
      .toThrow("Unsupported catalog payload.");
    expect(upsertById).not.toHaveBeenCalled();
  });

  it("rejects non-boolean product upsert enabled values before patching the sheet", () => {
    const upsertById = vi.fn();
    const upsertProduct = loadUpsertProduct(upsertById);

    expect(() => upsertProduct({ product: { id: "cake", label: "Cake", enabled: "false" } }))
      .toThrow("Unsupported catalog enabled value.");
    expect(upsertById).not.toHaveBeenCalled();
  });

  it("rejects non-number product upsert prices before patching the sheet", () => {
    const upsertById = vi.fn();
    const upsertProduct = loadUpsertProduct(upsertById);

    expect(() => upsertProduct({ product: { id: "cake", label: "Cake", low: "58", high: 68 } }))
      .toThrow("Unsupported catalog price value.");
    expect(upsertById).not.toHaveBeenCalled();
  });

  it("rejects inverted product upsert price ranges before patching the sheet", () => {
    const upsertById = vi.fn();
    const upsertProduct = loadUpsertProduct(upsertById);

    expect(() => upsertProduct({ product: { id: "cake", label: "Cake", low: 88, high: 58 } }))
      .toThrow("Unsupported catalog price range.");
    expect(upsertById).not.toHaveBeenCalled();
  });

  it("rejects non-number product upsert sort orders before patching the sheet", () => {
    const upsertById = vi.fn();
    const upsertProduct = loadUpsertProduct(upsertById);

    expect(() => upsertProduct({ product: { id: "cake", label: "Cake", low: 58, high: 68, sortOrder: "1" } }))
      .toThrow("Unsupported catalog sort order value.");
    expect(upsertById).not.toHaveBeenCalled();
  });

  it("rejects non-string product upsert text values before patching the sheet", () => {
    const upsertById = vi.fn();
    const upsertProduct = loadUpsertProduct(upsertById);

    expect(() => upsertProduct({ product: { id: "cake", label: { copied: true }, low: 58, high: 68 } }))
      .toThrow("Unsupported catalog text value.");
    expect(upsertById).not.toHaveBeenCalled();
  });

  it("rejects non-boolean offering upsert enabled values before patching the sheet", () => {
    const upsertById = vi.fn();
    const upsertOffering = loadUpsertOffering(upsertById);

    expect(() => upsertOffering({ offering: { id: "floral-piping", label: "Floral piping", enabled: "false" } }))
      .toThrow("Unsupported catalog enabled value.");
    expect(upsertById).not.toHaveBeenCalled();
  });

  it("rejects non-number offering upsert prices before patching the sheet", () => {
    const upsertById = vi.fn();
    const upsertOffering = loadUpsertOffering(upsertById);

    expect(() => upsertOffering({ offering: { id: "floral-piping", label: "Floral piping", low: 12, high: "18" } }))
      .toThrow("Unsupported catalog price value.");
    expect(upsertById).not.toHaveBeenCalled();
  });

  it("rejects inverted offering upsert price ranges before patching the sheet", () => {
    const upsertById = vi.fn();
    const upsertOffering = loadUpsertOffering(upsertById);

    expect(() => upsertOffering({ offering: { id: "floral-piping", label: "Floral piping", low: 22, high: 18 } }))
      .toThrow("Unsupported catalog price range.");
    expect(upsertById).not.toHaveBeenCalled();
  });

  it("rejects non-number offering upsert sort orders before patching the sheet", () => {
    const upsertById = vi.fn();
    const upsertOffering = loadUpsertOffering(upsertById);

    expect(() => upsertOffering({ offering: { id: "floral-piping", label: "Floral piping", low: 12, high: 18, sortOrder: "1" } }))
      .toThrow("Unsupported catalog sort order value.");
    expect(upsertById).not.toHaveBeenCalled();
  });

  it("rejects non-string offering upsert text values before patching the sheet", () => {
    const upsertById = vi.fn();
    const upsertOffering = loadUpsertOffering(upsertById);

    expect(() => upsertOffering({
      offering: { id: "floral-piping", label: "Floral piping", category: { copied: true }, low: 12, high: 18 }
    })).toThrow("Unsupported catalog text value.");
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
