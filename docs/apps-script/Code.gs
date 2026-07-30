/*
 * Meera's Cozy Kitchen admin backend.
 *
 * One-time setup:
 * 1. Create a Google Sheet for Meera's Cozy Kitchen admin data.
 * 2. Extensions -> Apps Script -> paste this whole file as Code.gs.
 * 3. Project Settings -> Script properties:
 *    - MEERA_SHARED_SECRET: same value as Vercel GOOGLE_APPS_SCRIPT_SECRET.
 *    - MEERA_SPREADSHEET_ID: optional if this script is not bound to the Sheet.
 * 4. Run setupMeeraCozyKitchen once and approve permissions.
 * 5. Deploy -> New deployment -> Web app.
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Put the /exec URL in Vercel as GOOGLE_APPS_SCRIPT_URL.
 *
 * Security note: the public site never receives the shared secret. Next.js server
 * routes add it before proxying requests to this script.
 */

const SETTINGS = {
  sharedSecretProperty: "MEERA_SHARED_SECRET",
  spreadsheetIdProperty: "MEERA_SPREADSHEET_ID",
  defaultEmail: "meerascozykitchen@gmail.com",
  senderName: "Meera's Cozy Kitchen"
};

const CATALOG_VERSION = "cake-frosting-flavours-v2";
const CONTACT_SETTINGS_VERSION = "canonical-contact-email-v1";
const PAYMENT_POLICY = "Do not send payment until Meera accepts your order and confirms the final price in writing. Once accepted, 50% of the confirmed final price is due by e-transfer within 48 hours. The remaining 50% is due at pickup and may be paid by e-transfer or cash.";

const SHEETS = {
  Settings: ["key", "value", "updatedAt"],
  Products: ["id", "label", "low", "high", "enabled", "sortOrder", "updatedAt"],
  Offerings: ["id", "productId", "category", "label", "low", "high", "servings", "enabled", "sortOrder", "updatedAt"],
  Orders: [
    "id", "createdAt", "name", "email", "phone", "eventDate", "productType", "cakeSizeId", "flavourId",
    "budget", "message", "estimateLow", "estimateHigh", "status", "hearted", "pinned", "summary",
    "pickupTime", "frostingId", "fillingIds", "toppingIds"
  ],
  Ledger: ["id", "date", "type", "category", "description", "amount", "orderId", "updatedAt", "quantity"],
  AuditLog: ["id", "createdAt", "action", "actor", "details"]
};

const DEFAULT_PRODUCTS = [
  { id: "cake", label: "Custom cake", low: 35, high: 75, enabled: true, sortOrder: 1 }
];

const DEFAULT_OFFERINGS = [
  { id: "four-inch", productId: "cake", category: "cake-size", label: "4-inch cake", low: 35, high: 35, servings: "", enabled: true, sortOrder: 1 },
  { id: "six-inch", productId: "cake", category: "cake-size", label: "6-inch cake", low: 60, high: 60, servings: "", enabled: true, sortOrder: 2 },
  { id: "eight-inch", productId: "cake", category: "cake-size", label: "8-inch cake", low: 75, high: 75, servings: "", enabled: true, sortOrder: 3 },
  { id: "chocolate", productId: "cake", category: "flavour", label: "Chocolate", low: 0, high: 0, servings: "", enabled: true, sortOrder: 1 },
  { id: "vanilla", productId: "cake", category: "flavour", label: "Vanilla", low: 0, high: 0, servings: "", enabled: true, sortOrder: 2 },
  { id: "almond", productId: "cake", category: "flavour", label: "Almond", low: 0, high: 0, servings: "", enabled: true, sortOrder: 3 },
  { id: "lemon", productId: "cake", category: "flavour", label: "Lemon", low: 0, high: 0, servings: "", enabled: true, sortOrder: 4 },
  { id: "coconut", productId: "cake", category: "flavour", label: "Coconut", low: 0, high: 0, servings: "", enabled: true, sortOrder: 5 },
  { id: "chocolate-frosting", productId: "cake", category: "frosting", label: "Chocolate", low: 0, high: 0, servings: "", enabled: true, sortOrder: 1 },
  { id: "vanilla-frosting", productId: "cake", category: "frosting", label: "Vanilla", low: 0, high: 0, servings: "", enabled: true, sortOrder: 2 },
  { id: "almond-frosting", productId: "cake", category: "frosting", label: "Almond", low: 0, high: 0, servings: "", enabled: true, sortOrder: 3 },
  { id: "lemon-frosting", productId: "cake", category: "frosting", label: "Lemon", low: 0, high: 0, servings: "", enabled: true, sortOrder: 4 },
  { id: "coconut-frosting", productId: "cake", category: "frosting", label: "Coconut", low: 0, high: 0, servings: "", enabled: true, sortOrder: 5 },
  { id: "oreo-crunch", productId: "cake", category: "frosting", label: "Oreo Crunch", low: 5, high: 5, servings: "", enabled: true, sortOrder: 6 },
  { id: "dark-chocolate-ganache", productId: "cake", category: "frosting", label: "Dark Chocolate Ganache", low: 10, high: 10, servings: "", enabled: true, sortOrder: 7 },
  { id: "white-chocolate-ganache", productId: "cake", category: "frosting", label: "White Chocolate Ganache", low: 10, high: 10, servings: "", enabled: true, sortOrder: 8 },
  { id: "raspberry-filling", productId: "cake", category: "filling", label: "Raspberry", low: 5, high: 5, servings: "", enabled: true, sortOrder: 1 },
  { id: "blueberry-filling", productId: "cake", category: "filling", label: "Blueberry", low: 5, high: 5, servings: "", enabled: true, sortOrder: 2 },
  { id: "cherry-filling", productId: "cake", category: "filling", label: "Cherry", low: 5, high: 5, servings: "", enabled: true, sortOrder: 3 },
  { id: "strawberry-filling", productId: "cake", category: "filling", label: "Strawberry", low: 5, high: 5, servings: "", enabled: true, sortOrder: 4 },
  { id: "apricot-filling", productId: "cake", category: "filling", label: "Apricot", low: 5, high: 5, servings: "", enabled: true, sortOrder: 5 },
  { id: "dark-chocolate-ganache-drip", productId: "cake", category: "topping", label: "Dark Chocolate Ganache Drip", low: 5, high: 5, servings: "", enabled: true, sortOrder: 1 },
  { id: "white-chocolate-ganache-drip", productId: "cake", category: "topping", label: "White Chocolate Ganache Drip", low: 5, high: 5, servings: "", enabled: true, sortOrder: 2 },
  { id: "fresh-raspberry", productId: "cake", category: "topping", label: "Fresh Raspberry", low: 5, high: 5, servings: "", enabled: true, sortOrder: 3 },
  { id: "fresh-blueberry", productId: "cake", category: "topping", label: "Fresh Blueberry", low: 5, high: 5, servings: "", enabled: true, sortOrder: 4 },
  { id: "fresh-strawberry", productId: "cake", category: "topping", label: "Fresh Strawberry", low: 5, high: 5, servings: "", enabled: true, sortOrder: 5 },
  { id: "chopped-pistachio", productId: "cake", category: "topping", label: "Chopped Pistachio", low: 5, high: 5, servings: "", enabled: true, sortOrder: 6 },
  { id: "chopped-almonds", productId: "cake", category: "topping", label: "Chopped Almonds", low: 5, high: 5, servings: "", enabled: true, sortOrder: 7 }
];

function doGet() {
  return jsonResponse({ ok: true, service: "meera-admin", message: "Use POST actions through the Next.js proxy." });
}

function doPost(e) {
  try {
    const payload = requirePostPayload(JSON.parse((e.postData && e.postData.contents) || "{}"));
    requireSecret(payload.secret);
    setupMeeraCozyKitchen();

    const actions = {
      submitOrder,
      listAdminData,
      updateSettings,
      upsertProduct,
      toggleProduct,
      deleteProduct,
      upsertOffering,
      toggleOffering,
      deleteOffering,
      upsertLedgerEntry,
      updateOrderFlags,
      updateOrderStatus
    };
    const handler = actions[payload.action];

    if (!handler) {
      throw new Error("Unsupported action: " + payload.action);
    }

    return jsonResponse(handler(payload));
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error && error.message ? error.message : error) }, 400);
  }
}

function requirePostPayload(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Unsupported request payload.");
  }
  return value;
}

function setupMeeraCozyKitchen() {
  const ss = spreadsheet();
  Object.keys(SHEETS).forEach(function(name) {
    ensureSheet(ss, name, SHEETS[name]);
  });
  seedSettings();
  seedProductsAndOfferings();
  migrateCakeCatalog();
  migrateCanonicalContactEmail();
  return { ok: true, data: listAdminData({}) .data };
}

function submitOrder(payload) {
  const inquiry = requireInquiryPayload(payload.inquiry);
  assertInquiryTextFields(inquiry);

  const id = makeId("ord");
  const now = nowIso();
  const estimate = estimateInquiry(inquiry);
  const summary = summaryTextOrDefault(payload.summary, buildSummary(inquiry, estimate));

  appendObject("Orders", {
    id,
    createdAt: now,
    name: cleanSingleLine(inquiry.name),
    email: cleanSingleLine(inquiry.email),
    phone: cleanSingleLine(inquiry.phone),
    eventDate: cleanSingleLine(inquiry.eventDate),
    productType: "cake",
    cakeSizeId: clean(inquiry.cakeSizeId),
    flavourId: clean(inquiry.flavourId),
    budget: "",
    message: clean(inquiry.message),
    estimateLow: estimate.low,
    estimateHigh: estimate.high,
    status: "new",
    hearted: false,
    pinned: false,
    summary,
    pickupTime: cleanSingleLine(inquiry.pickupTime),
    frostingId: clean(inquiry.frostingId),
    fillingIds: inquiry.fillingIds.join(","),
    toppingIds: inquiry.toppingIds.join(",")
  });
  sendInquiryEmails(inquiry, summary, id);
  audit("submitOrder", id);

  return { ok: true, orderId: id };
}

function requireInquiryPayload(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Unsupported inquiry payload.");
  }
  return value;
}

function summaryTextOrDefault(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value !== "string") {
    throw new Error("Unsupported inquiry summary.");
  }
  return clean(value);
}

function assertInquiryTextFields(inquiry) {
  [
    "name",
    "email",
    "phone",
    "eventDate",
    "pickupTime",
    "cakeSizeId",
    "flavourId",
    "frostingId",
    "message"
  ].forEach(function(key) {
    inquiryTextOrDefault(inquiry[key], "");
  });
  assertInquiryChoices(inquiry.fillingIds, "fillings");
  assertInquiryChoices(inquiry.toppingIds, "toppings");
}

function inquiryTextOrDefault(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value !== "string") {
    throw new Error("Unsupported inquiry text value.");
  }
  return clean(value);
}

function assertInquiryChoices(value, label) {
  if (!Array.isArray(value)) {
    throw new Error("Unsupported inquiry " + label + ".");
  }
  value.forEach(function(id) {
    if (typeof id !== "string") {
      throw new Error("Unsupported inquiry " + label + " value.");
    }
  });
}

function listAdminData() {
  return {
    ok: true,
    data: {
      settings: settingsObject(),
      products: readObjects("Products").map(function(row) {
        return {
          id: cleanSingleLine(row.id).toLowerCase(),
          label: cleanSingleLine(row.label),
          low: toNumber(row.low),
          high: toNumber(row.high),
          enabled: toBoolean(row.enabled),
          sortOrder: toNumber(row.sortOrder)
        };
      }),
      offerings: readObjects("Offerings").map(function(row) {
        return {
          id: cleanSingleLine(row.id).toLowerCase(),
          productId: cleanSingleLine(row.productId).toLowerCase(),
          category: cleanSingleLine(row.category).toLowerCase(),
          label: cleanSingleLine(row.label),
          low: toNumber(row.low),
          high: toNumber(row.high),
          servings: cleanSingleLine(row.servings),
          enabled: toBoolean(row.enabled),
          sortOrder: toNumber(row.sortOrder)
        };
      }),
      orders: readObjects("Orders").map(function(row) {
        const estimateLow = toNumber(row.estimateLow);
        const estimateHigh = toNumber(row.estimateHigh);
        return {
          id: cleanSingleLine(row.id),
          createdAt: cleanSingleLine(row.createdAt),
          name: cleanSingleLine(row.name),
          email: cleanSingleLine(row.email),
          phone: cleanSingleLine(row.phone),
          eventDate: cleanSingleLine(row.eventDate),
          pickupTime: cleanSingleLine(row.pickupTime),
          productType: clean(row.productType).toLowerCase(),
          cakeSizeId: clean(row.cakeSizeId).toLowerCase(),
          flavourId: clean(row.flavourId).toLowerCase(),
          frostingId: clean(row.frostingId).toLowerCase(),
          fillingIds: csvIds(row.fillingIds),
          toppingIds: csvIds(row.toppingIds),
          budget: cleanSingleLine(row.budget),
          message: cleanSingleLine(row.message),
          estimateLow: Math.min(estimateLow, estimateHigh),
          estimateHigh: Math.max(estimateLow, estimateHigh),
          status: clean(row.status).toLowerCase() || "new",
          hearted: toBoolean(row.hearted),
          pinned: toBoolean(row.pinned),
          summary: cleanSingleLine(row.summary)
        };
      }),
      ledger: readObjects("Ledger").map(function(row) {
        return {
          id: cleanSingleLine(row.id),
          date: cleanSingleLine(row.date),
          type: normalizeLedgerEntryType(row.type || "income"),
          category: cleanSingleLine(row.category),
          description: cleanSingleLine(row.description),
          amount: toNumber(row.amount),
          quantity: toPositiveNumber(row.quantity, 1),
          orderId: cleanSingleLine(row.orderId)
        };
      })
    }
  };
}

function updateSettings(payload) {
  const settings = payload.settings;
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    throw new Error("Unsupported settings payload.");
  }

  const allowed = ["defaultSender", "defaultReceiver", "senderName", "chefNotificationCopy"];
  assertSettingKeys(settings, allowed);
  allowed.forEach(function(key) {
    if (Object.prototype.hasOwnProperty.call(settings, key)) {
      assertSettingValue(settings[key]);
      setSetting(key, settingValueOrDefault(key, settings[key], settingDefaultValue(key)));
    }
  });
  audit("updateSettings", JSON.stringify(settings));
  return listAdminData();
}

function assertSettingValue(value) {
  if (typeof value !== "string") {
    throw new Error("Unsupported settings value.");
  }
}

function assertSettingKeys(settings, allowed) {
  Object.keys(settings).forEach(function(key) {
    if (allowed.indexOf(key) < 0) {
      throw new Error("Unsupported settings key.");
    }
  });
}

function settingValueOrDefault(key, value, fallback) {
  const normalized = key === "chefNotificationCopy" ? clean(value) : cleanSingleLine(value);
  return normalized || fallback;
}

function settingDefaultValue(key) {
  const defaults = {
    defaultSender: SETTINGS.defaultEmail,
    defaultReceiver: SETTINGS.defaultEmail,
    senderName: SETTINGS.senderName,
    chefNotificationCopy: "New bakery inquiry received. Reply from the admin dashboard or your inbox."
  };
  return defaults[key] || "";
}

function upsertProduct(payload) {
  const product = requireCatalogPayload(payload.product);
  const label = catalogRequiredText(product, "label");
  const id = catalogTextOrDefault(product, "id", label || "product");
  const enabled = catalogEnabledOrDefault(product, true);
  const low = assertCatalogPrice(product.low);
  const high = assertCatalogPrice(product.high);
  assertCatalogPriceRange(low, high);
  upsertById("Products", {
    id: slug(id),
    label: label,
    low: low,
    high: high,
    enabled: enabled,
    sortOrder: catalogSortOrderOrDefault(product, 99),
    updatedAt: nowIso()
  });
  audit("upsertProduct", id || label);
  return listAdminData();
}

function toggleProduct(payload) {
  const id = requireMutationId(payload.id);
  if (!isCatalogToggleValue(payload.enabled)) {
    throw new Error("Unsupported catalog toggle value.");
  }

  return patchByIdAndReturn("Products", id, { enabled: payload.enabled, updatedAt: nowIso() }, "toggleProduct");
}

function deleteProduct(payload) {
  const id = requireMutationId(payload.id);
  deleteById("Products", id);
  audit("deleteProduct", id);
  return listAdminData();
}

function upsertOffering(payload) {
  const offering = requireCatalogPayload(payload.offering);
  const id = catalogTextOrDefault(offering, "id", catalogTextOrDefault(offering, "label", "offering"));
  const label = catalogRequiredText(offering, "label");
  const enabled = catalogEnabledOrDefault(offering, true);
  const low = assertCatalogPrice(offering.low);
  const high = assertCatalogPrice(offering.high);
  assertCatalogPriceRange(low, high);
  upsertById("Offerings", {
    id: slug(id),
    productId: catalogProductIdOrDefault(offering, "productId", "all"),
    category: catalogCategoryOrDefault(offering, "topping"),
    label: label,
    low: low,
    high: high,
    servings: catalogTextOrDefault(offering, "servings", ""),
    enabled: enabled,
    sortOrder: catalogSortOrderOrDefault(offering, 99),
    updatedAt: nowIso()
  });
  audit("upsertOffering", id || label);
  return listAdminData();
}

function toggleOffering(payload) {
  const id = requireMutationId(payload.id);
  if (!isCatalogToggleValue(payload.enabled)) {
    throw new Error("Unsupported catalog toggle value.");
  }

  return patchByIdAndReturn("Offerings", id, { enabled: payload.enabled, updatedAt: nowIso() }, "toggleOffering");
}

function isCatalogToggleValue(value) {
  return value === true || value === false;
}

function assertCatalogPrice(value) {
  if (typeof value !== "number" || !isFinite(value) || value < 0) {
    throw new Error("Unsupported catalog price value.");
  }
  return value;
}

function assertCatalogPriceRange(low, high) {
  if (high < low) {
    throw new Error("Unsupported catalog price range.");
  }
}

function catalogTextOrDefault(row, key, fallback) {
  if (!Object.prototype.hasOwnProperty.call(row, key) || row[key] === undefined || row[key] === null || row[key] === "") {
    return fallback;
  }
  if (typeof row[key] !== "string") {
    throw new Error("Unsupported catalog text value.");
  }
  return cleanSingleLine(row[key]) || fallback;
}

function catalogRequiredText(row, key) {
  const text = catalogTextOrDefault(row, key, "");
  if (!text) {
    throw new Error("Unsupported catalog text value.");
  }
  return text;
}

function catalogCategoryOrDefault(row, fallback) {
  const category = catalogTextOrDefault(row, "category", fallback).toLowerCase();
  if (
    category !== "cake-size"
    && category !== "flavour"
    && category !== "frosting"
    && category !== "filling"
    && category !== "topping"
  ) {
    throw new Error("Unsupported catalog category.");
  }
  return category;
}

function catalogProductIdOrDefault(row, key, fallback) {
  return catalogTextOrDefault(row, key, fallback).toLowerCase();
}

function catalogSortOrderOrDefault(row, fallback) {
  if (!Object.prototype.hasOwnProperty.call(row, "sortOrder")) {
    return fallback;
  }
  if (typeof row.sortOrder !== "number" || !isFinite(row.sortOrder) || row.sortOrder % 1 !== 0 || row.sortOrder < 0) {
    throw new Error("Unsupported catalog sort order value.");
  }
  return row.sortOrder;
}

function catalogEnabledOrDefault(row, fallback) {
  if (!Object.prototype.hasOwnProperty.call(row, "enabled")) {
    return fallback;
  }
  if (!isCatalogToggleValue(row.enabled)) {
    throw new Error("Unsupported catalog enabled value.");
  }
  return row.enabled;
}

function requireCatalogPayload(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Unsupported catalog payload.");
  }
  return value;
}

function deleteOffering(payload) {
  const id = requireMutationId(payload.id);
  deleteById("Offerings", id);
  audit("deleteOffering", id);
  return listAdminData();
}

function upsertLedgerEntry(payload) {
  const entry = requireLedgerEntryPayload(payload.entry);
  const type = normalizeLedgerEntryType(entry.type || "income");
  if (!isLedgerEntryType(type)) {
    throw new Error("Unsupported ledger entry type.");
  }
  const amount = assertLedgerAmount(entry.amount);
  const quantity = Object.prototype.hasOwnProperty.call(entry, "quantity")
    ? ledgerQuantityOrDefault(entry.quantity)
    : 1;

  upsertById("Ledger", {
    id: ledgerTextOrDefault(entry.id, makeId("led")),
    date: ledgerTextOrDefault(entry.date, todayIso()),
    type: type,
    category: ledgerTextOrDefault(entry.category, "General"),
    description: ledgerTextOrDefault(entry.description, ""),
    amount: amount,
    quantity: quantity,
    orderId: ledgerTextOrDefault(entry.orderId, ""),
    updatedAt: nowIso()
  });
  audit("upsertLedgerEntry", entry.id || entry.description);
  return listAdminData();
}

function requireLedgerEntryPayload(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Unsupported ledger entry payload.");
  }
  return value;
}

function assertLedgerAmount(value) {
  if (typeof value !== "number" || !isFinite(value) || value < 0) {
    throw new Error("Unsupported ledger amount.");
  }
  return value;
}

function ledgerQuantityOrDefault(value) {
  if (typeof value !== "number" || !isFinite(value) || value % 1 !== 0 || value <= 0) {
    throw new Error("Unsupported ledger quantity.");
  }
  return value;
}

function ledgerTextOrDefault(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value !== "string") {
    throw new Error("Unsupported ledger text value.");
  }
  return clean(value);
}

function normalizeLedgerEntryType(value) {
  return clean(value).toLowerCase();
}

function isLedgerEntryType(value) {
  const type = normalizeLedgerEntryType(value);
  return type === "income" || type === "expense";
}

function updateOrderFlags(payload) {
  const id = requireMutationId(payload.id);
  if (!isOrderFlag(payload.hearted) || !isOrderFlag(payload.pinned)) {
    throw new Error("Unsupported order flag value.");
  }

  return patchByIdAndReturn("Orders", id, {
    hearted: payload.hearted,
    pinned: payload.pinned
  }, "updateOrderFlags");
}

function isOrderFlag(value) {
  return value === true || value === false;
}

function isOrderStatus(value) {
  const status = normalizeOrderStatus(value);
  return status === "new"
    || status === "replied"
    || status === "confirmed"
    || status === "completed"
    || status === "cancelled";
}

function normalizeOrderStatus(value) {
  return clean(value).toLowerCase();
}

function updateOrderStatus(payload) {
  const id = requireMutationId(payload.id);
  const status = normalizeOrderStatus(payload.status);
  if (!isOrderStatus(status)) {
    throw new Error("Unsupported order status.");
  }
  return patchByIdAndReturn("Orders", id, { status: status }, "updateOrderStatus");
}

function patchByIdAndReturn(sheetName, id, patch, action) {
  patchById(sheetName, id, patch);
  audit(action, id);
  return listAdminData();
}

function requireMutationId(value) {
  if (typeof value !== "string") {
    throw new Error("Unsupported admin target id.");
  }
  const id = clean(value);
  if (!id) {
    throw new Error("Unsupported admin target id.");
  }
  return id;
}

function seedSettings() {
  if (readObjects("Settings").length) return;
  setSetting("defaultSender", SETTINGS.defaultEmail);
  setSetting("defaultReceiver", SETTINGS.defaultEmail);
  setSetting("senderName", SETTINGS.senderName);
  setSetting("chefNotificationCopy", "New bakery inquiry received. Reply from the admin dashboard or your inbox.");
}

function seedProductsAndOfferings() {
  if (!readObjects("Products").length) {
    DEFAULT_PRODUCTS.forEach(function(product) {
      appendObject("Products", Object.assign({}, product, { updatedAt: nowIso() }));
    });
  }
  if (!readObjects("Offerings").length) {
    DEFAULT_OFFERINGS.forEach(function(offering) {
      appendObject("Offerings", Object.assign({}, offering, { updatedAt: nowIso() }));
    });
  }
}

function settingValue(key) {
  const row = readObjects("Settings").filter(function(item) {
    return clean(item.key) === key;
  })[0];
  return row ? clean(row.value) : "";
}

function migrateCanonicalContactEmail() {
  if (settingValue("contactSettingsVersion") === CONTACT_SETTINGS_VERSION) {
    return;
  }

  ["defaultSender", "defaultReceiver"].forEach(function(key) {
    if (settingValue(key)) {
      setSetting(key, SETTINGS.defaultEmail);
    }
  });
  setSetting("contactSettingsVersion", CONTACT_SETTINGS_VERSION);
  audit("migrateCanonicalContactEmail", CONTACT_SETTINGS_VERSION);
}

function migrateCakeCatalog() {
  const productIds = DEFAULT_PRODUCTS.map(function(item) { return item.id; });
  const offeringSignatures = DEFAULT_OFFERINGS.map(function(item) {
    return item.id + "\n" + item.category;
  });
  const hasEnabledNonCanonicalProduct = readObjects("Products").some(function(row) {
    return row.enabled === true && productIds.indexOf(clean(row.id).toLowerCase()) < 0;
  });
  const hasEnabledNonCanonicalOffering = readObjects("Offerings").some(function(row) {
    const signature = clean(row.id).toLowerCase() + "\n" + clean(row.category).toLowerCase();
    return row.enabled === true && offeringSignatures.indexOf(signature) < 0;
  });

  if (
    settingValue("catalogVersion") === CATALOG_VERSION
    && !hasEnabledNonCanonicalProduct
    && !hasEnabledNonCanonicalOffering
  ) {
    return;
  }

  const updatedAt = nowIso();

  readObjects("Products").forEach(function(row) {
    const id = clean(row.id).toLowerCase();
    if (id && row.enabled === true && productIds.indexOf(id) < 0) {
      patchCatalogRow("Products", id, "", { enabled: false, updatedAt: updatedAt });
    }
  });
  DEFAULT_PRODUCTS.forEach(function(product) {
    upsertById("Products", Object.assign({}, product, { updatedAt: updatedAt }));
  });

  readObjects("Offerings").forEach(function(row) {
    const id = clean(row.id).toLowerCase();
    const category = clean(row.category).toLowerCase();
    const signature = id + "\n" + category;
    if (id && row.enabled === true && offeringSignatures.indexOf(signature) < 0) {
      patchCatalogRow("Offerings", id, category, { enabled: false, updatedAt: updatedAt });
    }
  });
  DEFAULT_OFFERINGS.forEach(function(offering) {
    upsertById("Offerings", Object.assign({}, offering, { updatedAt: updatedAt }));
  });

  setSetting("catalogVersion", CATALOG_VERSION);
  audit("migrateCakeCatalog", CATALOG_VERSION);
}

function csvIds(value) {
  return clean(value).split(",").map(function(id) {
    return cleanSingleLine(id).toLowerCase();
  }).filter(function(id) {
    return id;
  });
}

function sendInquiryEmails(inquiry, summary, orderId) {
  const settings = settingsObject();
  const customerSubject = "We received your Meera's Cozy Kitchen inquiry";
  const chefSubject = "New Meera's Cozy Kitchen order inquiry: " + cleanSingleLine(inquiry.name);
  const paymentGuidance = summary.indexOf(PAYMENT_POLICY) >= 0 ? "" : "Payment policy:\n" + PAYMENT_POLICY + "\n\n";
  const customerBody = "Hi " + cleanSingleLine(inquiry.name) + ",\n\nThanks for your inquiry. Meera will review the details and reply soon.\n\n" + paymentGuidance + summary;
  const chefBody = settings.chefNotificationCopy + "\n\nOrder ID: " + orderId + "\n\n" + summary;

  sendMail(settings, cleanSingleLine(inquiry.email), customerSubject, customerBody, settings.defaultReceiver);
  sendMail(settings, settings.defaultReceiver, chefSubject, chefBody, cleanSingleLine(inquiry.email));
}

function sendMail(settings, to, subject, body, replyTo) {
  const sender = clean(settings.defaultSender);
  const aliases = GmailApp.getAliases();
  const options = {
    name: clean(settings.senderName || SETTINGS.senderName),
    replyTo: replyTo || settings.defaultReceiver
  };

  if (sender && aliases.indexOf(sender) >= 0) {
    GmailApp.sendEmail(to, subject, body, Object.assign({}, options, { from: sender }));
    return;
  }

  MailApp.sendEmail(to, subject, body, options);
}

function orderedPriceRange(row) {
  const low = toNumber(row.low);
  const high = toNumber(row.high);
  return {
    low: Math.min(low, high),
    high: Math.max(low, high)
  };
}

function estimateInquiry(inquiry) {
  const offerings = readObjects("Offerings");
  const cakeSizeId = clean(inquiry.cakeSizeId).toLowerCase();
  const selectedExtraIds = []
    .concat(inquiry.frostingId ? [inquiry.frostingId] : [])
    .concat(inquiry.fillingIds || [])
    .concat(inquiry.toppingIds || [])
    .map(function(id) { return clean(id).toLowerCase(); });
  const cakeSize = offerings.filter(function(row) {
    return clean(row.category).toLowerCase() === "cake-size"
      && clean(row.id).toLowerCase() === cakeSizeId;
  })[0];
  const baseRange = cakeSize ? orderedPriceRange(cakeSize) : { low: 0, high: 0 };
  let low = baseRange.low;
  let high = baseRange.high;
  selectedExtraIds.forEach(function(id) {
    const extra = offerings.filter(function(row) {
      const category = clean(row.category).toLowerCase();
      return (category === "frosting" || category === "filling" || category === "topping")
        && clean(row.id).toLowerCase() === id;
    })[0];
    if (extra) {
      const range = orderedPriceRange(extra);
      low += range.low;
      high += range.high;
    }
  });
  return { low, high };
}

function selectedOfferingLabel(id, category) {
  const offeringId = clean(id).toLowerCase();
  if (!offeringId) {
    return "";
  }

  const offering = readObjects("Offerings").filter(function(row) {
    return clean(row.id).toLowerCase() === offeringId
      && (!category || clean(row.category).toLowerCase() === category);
  })[0];

  return offering ? cleanSingleLine(offering.label || offeringId) : "";
}

function selectedOfferingLabels(ids, category) {
  return (ids || []).map(function(id) {
    return selectedOfferingLabel(id, category);
  }).filter(function(label) {
    return label;
  });
}

function buildSummary(inquiry, estimate) {
  const cakeSizeLabel = selectedOfferingLabel(inquiry.cakeSizeId, "cake-size");
  const flavourLabel = selectedOfferingLabel(inquiry.flavourId, "flavour");
  const frostingLabel = selectedOfferingLabel(inquiry.frostingId, "frosting");
  const fillingLabels = selectedOfferingLabels(inquiry.fillingIds, "filling");
  const toppingLabels = selectedOfferingLabels(inquiry.toppingIds, "topping");
  const lines = [
    "Meera's Cozy Kitchen inquiry",
    "Name: " + cleanSingleLine(inquiry.name),
    "Email: " + cleanSingleLine(inquiry.email),
    "Phone: " + cleanSingleLine(inquiry.phone),
    "Pickup date: " + cleanSingleLine(inquiry.eventDate),
    "Pickup time: " + cleanSingleLine(inquiry.pickupTime),
    "Cake size: " + cakeSizeLabel,
    "Cake flavour: " + flavourLabel,
    "Frosting flavour: " + (frostingLabel || "Not recorded"),
    "Starting price: $" + estimate.low,
    "",
    clean(inquiry.message)
  ];

  if (fillingLabels.length) {
    lines.splice(9, 0, "Fillings: " + fillingLabels.join(", "));
  }
  if (toppingLabels.length) {
    lines.splice(fillingLabels.length ? 10 : 9, 0, "Toppings: " + toppingLabels.join(", "));
  }

  return lines.join("\n");
}

function spreadsheet() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty(SETTINGS.spreadsheetIdProperty);
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function ensureSheet(ss, name, headers) {
  const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const current = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].filter(function(header) {
    return String(header).trim() !== "";
  });
  if (!current.length) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return sheet;
  }
  headers.forEach(function(header) {
    if (current.indexOf(header) < 0) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
    }
  });
  if (sheet.getFrozenRows() !== 1) {
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function readObjects(sheetName) {
  const sheet = spreadsheet().getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).filter(function(row) {
    return row.join("") !== "";
  }).map(function(row) {
    return headers.reduce(function(object, header, index) {
      object[header] = row[index];
      return object;
    }, {});
  });
}

function appendObject(sheetName, object) {
  const sheet = spreadsheet().getSheetByName(sheetName);
  const headers = SHEETS[sheetName];
  sheet.appendRow(headers.map(function(header) {
    return object[header] === undefined ? "" : object[header];
  }));
}

function upsertById(sheetName, object) {
  const sheet = spreadsheet().getSheetByName(sheetName);
  const headers = SHEETS[sheetName];
  const row = findRowById(sheetName, object.id);
  const values = headers.map(function(header) {
    return object[header] === undefined ? "" : object[header];
  });
  if (row > 0) {
    sheet.getRange(row, 1, 1, headers.length).setValues([values]);
  } else {
    sheet.appendRow(values);
  }
}

function patchById(sheetName, id, patch) {
  const sheet = spreadsheet().getSheetByName(sheetName);
  const headers = SHEETS[sheetName];
  const row = findRowById(sheetName, id);
  if (row < 1) throw new Error(sheetName + " row not found: " + id);
  const range = sheet.getRange(row, 1, 1, headers.length);
  const current = range.getValues()[0];
  const next = headers.map(function(header, index) {
    return Object.prototype.hasOwnProperty.call(patch, header) ? patch[header] : current[index];
  });
  range.setValues([next]);
}

function patchCatalogRow(sheetName, id, category, patch) {
  const sheet = spreadsheet().getSheetByName(sheetName);
  const headers = SHEETS[sheetName];
  const idIndex = headers.indexOf("id");
  const categoryIndex = headers.indexOf("category");
  const values = sheet.getDataRange().getValues();
  const normalizedId = clean(id).toLowerCase();
  const normalizedCategory = clean(category).toLowerCase();

  for (let index = 1; index < values.length; index += 1) {
    const rowId = clean(values[index][idIndex]).toLowerCase();
    const rowCategory = categoryIndex < 0 ? "" : clean(values[index][categoryIndex]).toLowerCase();
    if (rowId !== normalizedId || rowCategory !== normalizedCategory) continue;

    const next = headers.map(function(header, columnIndex) {
      return Object.prototype.hasOwnProperty.call(patch, header) ? patch[header] : values[index][columnIndex];
    });
    sheet.getRange(index + 1, 1, 1, headers.length).setValues([next]);
    return;
  }

  throw new Error(sheetName + " catalog row not found: " + id + " (" + category + ")");
}

function deleteById(sheetName, id) {
  const sheet = spreadsheet().getSheetByName(sheetName);
  const row = findRowById(sheetName, id);
  if (row > 0) {
    sheet.deleteRow(row);
  }
}

function findRowById(sheetName, id) {
  const sheet = spreadsheet().getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();
  for (let index = 1; index < values.length; index += 1) {
    if (String(values[index][0]) === String(id)) {
      return index + 1;
    }
  }
  return -1;
}

function settingsObject() {
  const defaults = {
    defaultSender: SETTINGS.defaultEmail,
    defaultReceiver: SETTINGS.defaultEmail,
    senderName: SETTINGS.senderName,
    chefNotificationCopy: "New bakery inquiry received. Reply from the admin dashboard or your inbox."
  };
  return readObjects("Settings").reduce(function(settings, row) {
    const key = clean(row.key);
    if (!Object.prototype.hasOwnProperty.call(settings, key)) {
      return settings;
    }
    settings[key] = settingValueOrDefault(key, row.value, defaults[key]);
    return settings;
  }, defaults);
}

function setSetting(key, value) {
  upsertById("Settings", { key, value, updatedAt: nowIso() });
}

function requireSecret(secret) {
  const expected = PropertiesService.getScriptProperties().getProperty(SETTINGS.sharedSecretProperty);
  if (!expected) {
    throw new Error("Missing script property " + SETTINGS.sharedSecretProperty);
  }
  if (String(secret) !== String(expected)) {
    throw new Error("Invalid shared secret.");
  }
}

function audit(action, details) {
  appendObject("AuditLog", {
    id: makeId("aud"),
    createdAt: nowIso(),
    action,
    actor: "next-proxy",
    details: clean(details)
  });
}

function jsonResponse(payload, statusCode) {
  const output = ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
  if (statusCode) {
    // Apps Script web apps do not expose custom HTTP status reliably to all callers.
    // The JSON ok/error contract is the source of truth for the Next.js proxy.
  }
  return output;
}

function makeId(prefix) {
  return prefix + "_" + Utilities.getUuid().slice(0, 8);
}

function nowIso() {
  return new Date().toISOString();
}

function todayIso() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function cleanSingleLine(value) {
  return clean(value).replace(/\s+/g, " ");
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toPositiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 && number % 1 === 0 ? number : fallback;
}

function toBoolean(value) {
  return value === true || value === "TRUE" || value === "true" || value === 1 || value === "1";
}

function slug(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
