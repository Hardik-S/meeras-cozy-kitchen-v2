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

  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";

  if (!allowedMutations.has(action)) {
    return NextResponse.json({ ok: false, error: "Unsupported admin action." }, { status: 400 });
  }

  try {
    const result = await mutateAdminDataInAppsScript(action, typeof body.payload === "object" && body.payload ? body.payload : {});

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
