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
    extractFunction(source, "orderedPriceRange"),
    extractFunction(source, "estimateInquiry"),
    "estimateInquiry"
  ].join("\n");

  return runInNewContext(script, { readObjects }) as (inquiry: {
    cakeSizeId?: string;
    frostingId?: string;
    fillingIds?: string[];
    toppingIds?: string[];
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
    extractFunction(source, "cleanSingleLine"),
    extractFunction(source, "toNumber"),
    extractFunction(source, "summaryTextOrDefault"),
    extractFunction(source, "inquiryTextOrDefault"),
    extractFunction(source, "assertInquiryChoices"),
    extractFunction(source, "requireInquiryPayload"),
    extractFunction(source, "assertInquiryTextFields"),
    extractFunction(source, "orderedPriceRange"),
    extractFunction(source, "estimateInquiry"),
    extractFunction(source, "selectedOfferingLabels"),
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
    "const SETTINGS = { defaultEmail: 'meerascozykitchen@gmail.com', senderName: \"Meera's Cozy Kitchen\" };",
    extractFunction(source, "clean"),
    extractFunction(source, "cleanSingleLine"),
    extractFunction(source, "settingValueOrDefault"),
    extractFunction(source, "settingDefaultValue"),
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

function loadSettingsObject(readObjects: (sheetName: string) => Array<Record<string, unknown>>) {
  const source = readFileSync(join(process.cwd(), "docs/apps-script/Code.gs"), "utf8");
  const script = [
    "const SETTINGS = { defaultEmail: 'meerascozykitchen@gmail.com', senderName: \"Meera's Cozy Kitchen\" };",
    extractFunction(source, "clean"),
    extractFunction(source, "cleanSingleLine"),
    extractFunction(source, "settingValueOrDefault"),
    extractFunction(source, "settingsObject"),
    "settingsObject"
  ].join("\n");

  return runInNewContext(script, { readObjects }) as () => Record<string, string>;
}

function loadSendInquiryEmails(sendMail: ReturnType<typeof vi.fn>) {
  const source = readFileSync(join(process.cwd(), "docs/apps-script/Code.gs"), "utf8");
  const script = [
    "const PAYMENT_POLICY = 'Do not send payment until Meera accepts your order and confirms the final price in writing. Once accepted, 50% of the confirmed final price is due by e-transfer within 48 hours. The remaining 50% is due at pickup and may be paid by e-transfer or cash.';",
    extractFunction(source, "clean"),
    extractFunction(source, "cleanSingleLine"),
    extractFunction(source, "sendInquiryEmails"),
    "sendInquiryEmails"
  ].join("\n");

  return runInNewContext(script, {
    settingsObject: vi.fn(() => ({
      defaultReceiver: "meerascozykitchen@gmail.com",
      chefNotificationCopy: "New bakery inquiry received."
    })),
    sendMail
  }) as (inquiry: { name: string; email: string }, summary: string, orderId: string) => void;
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

function loadListAdminData(readObjects: (sheetName: string) => Array<Record<string, unknown>>) {
  const source = readFileSync(join(process.cwd(), "docs/apps-script/Code.gs"), "utf8");
  const script = [
    extractFunction(source, "clean"),
    extractFunction(source, "cleanSingleLine"),
    extractFunction(source, "toNumber"),
    extractFunction(source, "toPositiveNumber"),
    extractFunction(source, "toBoolean"),
    extractFunction(source, "normalizeLedgerEntryType"),
    extractFunction(source, "orderedPriceRange"),
    extractFunction(source, "csvIds"),
    extractFunction(source, "listAdminData"),
    "listAdminData"
  ].join("\n");

  return runInNewContext(script, {
    readObjects,
    settingsObject: vi.fn(() => ({
      defaultSender: "meerascozykitchen@gmail.com",
      defaultReceiver: "meerascozykitchen@gmail.com",
      senderName: "Meera's Cozy Kitchen",
      chefNotificationCopy: "New bakery inquiry received."
    }))
  }) as () => {
    ok: true;
    data: {
      products: Array<Record<string, unknown>>;
      offerings: Array<Record<string, unknown>>;
      orders: Array<Record<string, unknown>>;
      ledger: Array<Record<string, unknown>>;
    };
  };
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
    extractFunction(source, "cleanSingleLine"),
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
    extractFunction(source, "cleanSingleLine"),
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

function extractConstDeclaration(source: string, name: string) {
  const start = source.indexOf(`const ${name} =`);
  if (start < 0) throw new Error(`Missing ${name}`);

  const end = source.indexOf(";", start);
  if (end < 0) throw new Error(`Unclosed ${name}`);

  return source.slice(start, end + 1);
}

function loadMigrateCakeCatalog({
  readObjects,
  patchById,
  upsertById,
  setSetting,
  audit
}: {
  readObjects: (sheetName: string) => Array<Record<string, unknown>>;
  patchById: ReturnType<typeof vi.fn>;
  upsertById: ReturnType<typeof vi.fn>;
  setSetting: ReturnType<typeof vi.fn>;
  audit: ReturnType<typeof vi.fn>;
}) {
  const source = readFileSync(join(process.cwd(), "docs/apps-script/Code.gs"), "utf8");
  const script = [
    extractConstDeclaration(source, "CATALOG_VERSION"),
    extractConstDeclaration(source, "DEFAULT_PRODUCTS"),
    extractConstDeclaration(source, "DEFAULT_OFFERINGS"),
    extractFunction(source, "clean"),
    extractFunction(source, "settingValue("),
    extractFunction(source, "migrateCakeCatalog"),
    "migrateCakeCatalog"
  ].join("\n");

  return runInNewContext(script, {
    readObjects,
    patchById,
    upsertById,
    setSetting,
    audit,
    nowIso: vi.fn(() => "2026-07-27T00:00:00.000Z")
  }) as () => void;
}

function loadMigrateCanonicalContactEmail({
  readObjects,
  setSetting,
  audit
}: {
  readObjects: (sheetName: string) => Array<Record<string, unknown>>;
  setSetting: ReturnType<typeof vi.fn>;
  audit: ReturnType<typeof vi.fn>;
}) {
  const source = readFileSync(join(process.cwd(), "docs/apps-script/Code.gs"), "utf8");
  const script = [
    "const SETTINGS = { defaultEmail: 'meerascozykitchen@gmail.com' };",
    "const CONTACT_SETTINGS_VERSION = 'canonical-contact-email-v1';",
    extractFunction(source, "clean"),
    extractFunction(source, "settingValue("),
    extractFunction(source, "migrateCanonicalContactEmail"),
    "migrateCanonicalContactEmail"
  ].join("\n");

  return runInNewContext(script, {
    readObjects,
    setSetting,
    audit
  }) as () => void;
}

describe("Apps Script Code.gs estimateInquiry", () => {
  it("matches copied cake option ids after trimming and normalizing them", () => {
    const estimateInquiry = loadEstimateInquiry((sheetName) => {
      if (sheetName === "Offerings") {
        return [
          { id: " eight-inch ", category: " cake-size ", low: 75, high: 75 },
          { id: " oreo-crunch ", category: " frosting ", low: 5, high: 5 },
          { id: " raspberry-filling ", category: " filling ", low: 5, high: 5 },
          { id: " fresh-strawberry ", category: " topping ", low: 5, high: 5 }
        ];
      }
      return [];
    });

    expect(estimateInquiry({
      cakeSizeId: " Eight-Inch ",
      frostingId: " Oreo-Crunch ",
      fillingIds: [" Raspberry-Filling "],
      toppingIds: [" Fresh-Strawberry "]
    })).toEqual({ low: 90, high: 90 });
  });

  it("ignores non-canonical offering categories inside option selections", () => {
    const estimateInquiry = loadEstimateInquiry((sheetName) => {
      if (sheetName === "Offerings") {
        return [
          { id: "six-inch", category: "cake-size", low: 60, high: 60 },
          { id: "vanilla", category: "flavour", low: 99, high: 99 },
          { id: "legacy-addon", category: "add-on", low: 99, high: 99 },
          { id: "fresh-blueberry", category: "topping", low: 5, high: 5 }
        ];
      }
      return [];
    });

    expect(estimateInquiry({
      cakeSizeId: "six-inch",
      fillingIds: ["vanilla", "legacy-addon"],
      toppingIds: ["fresh-blueberry"]
    })).toEqual({ low: 65, high: 65 });
  });

  it("orders copied Sheet ranges before totaling", () => {
    const estimateInquiry = loadEstimateInquiry((sheetName) => {
      if (sheetName === "Offerings") {
        return [
          { id: "sheet-eight-inch", category: "cake-size", low: 120, high: 95 },
          { id: "rush-topping", category: "topping", low: 15, high: 10 }
        ];
      }
      return [];
    });

    expect(estimateInquiry({
      cakeSizeId: "sheet-eight-inch",
      toppingIds: ["rush-topping"]
    })).toEqual({ low: 105, high: 135 });
  });
});

describe("Apps Script Code.gs cake catalog migration", () => {
  it("disables obsolete rows, upserts canonical rows, and records its version without deleting history", () => {
    const patchById = vi.fn();
    const upsertById = vi.fn();
    const setSetting = vi.fn();
    const audit = vi.fn();
    const migrateCakeCatalog = loadMigrateCakeCatalog({
      readObjects: (sheetName) => {
        if (sheetName === "Settings") return [];
        if (sheetName === "Products") return [{ id: "cake" }, { id: "cupcakes" }];
        if (sheetName === "Offerings") return [{ id: "four-inch" }, { id: "legacy-addon" }];
        return [];
      },
      patchById,
      upsertById,
      setSetting,
      audit
    });

    migrateCakeCatalog();

    expect(patchById).toHaveBeenCalledWith("Products", "cupcakes", expect.objectContaining({ enabled: false }));
    expect(patchById).toHaveBeenCalledWith("Offerings", "legacy-addon", expect.objectContaining({ enabled: false }));
    expect(upsertById).toHaveBeenCalledWith("Products", expect.objectContaining({ id: "cake", enabled: true }));
    expect(upsertById).toHaveBeenCalledWith("Offerings", expect.objectContaining({ id: "four-inch", enabled: true }));
    const upsertedFrostings = upsertById.mock.calls
      .filter(([sheetName, offering]) => sheetName === "Offerings" && offering.category === "frosting")
      .map(([, offering]) => ({
        id: offering.id,
        label: offering.label,
        low: offering.low,
        high: offering.high,
        sortOrder: offering.sortOrder
      }));

    expect(upsertedFrostings).toEqual([
      { id: "chocolate-frosting", label: "Chocolate", low: 0, high: 0, sortOrder: 1 },
      { id: "vanilla-frosting", label: "Vanilla", low: 0, high: 0, sortOrder: 2 },
      { id: "almond-frosting", label: "Almond", low: 0, high: 0, sortOrder: 3 },
      { id: "lemon-frosting", label: "Lemon", low: 0, high: 0, sortOrder: 4 },
      { id: "coconut-frosting", label: "Coconut", low: 0, high: 0, sortOrder: 5 },
      { id: "oreo-crunch", label: "Oreo Crunch", low: 5, high: 5, sortOrder: 6 },
      { id: "dark-chocolate-ganache", label: "Dark Chocolate Ganache", low: 10, high: 10, sortOrder: 7 },
      { id: "white-chocolate-ganache", label: "White Chocolate Ganache", low: 10, high: 10, sortOrder: 8 }
    ]);
    expect(setSetting).toHaveBeenCalledWith("catalogVersion", "cake-frosting-flavours-v2");
    expect(audit).toHaveBeenCalledWith("migrateCakeCatalog", "cake-frosting-flavours-v2");
  });

  it("is a no-op after the migration version is recorded", () => {
    const patchById = vi.fn();
    const upsertById = vi.fn();
    const setSetting = vi.fn();
    const audit = vi.fn();
    const migrateCakeCatalog = loadMigrateCakeCatalog({
      readObjects: (sheetName) => sheetName === "Settings"
        ? [{ key: "catalogVersion", value: "cake-frosting-flavours-v2" }]
        : [{ id: "legacy-row" }],
      patchById,
      upsertById,
      setSetting,
      audit
    });

    migrateCakeCatalog();

    expect(patchById).not.toHaveBeenCalled();
    expect(upsertById).not.toHaveBeenCalled();
    expect(setSetting).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });
});

describe("Apps Script Code.gs canonical contact migration", () => {
  it("updates populated sender and receiver rows and records its version", () => {
    const settings = [
      { key: "defaultSender", value: "legacy-sender@example.com" },
      { key: "defaultReceiver", value: "legacy-receiver@example.com" }
    ];
    const setSetting = vi.fn();
    const audit = vi.fn();
    const migrateCanonicalContactEmail = loadMigrateCanonicalContactEmail({
      readObjects: () => settings,
      setSetting,
      audit
    });

    migrateCanonicalContactEmail();

    expect(setSetting).toHaveBeenCalledWith("defaultSender", "meerascozykitchen@gmail.com");
    expect(setSetting).toHaveBeenCalledWith("defaultReceiver", "meerascozykitchen@gmail.com");
    expect(setSetting).toHaveBeenCalledWith("contactSettingsVersion", "canonical-contact-email-v1");
    expect(audit).toHaveBeenCalledWith("migrateCanonicalContactEmail", "canonical-contact-email-v1");
  });

  it("does not rewrite settings after the migration version is recorded", () => {
    const setSetting = vi.fn();
    const audit = vi.fn();
    const migrateCanonicalContactEmail = loadMigrateCanonicalContactEmail({
      readObjects: () => [
        { key: "contactSettingsVersion", value: "canonical-contact-email-v1" },
        { key: "defaultSender", value: "meerascozykitchen@gmail.com" },
        { key: "defaultReceiver", value: "meerascozykitchen@gmail.com" }
      ],
      setSetting,
      audit
    });

    migrateCanonicalContactEmail();

    expect(setSetting).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });
});

describe("Apps Script Code.gs customer inquiry email", () => {
  it("includes the exact payment policy when a legacy summary does not contain it", () => {
    const sendMail = vi.fn();
    const sendInquiryEmails = loadSendInquiryEmails(sendMail);

    sendInquiryEmails(
      { name: "Amina", email: "amina@example.com" },
      "Meera's Cozy Kitchen inquiry\nName: Amina",
      "ord_email_policy"
    );

    expect(sendMail).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      "amina@example.com",
      "We received your Meera's Cozy Kitchen inquiry",
      expect.stringContaining(
        "Do not send payment until Meera accepts your order and confirms the final price in writing. Once accepted, 50% of the confirmed final price is due by e-transfer within 48 hours. The remaining 50% is due at pickup and may be paid by e-transfer or cash."
      ),
      "meerascozykitchen@gmail.com"
    );
  });
});

describe("Apps Script Code.gs submitOrder", () => {
  const validInquiry = {
    name: "Amina",
    email: "amina@example.com",
    phone: "4165550101",
    eventDate: "2099-05-20",
    pickupTime: "12:00-14:00",
    cakeSizeId: "eight-inch",
    flavourId: "vanilla",
    frostingId: "oreo-crunch",
    fillingIds: ["raspberry-filling"],
    toppingIds: ["fresh-strawberry"],
    message: "Birthday cake with soft florals."
  };

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

    expect(() => submitOrder({ inquiry: { ...validInquiry, name: { copied: true } } }))
      .toThrow("Unsupported inquiry text value.");
    expect(appendObject).not.toHaveBeenCalled();
  });

  it("rejects non-string multi-select ids before appending order rows", () => {
    const appendObject = vi.fn();
    const submitOrder = loadSubmitOrder(appendObject);

    expect(() => submitOrder({
      inquiry: { ...validInquiry, fillingIds: [{ copied: true }] }
    }))
      .toThrow("Unsupported inquiry fillings value.");
    expect(appendObject).not.toHaveBeenCalled();
  });

  it("rejects non-string inquiry summaries before appending order rows", () => {
    const appendObject = vi.fn();
    const submitOrder = loadSubmitOrder(appendObject);

    expect(() => submitOrder({
      inquiry: validInquiry,
      summary: { copied: true }
    })).toThrow("Unsupported inquiry summary.");
    expect(appendObject).not.toHaveBeenCalled();
  });

  it("stores the cake-only contract while collapsing copied single-line fields", () => {
    const appendObject = vi.fn();
    const submitOrder = loadSubmitOrder(appendObject);

    submitOrder({
      inquiry: {
        ...validInquiry,
        name: " Amina\nMemo: redirected ",
        phone: " 416\n555 0101 ",
        pickupTime: " 12:00-14:00 ",
        frostingId: " Oreo-Crunch ",
        fillingIds: ["raspberry-filling", "apricot-filling"],
        toppingIds: ["fresh-strawberry"]
      }
    });

    expect(appendObject).toHaveBeenCalledWith(
      "Orders",
      expect.objectContaining({
        name: "Amina Memo: redirected",
        phone: "416 555 0101",
        pickupTime: "12:00-14:00",
        productType: "cake",
        budget: "",
        frostingId: "Oreo-Crunch",
        fillingIds: "raspberry-filling,apricot-filling",
        toppingIds: "fresh-strawberry",
        summary: expect.stringContaining("Name: Amina Memo: redirected")
      })
    );
    expect(appendObject.mock.calls[0][1].summary).toContain("Phone: 416 555 0101");
    expect(appendObject.mock.calls[0][1].summary).not.toContain("Budget:");
    expect(appendObject.mock.calls[0][1].summary).not.toContain("Servings:");
  });

  it("includes every selected Sheet-backed cake option in fallback summaries", () => {
    const appendObject = vi.fn();
    const submitOrder = loadSubmitOrder(appendObject, (sheetName) => {
      if (sheetName === "Offerings") {
        return [
          { id: "eight-inch", category: "cake-size", label: "8-inch cake", low: 75, high: 75 },
          { id: "vanilla", category: "flavour", label: "Vanilla", low: 0, high: 0 },
          { id: "oreo-crunch", category: "frosting", label: "Oreo Crunch", low: 5, high: 5 },
          { id: "raspberry-filling", category: "filling", label: "Raspberry", low: 5, high: 5 },
          { id: "fresh-strawberry", category: "topping", label: "Fresh Strawberry", low: 5, high: 5 }
        ];
      }
      return [];
    });

    submitOrder({
      inquiry: validInquiry
    });

    const summary = appendObject.mock.calls[0][1].summary;
    expect(summary).toContain("Pickup time: 12:00-14:00");
    expect(summary).toContain("Cake size: 8-inch cake");
    expect(summary).toContain("Cake flavour: Vanilla");
    expect(summary).toContain("Frosting flavour: Oreo Crunch");
    expect(summary).toContain("Fillings: Raspberry");
    expect(summary).toContain("Toppings: Fresh Strawberry");
    expect(summary).toContain("Starting price: $90");
  });

  it("keeps historical blank frosting values readable in fallback summaries", () => {
    const appendObject = vi.fn();
    const submitOrder = loadSubmitOrder(appendObject, (sheetName) => {
      if (sheetName === "Offerings") {
        return [
          { id: "eight-inch", category: "cake-size", label: "8-inch cake", low: 75, high: 75 },
          { id: "vanilla", category: "flavour", label: "Vanilla", low: 0, high: 0 }
        ];
      }
      return [];
    });

    submitOrder({
      inquiry: { ...validInquiry, frostingId: "" }
    });

    expect(appendObject.mock.calls[0][1].summary).toContain("Frosting flavour: Not recorded");
  });

  it("collapses copied Sheet-backed fallback labels", () => {
    const appendObject = vi.fn();
    const submitOrder = loadSubmitOrder(appendObject, (sheetName) => {
      if (sheetName === "Offerings") {
        return [
          { id: "eight-inch", category: "cake-size", label: " 8-inch\ncake ", low: 75, high: 75 },
          { id: "vanilla", category: "flavour", label: " Vanilla\nbean ", low: 0, high: 0 },
          { id: "oreo-crunch", category: "frosting", label: " Oreo\nCrunch ", low: 5, high: 5 },
          { id: "raspberry-filling", category: "filling", label: " Raspberry\nfilling ", low: 5, high: 5 },
          { id: "fresh-strawberry", category: "topping", label: " Fresh\nStrawberry ", low: 5, high: 5 }
        ];
      }
      return [];
    });

    submitOrder({ inquiry: validInquiry });

    const summary = appendObject.mock.calls[0][1].summary;
    expect(summary).toContain("Cake size: 8-inch cake");
    expect(summary).toContain("Cake flavour: Vanilla bean");
    expect(summary).toContain("Frosting flavour: Oreo Crunch");
    expect(summary).toContain("Fillings: Raspberry filling");
    expect(summary).toContain("Toppings: Fresh Strawberry");
    expect(summary).not.toContain("\nbean");
  });
});

describe("Apps Script Code.gs request payloads", () => {
  it.each([null, ["submitOrder"]])("rejects malformed top-level POST payloads", (payload) => {
    const requirePostPayload = loadRequirePostPayload();

    expect(() => requirePostPayload(payload)).toThrow("Unsupported request payload.");
  });
});

describe("Apps Script Code.gs listAdminData", () => {
  it("collapses copied Sheet catalog text before returning admin data", () => {
    const listAdminData = loadListAdminData((sheetName) => {
      if (sheetName === "Products") {
        return [{
          id: " Dessert-Box ",
          label: " Dessert\nbox ",
          low: 38,
          high: 48,
          enabled: true,
          sortOrder: 3
        }];
      }

      if (sheetName === "Offerings") {
        return [{
          id: " Gold-Leaf ",
          productId: " Dessert-Box ",
          category: " Add-On ",
          label: " Gold\nleaf finish ",
          low: 8,
          high: 12,
          servings: " 12\npieces ",
          enabled: true,
          sortOrder: 5
        }];
      }

      return [];
    });

    expect(listAdminData().data.products[0]).toMatchObject({
      id: "dessert-box",
      label: "Dessert box"
    });
    expect(listAdminData().data.offerings[0]).toMatchObject({
      id: "gold-leaf",
      productId: "dessert-box",
      category: "add-on",
      label: "Gold leaf finish",
      servings: "12 pieces"
    });
  });

  it("collapses copied Sheet order text before returning admin data", () => {
    const listAdminData = loadListAdminData((sheetName) => {
      if (sheetName === "Orders") {
        return [{
          id: " ord_copied\nMemo: hidden ",
          createdAt: " 2026-06-20T10:00:00.000Z ",
          name: " Amina\nKhan ",
          email: " amina@example.com ",
          phone: " 416\n555\n0101 ",
          eventDate: " 2026-06-28 ",
          productType: " Cake ",
          cakeSizeId: " Eight-Inch ",
          flavourId: " Vanilla-Rose ",
          budget: " 100-150\nflexible ",
          message: " Birthday cake\nwith soft florals. ",
          estimateLow: 125,
          estimateHigh: 95,
          status: " Confirmed ",
          hearted: false,
          pinned: false,
          summary: " Custom cake\ninquiry "
        }];
      }

      return [];
    });

    expect(listAdminData().data.orders[0]).toMatchObject({
      id: "ord_copied Memo: hidden",
      name: "Amina Khan",
      phone: "416 555 0101",
      productType: "cake",
      cakeSizeId: "eight-inch",
      flavourId: "vanilla-rose",
      budget: "100-150 flexible",
      message: "Birthday cake with soft florals.",
      estimateLow: 95,
      estimateHigh: 125,
      status: "confirmed",
      summary: "Custom cake inquiry"
    });
  });

  it("defaults fractional Sheet ledger quantities before returning admin data", () => {
    const listAdminData = loadListAdminData((sheetName) => {
      if (sheetName === "Ledger") {
        return [{
          id: "led_fractional",
          date: "2026-07-12",
          type: "expense",
          category: "Packaging",
          description: "Cake box",
          amount: 8,
          quantity: 1.5,
          orderId: ""
        }];
      }

      return [];
    });

    expect(listAdminData().data.ledger[0]).toMatchObject({
      id: "led_fractional",
      quantity: 1
    });
  });

  it("collapses copied Sheet ledger text before returning admin data", () => {
    const listAdminData = loadListAdminData((sheetName) => {
      if (sheetName === "Ledger") {
        return [{
          id: " led_copied\nMemo: hidden ",
          date: " 2026-07-12\nmanual ",
          type: " Income ",
          category: " Cake\nbalance ",
          description: " Paid\nby e-transfer ",
          amount: 80,
          quantity: 2,
          orderId: " ord_copied\nMemo: hidden "
        }];
      }

      return [];
    });

    expect(listAdminData().data.ledger[0]).toMatchObject({
      id: "led_copied Memo: hidden",
      date: "2026-07-12 manual",
      type: "income",
      category: "Cake balance",
      description: "Paid by e-transfer",
      orderId: "ord_copied Memo: hidden"
    });
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
  it("collapses copied notification routing settings before patching the sheet", () => {
    const setSetting = vi.fn();
    const updateSettings = loadUpdateSettings(setSetting);

    updateSettings({
      settings: {
        defaultSender: " bakery\nsender@example.com ",
        defaultReceiver: " meera\ninbox@example.com ",
        senderName: " Meera's\nCozy\tKitchen ",
        chefNotificationCopy: " New inquiry\nreceived. "
      }
    });

    expect(setSetting).toHaveBeenCalledWith("defaultSender", "bakery sender@example.com");
    expect(setSetting).toHaveBeenCalledWith("defaultReceiver", "meera inbox@example.com");
    expect(setSetting).toHaveBeenCalledWith("senderName", "Meera's Cozy Kitchen");
    expect(setSetting).toHaveBeenCalledWith("chefNotificationCopy", "New inquiry\nreceived.");
  });

  it("defaults blank copied notification settings before patching the sheet", () => {
    const setSetting = vi.fn();
    const updateSettings = loadUpdateSettings(setSetting);

    updateSettings({
      settings: {
        defaultSender: "   ",
        defaultReceiver: "\n\t",
        senderName: " ",
        chefNotificationCopy: "   "
      }
    });

    expect(setSetting).toHaveBeenCalledWith("defaultSender", "meerascozykitchen@gmail.com");
    expect(setSetting).toHaveBeenCalledWith("defaultReceiver", "meerascozykitchen@gmail.com");
    expect(setSetting).toHaveBeenCalledWith("senderName", "Meera's Cozy Kitchen");
    expect(setSetting).toHaveBeenCalledWith(
      "chefNotificationCopy",
      "New bakery inquiry received. Reply from the admin dashboard or your inbox."
    );
  });

  it("collapses copied notification routing settings before reading the sheet", () => {
    const settingsObject = loadSettingsObject(() => [
      { key: "defaultSender", value: " bakery\nsender@example.com " },
      { key: "defaultReceiver", value: " meera\ninbox@example.com " },
      { key: "senderName", value: " Meera's\nCozy\tKitchen " },
      { key: "chefNotificationCopy", value: " New inquiry\nreceived. " }
    ]);

    expect(settingsObject()).toMatchObject({
      defaultSender: "bakery sender@example.com",
      defaultReceiver: "meera inbox@example.com",
      senderName: "Meera's Cozy Kitchen",
      chefNotificationCopy: "New inquiry\nreceived."
    });
  });

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

  it("collapses copied offering serving notes before patching the sheet", () => {
    const upsertById = vi.fn();
    const upsertOffering = loadUpsertOffering(upsertById);

    upsertOffering({
      offering: {
        id: "tall-six",
        productId: "cake",
        category: "cake-size",
        label: "Tall six",
        low: 72,
        high: 84,
        servings: " 10-12\nservings "
      }
    });

    expect(upsertById).toHaveBeenCalledWith("Offerings", expect.objectContaining({
      id: "tall-six",
      servings: "10-12 servings"
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
      offering: { id: "floral-piping", label: "   ", category: "topping", low: 12, high: 18 }
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
        category: "decoration",
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
        category: " Topping ",
        label: "Custom topper",
        low: 12,
        high: 18
      }
    });

    expect(upsertById).toHaveBeenCalledWith("Offerings", expect.objectContaining({
      id: "custom-topper",
      category: "topping",
      label: "Custom topper"
    }));
  });

  it("normalizes copied offering product id casing before patching the sheet", () => {
    const upsertById = vi.fn();
    const upsertOffering = loadUpsertOffering(upsertById);

    upsertOffering({
      offering: {
        id: "custom-topper",
        productId: " Cake ",
        category: "topping",
        label: "Custom topper",
        low: 12,
        high: 18
      }
    });

    expect(upsertById).toHaveBeenCalledWith("Offerings", expect.objectContaining({
      id: "custom-topper",
      productId: "cake",
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
        category: "topping",
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
