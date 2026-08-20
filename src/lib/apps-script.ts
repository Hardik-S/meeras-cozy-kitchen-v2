import { buildInquirySummary } from "./inquiry-summary";
import { defaultAdminData, type AdminData, type LedgerEntryType, type OfferingCategory, type OrderStatus } from "./catalog";
import { normalizeLedgerEntry } from "./finance";
import {
  isReviewStatus,
  type AdminReview,
  type PublicReview,
  type ReviewStatus,
  type ReviewSubmission
} from "./reviews";
import type { InquiryInput } from "./validation";

export type AppsScriptSkippedResult = { status: "skipped"; reason: "missing-env" };
export type AppsScriptSentResult = { status: "sent"; orderId?: string };
export type AppsScriptErrorResult = { status: "error"; message: string };
export type AppsScriptSubmitResult = AppsScriptSkippedResult | AppsScriptSentResult | AppsScriptErrorResult;

export type AppsScriptReviewSubmitResult =
  | AppsScriptSkippedResult
  | {
    status: "sent";
    reviewId: string;
    notifications: { owner: boolean; reviewer: boolean };
  }
  | AppsScriptErrorResult;

export type AppsScriptPublicReviewsResult =
  | { status: "live"; reviews: PublicReview[] }
  | AppsScriptSkippedResult
  | AppsScriptErrorResult;

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
  return category === "cake-size"
    || category === "flavour"
    || category === "frosting"
    || category === "filling"
    || category === "topping"
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
    && hasCatalogPriceRange(value)
    && hasCatalogSortOrder(value)
    && isBoolean(value.enabled)
    && (value.enabled === false || isOfferingCategory(value.category));
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
      "message",
      "summary"
    ])
    && (value.pickupTime === undefined || isString(value.pickupTime))
    && (value.frostingId === undefined || isString(value.frostingId))
    && (value.fillingIds === undefined || (Array.isArray(value.fillingIds) && value.fillingIds.every(isString)))
    && (value.toppingIds === undefined || (Array.isArray(value.toppingIds) && value.toppingIds.every(isString)))
    && (value.budget === undefined || isString(value.budget))
    && (value.servings === undefined || isFiniteNumber(value.servings))
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
    && (value.quantity === undefined || (isIntegerNumber(value.quantity) && value.quantity > 0));
}

function isReviewRating(value: unknown): value is number {
  return isIntegerNumber(value) && value >= 1 && value <= 5;
}

function isAdminReview(value: unknown): value is AdminReview {
  return isRecord(value)
    && hasNonEmptyStringFields(value, ["id", "createdAt", "name", "email", "description"])
    && hasStringFields(value, ["publishedAt", "updatedAt"])
    && isReviewRating(value.rating)
    && isReviewStatus(value.status);
}

function isPublicReview(value: unknown): value is PublicReview {
  return isRecord(value)
    && !("email" in value)
    && hasNonEmptyStringFields(value, ["id", "createdAt", "name", "description"])
    && isReviewRating(value.rating);
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
    && data.ledger.every(isLedgerEntry)
    && Array.isArray(data.reviews)
    && data.reviews.every(isAdminReview);
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
    category: normalizeOfferingCategory(offering.category) ?? "topping",
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
  const normalizeSingleLineSetting = (value: string, fallback: string) =>
    normalizeAdminDisplayText(value) || fallback;

  return {
    defaultSender: normalizeSingleLineSetting(settings.defaultSender, defaultAdminData.settings.defaultSender),
    defaultReceiver: normalizeSingleLineSetting(settings.defaultReceiver, defaultAdminData.settings.defaultReceiver),
    senderName: normalizeSingleLineSetting(settings.senderName, defaultAdminData.settings.senderName),
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
    id: normalizeAdminDisplayText(order.id),
    createdAt: order.createdAt.trim(),
    name: normalizeAdminDisplayText(order.name),
    email: normalizeAdminDisplayText(order.email),
    phone: normalizeAdminDisplayText(order.phone),
    eventDate: order.eventDate.trim(),
    pickupTime: normalizeAdminDisplayText(order.pickupTime || ""),
    productType: normalizeCatalogProductId(order.productType),
    cakeSizeId: normalizeCatalogProductId(order.cakeSizeId),
    flavourId: normalizeCatalogProductId(order.flavourId),
    frostingId: normalizeCatalogProductId(order.frostingId || ""),
    fillingIds: (order.fillingIds || []).map(normalizeCatalogProductId),
    toppingIds: (order.toppingIds || []).map(normalizeCatalogProductId),
    budget: normalizeAdminDisplayText(order.budget || ""),
    message: normalizeAdminDisplayText(order.message),
    ...estimates,
    status: normalizeOrderStatus(order.status) ?? order.status,
    summary: normalizeAdminDisplayText(order.summary)
  };
}

function normalizeReviewStatus(value: string): ReviewStatus {
  return value.trim().toLowerCase() as ReviewStatus;
}

function normalizeAdminReview(review: AdminReview): AdminReview {
  return {
    ...review,
    id: normalizeAdminDisplayText(review.id),
    createdAt: review.createdAt.trim(),
    name: normalizeAdminDisplayText(review.name),
    email: review.email.trim().toLowerCase(),
    description: review.description.trim(),
    status: normalizeReviewStatus(review.status),
    publishedAt: review.publishedAt.trim(),
    updatedAt: review.updatedAt.trim()
  };
}

function normalizePublicReview(review: PublicReview): PublicReview {
  return {
    id: normalizeAdminDisplayText(review.id),
    createdAt: review.createdAt.trim(),
    name: normalizeAdminDisplayText(review.name),
    rating: review.rating,
    description: review.description.trim()
  };
}

function normalizeAdminData(data: AdminData): AdminData {
  return {
    ...data,
    settings: normalizeAdminSettings(data.settings),
    products: data.products.map(normalizeAdminProduct),
    offerings: data.offerings.map(normalizeAdminOffering),
    orders: data.orders.map(normalizeAdminOrder),
    ledger: data.ledger.map(normalizeLedgerEntry),
    reviews: data.reviews.map(normalizeAdminReview)
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

export async function submitReviewToAppsScript(review: ReviewSubmission): Promise<AppsScriptReviewSubmitResult> {
  try {
    const response = await postAppsScript<{
      ok: true;
      reviewId?: string;
      notifications?: { owner?: boolean; reviewer?: boolean };
    }>("submitReview", { review });

    if (isSkippedResult(response)) {
      return response;
    }

    const reviewId = normalizeOrderId(response.reviewId);
    if (!reviewId) {
      throw new Error("Apps Script returned a malformed review id.");
    }

    return {
      status: "sent",
      reviewId,
      notifications: {
        owner: response.notifications?.owner === true,
        reviewer: response.notifications?.reviewer === true
      }
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Review submission failed."
    };
  }
}

export async function listPublicReviewsFromAppsScript(): Promise<AppsScriptPublicReviewsResult> {
  try {
    const response = await postAppsScript<{ ok: true; reviews: PublicReview[] }>("listPublicReviews");

    if (isSkippedResult(response)) {
      return response;
    }

    if (!Array.isArray(response.reviews) || !response.reviews.every(isPublicReview)) {
      throw new Error("Apps Script returned malformed public reviews.");
    }

    return { status: "live", reviews: response.reviews.map(normalizePublicReview) };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Published reviews could not be loaded."
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
