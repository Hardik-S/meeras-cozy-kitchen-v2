import { buildInquirySummary } from "./inquiry-summary";
import { defaultAdminData, type AdminData } from "./catalog";
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

  const body = await response.json().catch(() => ({}));

  if (!response.ok || body.ok === false) {
    throw new Error(typeof body.error === "string" ? body.error : "Apps Script request failed.");
  }

  return body as T;
}

export async function submitInquiryToAppsScript(inquiry: InquiryInput): Promise<AppsScriptSubmitResult> {
  try {
    const response = await postAppsScript<{ ok: true; orderId?: string }>("submitOrder", {
      inquiry,
      summary: buildInquirySummary(inquiry)
    });

    if (isSkippedResult(response)) {
      return response;
    }

    return { status: "sent", orderId: response.orderId };
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

  return response;
}
