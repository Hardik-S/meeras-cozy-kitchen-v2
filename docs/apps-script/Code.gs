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
  defaultEmail: "batb4016@gmail.com",
  senderName: "Meera's Cozy Kitchen"
};

const SHEETS = {
  Settings: ["key", "value", "updatedAt"],
  Products: ["id", "label", "low", "high", "enabled", "sortOrder", "updatedAt"],
  Offerings: ["id", "productId", "category", "label", "low", "high", "servings", "enabled", "sortOrder", "updatedAt"],
  Orders: [
    "id", "createdAt", "name", "email", "phone", "eventDate", "productType", "cakeSizeId", "flavourId",
    "budget", "message", "estimateLow", "estimateHigh", "status", "hearted", "pinned", "summary"
  ],
  Ledger: ["id", "date", "type", "category", "description", "amount", "orderId", "updatedAt", "quantity"],
  AuditLog: ["id", "createdAt", "action", "actor", "details"]
};

const DEFAULT_PRODUCTS = [
  { id: "cake", label: "Custom cake", low: 58, high: 150, enabled: true, sortOrder: 1 },
  { id: "cupcakes", label: "Cupcake dozen", low: 34, high: 44, enabled: true, sortOrder: 2 },
  { id: "dessert-box", label: "Dessert box", low: 38, high: 48, enabled: true, sortOrder: 3 }
];

const DEFAULT_OFFERINGS = [
  { id: "six-inch", productId: "cake", category: "cake-size", label: "6 inch round cake", low: 58, high: 68, servings: "8-10", enabled: true, sortOrder: 1 },
  { id: "eight-inch", productId: "cake", category: "cake-size", label: "8 inch round cake", low: 88, high: 100, servings: "14-20", enabled: true, sortOrder: 2 },
  { id: "ten-inch", productId: "cake", category: "cake-size", label: "10 inch round cake", low: 128, high: 150, servings: "24-30", enabled: true, sortOrder: 3 },
  { id: "vanilla-rose", productId: "all", category: "flavour", label: "Vanilla rose", low: 0, high: 0, servings: "", enabled: true, sortOrder: 1 },
  { id: "chocolate-fudge", productId: "all", category: "flavour", label: "Chocolate fudge", low: 0, high: 0, servings: "", enabled: true, sortOrder: 2 },
  { id: "cardamom-pistachio", productId: "all", category: "flavour", label: "Cardamom pistachio", low: 0, high: 0, servings: "", enabled: true, sortOrder: 3 },
  { id: "lemon-raspberry", productId: "all", category: "flavour", label: "Lemon raspberry", low: 0, high: 0, servings: "", enabled: true, sortOrder: 4 },
  { id: "fresh-berries", productId: "all", category: "add-on", label: "Fresh berry finish", low: 10, high: 12, servings: "", enabled: true, sortOrder: 1 },
  { id: "fondant-name", productId: "all", category: "add-on", label: "Fondant name or age", low: 5, high: 8, servings: "", enabled: true, sortOrder: 2 },
  { id: "floral-piping", productId: "all", category: "add-on", label: "Floral piping", low: 12, high: 18, servings: "", enabled: true, sortOrder: 3 },
  { id: "premium-filling", productId: "all", category: "add-on", label: "Premium filling", low: 8, high: 14, servings: "", enabled: true, sortOrder: 4 }
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
    name: clean(inquiry.name),
    email: clean(inquiry.email),
    phone: clean(inquiry.phone),
    eventDate: clean(inquiry.eventDate),
    productType: clean(inquiry.productType),
    cakeSizeId: clean(inquiry.cakeSizeId),
    flavourId: clean(inquiry.flavourId),
    budget: clean(inquiry.budget),
    message: clean(inquiry.message),
    estimateLow: estimate.low,
    estimateHigh: estimate.high,
    status: "new",
    hearted: false,
    pinned: false,
    summary
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
    "productType",
    "cakeSizeId",
    "flavourId",
    "budget",
    "message"
  ].forEach(function(key) {
    inquiryTextOrDefault(inquiry[key], "");
  });
  assertInquiryAddOns(inquiry.addOnIds);
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

function assertInquiryAddOns(value) {
  if (value === undefined || value === null) {
    return;
  }
  if (!Array.isArray(value)) {
    throw new Error("Unsupported inquiry add-ons.");
  }
  value.forEach(function(id) {
    if (typeof id !== "string") {
      throw new Error("Unsupported inquiry add-on value.");
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
          id: row.id,
          label: row.label,
          low: toNumber(row.low),
          high: toNumber(row.high),
          enabled: toBoolean(row.enabled),
          sortOrder: toNumber(row.sortOrder)
        };
      }),
      offerings: readObjects("Offerings").map(function(row) {
        return {
          id: row.id,
          productId: row.productId,
          category: row.category,
          label: row.label,
          low: toNumber(row.low),
          high: toNumber(row.high),
          servings: row.servings,
          enabled: toBoolean(row.enabled),
          sortOrder: toNumber(row.sortOrder)
        };
      }),
      orders: readObjects("Orders").map(function(row) {
        return {
          id: row.id,
          createdAt: row.createdAt,
          name: row.name,
          email: row.email,
          phone: row.phone,
          eventDate: row.eventDate,
          productType: row.productType,
          cakeSizeId: row.cakeSizeId,
          flavourId: row.flavourId,
          budget: row.budget,
          message: row.message,
          estimateLow: toNumber(row.estimateLow),
          estimateHigh: toNumber(row.estimateHigh),
          status: clean(row.status) || "new",
          hearted: toBoolean(row.hearted),
          pinned: toBoolean(row.pinned),
          summary: row.summary
        };
      }),
      ledger: readObjects("Ledger").map(function(row) {
        return {
          id: clean(row.id),
          date: clean(row.date),
          type: clean(row.type),
          category: clean(row.category),
          description: clean(row.description),
          amount: toNumber(row.amount),
          quantity: toPositiveNumber(row.quantity, 1),
          orderId: clean(row.orderId)
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
      setSetting(key, clean(settings[key]));
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

function upsertProduct(payload) {
  const product = requireCatalogPayload(payload.product);
  const label = catalogTextOrDefault(product, "label", "");
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
  const label = catalogTextOrDefault(offering, "label", "");
  const enabled = catalogEnabledOrDefault(offering, true);
  const low = assertCatalogPrice(offering.low);
  const high = assertCatalogPrice(offering.high);
  assertCatalogPriceRange(low, high);
  upsertById("Offerings", {
    id: slug(id),
    productId: catalogProductIdOrDefault(offering, "productId", "all"),
    category: catalogCategoryOrDefault(offering, "add-on"),
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
  return clean(row[key]) || fallback;
}

function catalogCategoryOrDefault(row, fallback) {
  const category = catalogTextOrDefault(row, "category", fallback).toLowerCase();
  if (category !== "cake-size" && category !== "flavour" && category !== "add-on") {
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
  if (typeof row.sortOrder !== "number" || !isFinite(row.sortOrder) || row.sortOrder % 1 !== 0) {
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

function sendInquiryEmails(inquiry, summary, orderId) {
  const settings = settingsObject();
  const customerSubject = "We received your Meera's Cozy Kitchen inquiry";
  const chefSubject = "New Meera's Cozy Kitchen order inquiry: " + clean(inquiry.name);
  const customerBody = "Hi " + clean(inquiry.name) + ",\n\nThanks for your inquiry. Meera will review the details and reply soon.\n\n" + summary;
  const chefBody = settings.chefNotificationCopy + "\n\nOrder ID: " + orderId + "\n\n" + summary;

  sendMail(settings, clean(inquiry.email), customerSubject, customerBody, settings.defaultReceiver);
  sendMail(settings, settings.defaultReceiver, chefSubject, chefBody, clean(inquiry.email));
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

function estimateInquiry(inquiry) {
  const products = readObjects("Products");
  const offerings = readObjects("Offerings");
  const productType = clean(inquiry.productType).toLowerCase();
  const cakeSizeId = clean(inquiry.cakeSizeId);
  const addOnIds = (inquiry.addOnIds || []).map(function(id) { return clean(id); });
  const cakeSize = offerings.filter(function(row) { return clean(row.id) === cakeSizeId; })[0];
  const product = products.filter(function(row) { return clean(row.id).toLowerCase() === productType; })[0];
  const base = productType === "cake" && cakeSize ? cakeSize : product;
  let low = base ? toNumber(base.low) : 0;
  let high = base ? toNumber(base.high) : 0;
  addOnIds.forEach(function(id) {
    const addOn = offerings.filter(function(row) {
      const productId = clean(row.productId || "all").toLowerCase();
      return clean(row.id) === id && (productId === "all" || productId === productType);
    })[0];
    if (addOn) {
      low += toNumber(addOn.low);
      high += toNumber(addOn.high);
    }
  });
  return { low, high };
}

function buildSummary(inquiry, estimate) {
  return [
    "Meera's Cozy Kitchen inquiry",
    "Name: " + clean(inquiry.name),
    "Email: " + clean(inquiry.email),
    "Phone: " + clean(inquiry.phone),
    "Pickup date: " + clean(inquiry.eventDate),
    "Product: " + clean(inquiry.productType),
    "Budget: " + clean(inquiry.budget || "Not provided"),
    "Estimate: $" + estimate.low + "-$" + estimate.high,
    "",
    clean(inquiry.message)
  ].join("\n");
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
    settings[key] = clean(row.value) || defaults[key];
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

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toPositiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function toBoolean(value) {
  return value === true || value === "TRUE" || value === "true" || value === 1 || value === "1";
}

function slug(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
