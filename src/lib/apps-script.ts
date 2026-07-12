import { buildInquirySummary } from "./inquiry-summary";
import { defaultAdminData, type AdminData, type LedgerEntryType, type OfferingCategory, type OrderStatus } from "./catalog";
import { normalizeLedgerEntry } from "./finance";
import type { InquiryInput } from "./validation";

export type AppsScriptSkippedResult = { status: "skipped"; reason: "missing-env" };
export type AppsScriptSentResult = { status: "sent"; orderId?: string };
export type AppsScriptErrorResult = { status: "error"; message: string };
export type AppsScriptSubmitResult = AppsScriptSkippedResult | AppsScriptSentResult | AppsScriptErrorResult;

export type AppsScriptDataResult =
  | { status: "live"; data: AdminData }
  | { status: "fallback"; data: AdminData; reason: "missing-env" }
  | AppsScriptErrorResult;

function getAppsScriptConfig() {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL?.trim();
  const secret = process.env.GOOGLE_APPS_SCRIPT_SECRET?.trim();

  if (!url || !secret) {
    return undefined;
  }

  return { url, secret };
}

function isSkippedResult(value: unknown): value is AppsScriptSkippedResult {
  return Boolean(value && typeof value === "object" && "status" in value && value.status === "skipped");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isIntegerNumber(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function hasStringFields(value: Record<string, unknown>, fields: string[]) {
  return fields.every((field) => isString(value[field]));
}

function hasNonEmptyStringFields(value: Record<string, unknown>, fields: string[]) {
  return fields.every((field) => isString(value[field]) && value[field].trim().length > 0);
}

function hasNumberFields(value: Record<string, unknown>, fields: string[]) {
  return fields.every((field) => isFiniteNumber(value[field]));
}

function hasCatalogSortOrder(value: Record<string, unknown>) {
  return isIntegerNumber(value.sortOrder) && value.sortOrder >= 0;
}

function hasCatalogPriceRange(value: Record<string, unknown>) {
  return isFiniteNumber(value.low)
    && isFiniteNumber(value.high)
    && value.low >= 0
    && value.high >= 0
    && value.high >= value.low;
}

function isAdminSettings(value: unknown) {
  return isRecord(value)
    && hasStringFields(value, ["defaultSender", "defaultReceiver", "senderName", "chefNotificationCopy"]);
}

function isAdminProduct(value: unknown) {
  return isRecord(value)
    && hasNonEmptyStringFields(value, ["id", "label"])
    && hasCatalogPriceRange(value)
    && hasCatalogSortOrder(value)
    && isBoolean(value.enabled);
}

function normalizeOfferingCategory(value: unknown): OfferingCategory | undefined {
  if (!isString(value)) return undefined;

  const category = value.trim().toLowerCase();
  return category === "cake-size" || category === "flavour" || category === "add-on"
    ? category
    : undefined;
}

function normalizeCatalogProductId(value: string) {
  return value.trim().toLowerCase();
}

function normalizeAdminDisplayText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isOfferingCategory(value: unknown) {
  return normalizeOfferingCategory(value) !== undefined;
}

function normalizeLedgerEntryType(value: unknown): LedgerEntryType | undefined {
  if (!isString(value)) return undefined;

  const type = value.trim().toLowerCase();
  return type === "income" || type === "expense" ? type : undefined;
}

function isLedgerEntryType(value: unknown) {
  return normalizeLedgerEntryType(value) !== undefined;
}

function isAdminOffering(value: unknown) {
  return isRecord(value)
    && hasNonEmptyStringFields(value, ["id", "productId", "label"])
    && hasStringFields(value, ["servings"])
    && isOfferingCategory(value.category)
    && hasCatalogPriceRange(value)
    && hasCatalogSortOrder(value)
    && isBoolean(value.enabled);
}

function normalizeOrderStatus(value: unknown): OrderStatus | undefined {
  if (!isString(value)) return undefined;

  const status = value.trim().toLowerCase();
  return status === "new"
    || status === "replied"
    || status === "confirmed"
    || status === "completed"
    || status === "cancelled"
    ? status
    : undefined;
}

function isOrderStatus(value: unknown): value is OrderStatus {
  return normalizeOrderStatus(value) !== undefined;
}

function isAdminOrder(value: unknown) {
  return isRecord(value)
    && hasStringFields(value, [
      "id",
      "createdAt",
      "name",
      "email",
      "phone",
      "eventDate",
      "productType",
      "cakeSizeId",
      "flavourId",
      "budget",
      "message",
      "summary"
    ])
    && hasNumberFields(value, ["estimateLow", "estimateHigh"])
    && isOrderStatus(value.status)
    && isBoolean(value.hearted)
    && isBoolean(value.pinned);
}

function isLedgerEntry(value: unknown) {
  return isRecord(value)
    && hasStringFields(value, ["id", "date", "type", "category", "description", "orderId"])
    && isLedgerEntryType(value.type)
    && hasNumberFields(value, ["amount"])
    && (value.quantity === undefined || isFiniteNumber(value.quantity));
}

function isAdminData(value: unknown): value is AdminData {
  if (!isRecord(value)) {
    return false;
  }

  const data = value as Partial<AdminData>;

  return isAdminSettings(data.settings)
    && Array.isArray(data.products)
    && data.products.every(isAdminProduct)
    && Array.isArray(data.offerings)
    && data.offerings.every(isAdminOffering)
    && Array.isArray(data.orders)
    && data.orders.every(isAdminOrder)
    && Array.isArray(data.ledger)
    && data.ledger.every(isLedgerEntry);
}

function normalizeOrderId(value: unknown) {
  if (typeof value !== "string") return undefined;

  const orderId = value.trim().replace(/\s+/g, " ");
  return orderId ? orderId : undefined;
}

function normalizeAdminOffering(offering: AdminData["offerings"][number]): AdminData["offerings"][number] {
  return {
    ...offering,
    id: normalizeCatalogProductId(offering.id),
    productId: normalizeCatalogProductId(offering.productId),
    category: normalizeOfferingCategory(offering.category) ?? offering.category,
    label: normalizeAdminDisplayText(offering.label),
    servings: normalizeAdminDisplayText(offering.servings)
  };
}

function normalizeAdminProduct(product: AdminData["products"][number]): AdminData["products"][number] {
  return {
    ...product,
    id: normalizeCatalogProductId(product.id),
    label: normalizeAdminDisplayText(product.label)
  };
}

function normalizeAdminSettings(settings: AdminData["settings"]): AdminData["settings"] {
  return {
    defaultSender: settings.defaultSender.trim() || defaultAdminData.settings.defaultSender,
    defaultReceiver: settings.defaultReceiver.trim() || defaultAdminData.settings.defaultReceiver,
    senderName: settings.senderName.trim() || defaultAdminData.settings.senderName,
    chefNotificationCopy: settings.chefNotificationCopy.trim() || defaultAdminData.settings.chefNotificationCopy
  };
}

function normalizeEstimateRange(low: number, high: number) {
  const safeLow = low >= 0 ? low : 0;
  const safeHigh = high >= 0 ? high : 0;

  return {
    estimateLow: Math.min(safeLow, safeHigh),
    estimateHigh: Math.max(safeLow, safeHigh)
  };
}

function normalizeAdminOrder(order: AdminData["orders"][number]): AdminData["orders"][number] {
  const estimates = normalizeEstimateRange(order.estimateLow, order.estimateHigh);

  return {
    ...order,
    id: order.id.trim(),
    createdAt: order.createdAt.trim(),
    name: order.name.trim(),
    email: order.email.trim(),
    phone: order.phone.trim(),
    eventDate: order.eventDate.trim(),
    productType: normalizeCatalogProductId(order.productType),
    cakeSizeId: normalizeCatalogProductId(order.cakeSizeId),
    flavourId: normalizeCatalogProductId(order.flavourId),
    budget: order.budget.trim(),
    message: order.message.trim(),
    ...estimates,
    status: normalizeOrderStatus(order.status) ?? order.status,
    summary: order.summary.trim()
  };
}

function normalizeAdminData(data: AdminData): AdminData {
  return {
    ...data,
    settings: normalizeAdminSettings(data.settings),
    products: data.products.map(normalizeAdminProduct),
    offerings: data.offerings.map(normalizeAdminOffering),
    orders: data.orders.map(normalizeAdminOrder),
    ledger: data.ledger.map(normalizeLedgerEntry)
  };
}

function recordFromJson(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

export async function postAppsScript<T>(action: string, payload: Record<string, unknown> = {}): Promise<T | AppsScriptSkippedResult> {
  const config = getAppsScriptConfig();

  if (!config) {
    return { status: "skipped", reason: "missing-env" };
  }

  const response = await fetch(config.url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action,
      secret: config.secret,
      ...payload
    })
  });

  const body = recordFromJson(await response.json().catch(() => ({})));

  if (!response.ok || body.ok === false) {
    throw new Error(typeof body.error === "string" ? body.error : "Apps Script request failed.");
  }

  if (body.ok !== true) {
    throw new Error("Apps Script request failed.");
  }

  return body as T;
}

export async function submitInquiryToAppsScript(
  inquiry: InquiryInput,
  summary = buildInquirySummary(inquiry)
): Promise<AppsScriptSubmitResult> {
  try {
    const response = await postAppsScript<{ ok: true; orderId?: string }>("submitOrder", {
      inquiry,
      summary
    });

    if (isSkippedResult(response)) {
      return response;
    }

    return { status: "sent", orderId: normalizeOrderId(response.orderId) };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Apps Script submission failed."
    };
  }
}

export async function listAdminDataFromAppsScript(): Promise<AppsScriptDataResult> {
  try {
    const response = await postAppsScript<{ ok: true; data: AdminData }>("listAdminData");

    if (isSkippedResult(response)) {
      return { status: "fallback", data: defaultAdminData, reason: "missing-env" };
    }

    if (!isAdminData(response.data)) {
      throw new Error("Apps Script returned malformed admin data.");
    }

    return { status: "live", data: normalizeAdminData(response.data) };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Apps Script data request failed."
    };
  }
}

export async function mutateAdminDataInAppsScript(action: string, payload: Record<string, unknown>) {
  const response = await postAppsScript<{ ok: true; data?: AdminData; orderId?: string }>(action, payload);

  if (isSkippedResult(response)) {
    return response;
  }

  if ("data" in response && response.data !== undefined && !isAdminData(response.data)) {
    throw new Error("Apps Script returned malformed admin data.");
  }

  if ("data" in response && response.data !== undefined) {
    return { ...response, data: normalizeAdminData(response.data) };
  }

  return response;
}
