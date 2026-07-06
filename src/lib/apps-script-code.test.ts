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
    extractFunction(source, "isAddOnOffering"),
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
    extractFunction(source, "normalizeOrderStatus"),
    extractFunction(source, "isOrderStatus"),
    extractFunction(source, "updateOrderStatus"),
    "updateOrderStatus"
  ].join("\n");

  return runInNewContext(script, { patchByIdAndReturn }) as (payload: { id: string; status?: string }) => unknown;
}

function loadSubmitOrder(
  appendObject: (sheetName: string, object: Record<string, unknown>) => unknown,
  readObjects: (sheetName: string) => Array<Record<string, unknown>> = () => []
) {
  const source = readFileSync(join(process.cwd(), "docs/apps-script/Code.gs"), "utf8");
  const script = [
    extractFunction(source, "clean"),
    extractFunction(source, "toNumber"),
    extractFunction(source, "summaryTextOrDefault"),
    extractFunction(source, "inquiryTextOrDefault"),
    extractFunction(source, "assertInquiryAddOns"),
    extractFunction(source, "requireInquiryPayload"),
    extractFunction(source, "assertInquiryTextFields"),
    extractFunction(source, "isAddOnOffering"),
    extractFunction(source, "estimateInquiry"),
    extractFunction(source, "selectedAddOnLabels"),
    extractFunction(source, "selectedOfferingLabel"),
    extractFunction(source, "buildSummary"),
    extractFunction(source, "submitOrder"),
    "submitOrder"
  ].join("\n");

  return runInNewContext(script, {
    appendObject,
    audit: vi.fn(),
    makeId: vi.fn(() => "ord_generated"),
    nowIso: vi.fn(() => "2026-06-24T00:00:00.000Z"),
    readObjects,
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
    extractFunction(source, "normalizeLedgerEntryType"),
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
    extractFunction(source, "catalogRequiredText"),
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
    extractFunction(source, "catalogRequiredText"),
    extractFunction(source, "catalogProductIdOrDefault"),
    extractFunction(source, "catalogCategoryOrDefault"),
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
          { id: " sprinkle-pack ", productId: " Cupcakes ", low: 4, high: 6 }
        ];
      }
      return [];
    });

    expect(estimateInquiry({
      productType: "cupcakes",
      addOnIds: ["cake-topper", "sprinkle-pack"]
    })).toEqual({ low: 38, high: 50 });
  });

  it("normalizes copied estimate input casing before matching Sheet rows", () => {
    const estimateInquiry = loadEstimateInquiry((sheetName) => {
      if (sheetName === "Products") {
        return [{ id: " cake ", low: 58, high: 150 }];
      }
      if (sheetName === "Offerings") {
        return [
          { id: " six-inch ", productId: " cake ", low: 58, high: 68 },
          { id: " fresh-berries ", productId: " all ", low: 10, high: 12 }
        ];
      }
      return [];
    });

    expect(estimateInquiry({
      productType: " Cake ",
      cakeSizeId: " Six-Inch ",
      addOnIds: [" Fresh-Berries "]
    })).toEqual({ low: 68, high: 80 });
  });

  it("ignores copied non-add-on offering ids inside add-on selections", () => {
    const estimateInquiry = loadEstimateInquiry((sheetName) => {
      if (sheetName === "Products") {
        return [{ id: "cake", low: 58, high: 150 }];
      }
      if (sheetName === "Offerings") {
        return [
          { id: "six-inch", productId: "cake", category: "cake-size", low: 58, high: 68 },
          { id: "vanilla-rose", productId: "all", category: "flavour", low: 99, high: 99 },
          { id: "fresh-berries", productId: "all", category: "add-on", low: 10, high: 12 }
        ];
      }
      return [];
    });

    expect(estimateInquiry({
      productType: "cake",
      cakeSizeId: "six-inch",
      addOnIds: ["six-inch", "vanilla-rose", "fresh-berries"]
    })).toEqual({ low: 68, high: 80 });
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

  it("includes selected Sheet-backed add-ons in fallback summaries", () => {
    const appendObject = vi.fn();
    const submitOrder = loadSubmitOrder(appendObject, (sheetName) => {
      if (sheetName === "Products") {
        return [{ id: "dessert-box", low: 38, high: 48 }];
      }
      if (sheetName === "Offerings") {
        return [
          { id: "gold-leaf", productId: "all", label: "Gold leaf finish", low: 18, high: 24 },
          { id: "cake-topper", productId: "cake", label: "Cake topper", low: 12, high: 16 }
        ];
      }
      return [];
    });

    submitOrder({
      inquiry: {
        name: "Amina",
        email: "amina@example.com",
        phone: "4165550101",
        eventDate: "2099-05-20",
        productType: "dessert-box",
        addOnIds: ["gold-leaf", "cake-topper"],
        budget: "100-150",
        message: "Birthday dessert box with soft florals."
      }
    });

    expect(appendObject).toHaveBeenCalledWith(
      "Orders",
      expect.objectContaining({
        summary: expect.stringContaining("Add-ons: Gold leaf finish")
      })
    );
    expect(appendObject.mock.calls[0][1].summary).not.toContain("Cake topper");
  });

  it("ignores copied non-add-on ids in fallback add-on summaries", () => {
    const appendObject = vi.fn();
    const submitOrder = loadSubmitOrder(appendObject, (sheetName) => {
      if (sheetName === "Products") {
        return [{ id: "cake", low: 58, high: 150 }];
      }
      if (sheetName === "Offerings") {
        return [
          { id: "six-inch", productId: "cake", category: "cake-size", label: "6 inch round cake", low: 58, high: 68 },
          { id: "vanilla-rose", productId: "all", category: "flavour", label: "Vanilla rose", low: 99, high: 99 },
          { id: "fresh-berries", productId: "all", category: "add-on", label: "Fresh berry finish", low: 10, high: 12 }
        ];
      }
      return [];
    });

    submitOrder({
      inquiry: {
        name: "Amina",
        email: "amina@example.com",
        phone: "4165550101",
        eventDate: "2099-05-20",
        productType: "cake",
        cakeSizeId: "six-inch",
        flavourId: "vanilla-rose",
        addOnIds: ["six-inch", "vanilla-rose", "fresh-berries"],
        budget: "100-150",
        message: "Birthday cake with soft florals."
      }
    });

    expect(appendObject.mock.calls[0][1].summary).toContain("Add-ons: Fresh berry finish");
    expect(appendObject.mock.calls[0][1].summary).not.toContain("Add-ons: 6 inch round cake");
    expect(appendObject.mock.calls[0][1].summary).not.toContain("Add-ons: Vanilla rose");
    expect(appendObject.mock.calls[0][1].summary).toContain("Cake size: 6 inch round cake");
    expect(appendObject.mock.calls[0][1].summary).toContain("Flavour: Vanilla rose");
  });

  it("includes Sheet-backed cake size and flavour labels in fallback summaries", () => {
    const appendObject = vi.fn();
    const submitOrder = loadSubmitOrder(appendObject, (sheetName) => {
      if (sheetName === "Products") {
        return [{ id: "cake", low: 58, high: 150 }];
      }
      if (sheetName === "Offerings") {
        return [
          { id: "tall-six", productId: "cake", label: "Tall six inch celebration cake", low: 72, high: 84 },
          { id: "mango-saffron", productId: "all", label: "Mango saffron", low: 0, high: 0 }
        ];
      }
      return [];
    });

    submitOrder({
      inquiry: {
        name: "Amina",
        email: "amina@example.com",
        phone: "4165550101",
        eventDate: "2099-05-20",
        productType: "cake",
        cakeSizeId: "tall-six",
        flavourId: "mango-saffron",
        budget: "100-150",
        message: "Birthday cake with mango saffron."
      }
    });

    expect(appendObject).toHaveBeenCalledWith(
      "Orders",
      expect.objectContaining({
        summary: expect.stringContaining("Cake size: Tall six inch celebration cake")
      })
    );
    expect(appendObject.mock.calls[0][1].summary).toContain("Flavour: Mango saffron");
  });
});

describe("Apps Script Code.gs request payloads", () => {
  it.each([null, ["submitOrder"]])("rejects malformed top-level POST payloads", (payload) => {
    const requirePostPayload = loadRequirePostPayload();

    expect(() => requirePostPayload(payload)).toThrow("Unsupported request payload.");
  });
});

describe("Apps Script Code.gs updateOrderStatus", () => {
  it("normalizes copied order status casing before patching the sheet", () => {
    const patchByIdAndReturn = vi.fn();
    const updateOrderStatus = loadUpdateOrderStatus(patchByIdAndReturn);

    updateOrderStatus({ id: "ord_123", status: " Confirmed " });

    expect(patchByIdAndReturn).toHaveBeenCalledWith(
      "Orders",
      "ord_123",
      { status: "confirmed" },
      "updateOrderStatus"
    );
  });

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

  it("normalizes copied ledger entry type casing before patching the sheet", () => {
    const upsertById = vi.fn();
    const upsertLedgerEntry = loadUpsertLedgerEntry(upsertById);

    upsertLedgerEntry({ entry: { id: "led_123", type: " Income ", amount: 12 } });

    expect(upsertById).toHaveBeenCalledWith("Ledger", expect.objectContaining({
      id: "led_123",
      type: "income",
      amount: 12
    }));
  });

  it.each(["12", -12])("rejects invalid ledger amount %s before patching the sheet", (amount) => {
    const upsertById = vi.fn();
    const upsertLedgerEntry = loadUpsertLedgerEntry(upsertById);

    expect(() => upsertLedgerEntry({ entry: { id: "led_123", type: "expense", amount } }))
      .toThrow("Unsupported ledger amount.");
    expect(upsertById).not.toHaveBeenCalled();
  });

  it.each(["2", 1.5])("rejects invalid ledger quantity %s before patching the sheet", (quantity) => {
    const upsertById = vi.fn();
    const upsertLedgerEntry = loadUpsertLedgerEntry(upsertById);

    expect(() => upsertLedgerEntry({ entry: { id: "led_123", type: "expense", amount: 12, quantity } }))
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

  it("rejects negative product upsert prices before patching the sheet", () => {
    const upsertById = vi.fn();
    const upsertProduct = loadUpsertProduct(upsertById);

    expect(() => upsertProduct({ product: { id: "cake", label: "Cake", low: -1, high: 68 } }))
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

  it.each(["1", 1.5, -1])("rejects invalid product upsert sort order %s before patching the sheet", (sortOrder) => {
    const upsertById = vi.fn();
    const upsertProduct = loadUpsertProduct(upsertById);

    expect(() => upsertProduct({ product: { id: "cake", label: "Cake", low: 58, high: 68, sortOrder } }))
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

  it("rejects blank product upsert labels before patching the sheet", () => {
    const upsertById = vi.fn();
    const upsertProduct = loadUpsertProduct(upsertById);

    expect(() => upsertProduct({ product: { id: "custom-cake", label: "   ", low: 58, high: 68 } }))
      .toThrow("Unsupported catalog text value.");
    expect(upsertById).not.toHaveBeenCalled();
  });

  it("uses the product label when copied product ids are blank", () => {
    const upsertById = vi.fn();
    const upsertProduct = loadUpsertProduct(upsertById);

    upsertProduct({ product: { id: "   ", label: "Custom Cake", low: 58, high: 68 } });

    expect(upsertById).toHaveBeenCalledWith("Products", expect.objectContaining({
      id: "custom-cake",
      label: "Custom Cake"
    }));
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

  it("rejects negative offering upsert prices before patching the sheet", () => {
    const upsertById = vi.fn();
    const upsertOffering = loadUpsertOffering(upsertById);

    expect(() => upsertOffering({ offering: { id: "floral-piping", label: "Floral piping", low: -1, high: 18 } }))
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

  it.each(["1", 1.5, -1])("rejects invalid offering upsert sort order %s before patching the sheet", (sortOrder) => {
    const upsertById = vi.fn();
    const upsertOffering = loadUpsertOffering(upsertById);

    expect(() => upsertOffering({ offering: { id: "floral-piping", label: "Floral piping", low: 12, high: 18, sortOrder } }))
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

  it("rejects blank offering upsert labels before patching the sheet", () => {
    const upsertById = vi.fn();
    const upsertOffering = loadUpsertOffering(upsertById);

    expect(() => upsertOffering({
      offering: { id: "floral-piping", label: "   ", category: "add-on", low: 12, high: 18 }
    })).toThrow("Unsupported catalog text value.");
    expect(upsertById).not.toHaveBeenCalled();
  });

  it("rejects unsupported offering categories before patching the sheet", () => {
    const upsertById = vi.fn();
    const upsertOffering = loadUpsertOffering(upsertById);

    expect(() => upsertOffering({
      offering: {
        id: "custom-topper",
        productId: "cake",
        category: "topping",
        label: "Custom topper",
        low: 12,
        high: 18
      }
    })).toThrow("Unsupported catalog category.");
    expect(upsertById).not.toHaveBeenCalled();
  });

  it("normalizes copied offering category casing before patching the sheet", () => {
    const upsertById = vi.fn();
    const upsertOffering = loadUpsertOffering(upsertById);

    upsertOffering({
      offering: {
        id: "custom-topper",
        productId: "cake",
        category: " Add-On ",
        label: "Custom topper",
        low: 12,
        high: 18
      }
    });

    expect(upsertById).toHaveBeenCalledWith("Offerings", expect.objectContaining({
      id: "custom-topper",
      category: "add-on",
      label: "Custom topper"
    }));
  });

  it("normalizes copied offering product id casing before patching the sheet", () => {
    const upsertById = vi.fn();
    const upsertOffering = loadUpsertOffering(upsertById);

    upsertOffering({
      offering: {
        id: "custom-topper",
        productId: " Cupcakes ",
        category: "add-on",
        label: "Custom topper",
        low: 12,
        high: 18
      }
    });

    expect(upsertById).toHaveBeenCalledWith("Offerings", expect.objectContaining({
      id: "custom-topper",
      productId: "cupcakes",
      label: "Custom topper"
    }));
  });

  it("uses all products when copied offering product ids are blank", () => {
    const upsertById = vi.fn();
    const upsertOffering = loadUpsertOffering(upsertById);

    upsertOffering({
      offering: {
        id: "custom-topper",
        productId: "   ",
        category: "add-on",
        label: "Custom topper",
        low: 12,
        high: 18
      }
    });

    expect(upsertById).toHaveBeenCalledWith("Offerings", expect.objectContaining({
      id: "custom-topper",
      productId: "all",
      label: "Custom topper"
    }));
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
