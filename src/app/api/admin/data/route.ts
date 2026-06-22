import { NextResponse } from "next/server";
import { verifyAdminSessionToken } from "@/lib/admin-auth";
import { listAdminDataFromAppsScript, mutateAdminDataInAppsScript } from "@/lib/apps-script";

const allowedMutations = new Set([
  "updateSettings",
  "upsertProduct",
  "toggleProduct",
  "deleteProduct",
  "upsertOffering",
  "toggleOffering",
  "deleteOffering",
  "upsertLedgerEntry",
  "updateOrderFlags",
  "updateOrderStatus"
]);

const allowedOrderStatuses = new Set(["new", "replied", "confirmed", "completed", "cancelled"]);
const allowedLedgerEntryTypes = new Set(["income", "expense"]);

function recordFromJson(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function normalizeOrderStatus(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const status = value.trim();
  return allowedOrderStatuses.has(status) ? status : undefined;
}

function normalizeLedgerEntryType(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const type = value.trim();
  return allowedLedgerEntryTypes.has(type) ? type : undefined;
}

function sessionTokenFromRequest(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)meera_admin_session=([^;]+)/);

  if (!match) {
    return undefined;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return undefined;
  }
}

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Admin session required." }, { status: 401 });
}

function requireAdmin(request: Request) {
  return verifyAdminSessionToken(sessionTokenFromRequest(request));
}

export async function GET(request: Request) {
  if (!requireAdmin(request)) {
    return unauthorized();
  }

  const result = await listAdminDataFromAppsScript();

  if (result.status === "error") {
    return NextResponse.json({ ok: false, error: result.message }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    source: result.status,
    data: result.data
  });
}

export async function POST(request: Request) {
  if (!requireAdmin(request)) {
    return unauthorized();
  }

  const body = recordFromJson(await request.json().catch(() => ({})));
  const action = typeof body.action === "string" ? body.action : "";

  if (!allowedMutations.has(action)) {
    return NextResponse.json({ ok: false, error: "Unsupported admin action." }, { status: 400 });
  }

  const payload = recordFromJson(body.payload);

  if (action === "updateOrderStatus") {
    const status = normalizeOrderStatus(payload.status);

    if (!status) {
      return NextResponse.json({ ok: false, error: "Unsupported order status." }, { status: 400 });
    }

    payload.status = status;
  }

  if (action === "upsertLedgerEntry") {
    const entry = recordFromJson(payload.entry);

    if ("type" in entry) {
      const type = normalizeLedgerEntryType(entry.type);

      if (!type) {
        return NextResponse.json({ ok: false, error: "Unsupported ledger entry type." }, { status: 400 });
      }

      entry.type = type;
    }

    payload.entry = entry;
  }

  try {
    const result = await mutateAdminDataInAppsScript(action, payload);

    if ("status" in result && result.status === "skipped") {
      return NextResponse.json(
        { ok: false, error: "Google Apps Script is not configured.", reason: result.reason },
        { status: 503 }
      );
    }

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Admin mutation failed." },
      { status: 502 }
    );
  }
}
