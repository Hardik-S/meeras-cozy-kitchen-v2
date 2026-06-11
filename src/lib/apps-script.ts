import { buildInquirySummary } from "./inquiry-summary";
import { defaultAdminData, type AdminData, type OfferingCategory, type OrderStatus } from "./catalog";
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
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  const secret = process.env.GOOGLE_APPS_SCRIPT_SECRET;

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

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function hasStringFields(value: Record<string, unknown>, fields: string[]) {
  return fields.every((field) => isString(value[field]));
}

function hasNumberFields(value: Record<string, unknown>, fields: string[]) {
  return fields.every((field) => isFiniteNumber(value[field]));
}

function isAdminSettings(value: unknown) {
  return isRecord(value)
    && hasStringFields(value, ["defaultSender", "defaultReceiver", "senderName", "chefNotificationCopy"]);
}

function isAdminProduct(value: unknown) {
  return isRecord(value)
    && hasStringFields(value, ["id", "label"])
    && hasNumberFields(value, ["low", "high", "sortOrder"])
    && isBoolean(value.enabled);
}

function isOfferingCategory(value: unknown): value is OfferingCategory {
  return value === "cake-size" || value === "flavour" || value === "add-on";
}

function isAdminOffering(value: unknown) {
  return isRecord(value)
    && hasStringFields(value, ["id", "productId", "label", "servings"])
    && isOfferingCategory(value.category)
    && hasNumberFields(value, ["low", "high", "sortOrder"])
    && isBoolean(value.enabled);
}

function isOrderStatus(value: unknown): value is OrderStatus {
  return value === "new"
    || value === "replied"
    || value === "confirmed"
    || value === "completed"
    || value === "cancelled";
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
    && (value.type === "income" || value.type === "expense")
    && hasNumberFields(value, ["amount", "quantity"]);
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
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
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

    return { status: "live", data: response.data };
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

  return response;
}
