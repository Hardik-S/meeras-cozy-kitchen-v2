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
const allowedSettingKeys = new Set(["defaultSender", "defaultReceiver", "senderName", "chefNotificationCopy"]);
const catalogToggleMutations = new Set(["toggleProduct", "toggleOffering"]);
const idRequiredMutations = new Set([
  "toggleProduct",
  "deleteProduct",
  "toggleOffering",
  "deleteOffering",
  "updateOrderFlags",
  "updateOrderStatus"
]);
const catalogUpsertPayloadKeys: Record<string, "product" | "offering"> = {
  upsertProduct: "product",
  upsertOffering: "offering"
};

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

function normalizeOrderFlag(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function normalizeCatalogToggle(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function normalizeMutationId(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const id = value.trim();
  return id ? id : undefined;
}

function normalizeOptionalCatalogEnabled(record: Record<string, unknown>) {
  if (!("enabled" in record)) {
    return undefined;
  }

  return normalizeCatalogToggle(record.enabled);
}

function hasUnsupportedSettingValue(settings: Record<string, unknown>) {
  return Object.entries(settings).some(([key, value]) => allowedSettingKeys.has(key) && typeof value !== "string");
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

  if (idRequiredMutations.has(action)) {
    const id = normalizeMutationId(payload.id);

    if (!id) {
      return NextResponse.json({ ok: false, error: "Unsupported admin target id." }, { status: 400 });
    }

    payload.id = id;
  }

  if (action === "updateSettings") {
    const settings = recordFromJson(payload.settings);

    if (hasUnsupportedSettingValue(settings)) {
      return NextResponse.json({ ok: false, error: "Unsupported settings value." }, { status: 400 });
    }

    payload.settings = settings;
  }

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

  if (action === "updateOrderFlags") {
    const hearted = normalizeOrderFlag(payload.hearted);
    const pinned = normalizeOrderFlag(payload.pinned);

    if (hearted === undefined || pinned === undefined) {
      return NextResponse.json({ ok: false, error: "Unsupported order flag value." }, { status: 400 });
    }

    payload.hearted = hearted;
    payload.pinned = pinned;
  }

  if (catalogToggleMutations.has(action)) {
    const enabled = normalizeCatalogToggle(payload.enabled);

    if (enabled === undefined) {
      return NextResponse.json({ ok: false, error: "Unsupported catalog toggle value." }, { status: 400 });
    }

    payload.enabled = enabled;
  }

  const catalogUpsertPayloadKey = catalogUpsertPayloadKeys[action];
  if (catalogUpsertPayloadKey) {
    const catalogRow = recordFromJson(payload[catalogUpsertPayloadKey]);
    const enabled = normalizeOptionalCatalogEnabled(catalogRow);

    if ("enabled" in catalogRow && enabled === undefined) {
      return NextResponse.json({ ok: false, error: "Unsupported catalog enabled value." }, { status: 400 });
    }

    if (enabled !== undefined) {
      catalogRow.enabled = enabled;
    }

    payload[catalogUpsertPayloadKey] = catalogRow;
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
