import { NextResponse } from "next/server";
import { listAdminDataFromAppsScript, submitInquiryToAppsScript } from "@/lib/apps-script";
import { defaultPublicCatalog, getPublicCatalogFromAdminData, type PublicCatalog } from "@/lib/catalog";
import { buildInquirySummary } from "@/lib/inquiry-summary";
import { sendInquiryEmail } from "@/lib/mail";
import { createInquirySchema, type InquiryInput } from "@/lib/validation";

const paymentEmail = "meerascozykitchen@gmail.com";

type CatalogIssueKey = "cakeSizeId" | "flavourId" | "frostingId" | "fillingIds" | "toppingIds";

function validateCatalogSelections(inquiry: InquiryInput, catalog: PublicCatalog) {
  const issues: Partial<Record<CatalogIssueKey, string[]>> = {};
  const ids = <T extends { id: string }>(items: T[]) => new Set(items.map((item) => item.id));
  const cakeSizeIds = ids(catalog.cakeSizes);
  const flavourIds = ids(catalog.flavours);
  const frostingIds = ids(catalog.frostings);
  const fillingIds = ids(catalog.fillings);
  const toppingIds = ids(catalog.toppings);

  if (!cakeSizeIds.has(inquiry.cakeSizeId)) {
    issues.cakeSizeId = ["Please choose an available cake size."];
  }

  if (!flavourIds.has(inquiry.flavourId)) {
    issues.flavourId = ["Please choose an available flavour."];
  }

  if (!frostingIds.has(inquiry.frostingId)) {
    issues.frostingId = ["Please choose an available frosting."];
  }

  if (inquiry.fillingIds.some((id) => !fillingIds.has(id))) {
    issues.fillingIds = ["Please remove unavailable fillings and try again."];
  }

  if (inquiry.toppingIds.some((id) => !toppingIds.has(id))) {
    issues.toppingIds = ["Please remove unavailable toppings and try again."];
  }

  return issues;
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "inquiry" });
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = createInquirySchema().safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Please review the inquiry details.",
        issues: parsed.error.flatten().fieldErrors
      },
      { status: 400 }
    );
  }

  const catalogResult = await listAdminDataFromAppsScript();
  const catalog = catalogResult.status === "error"
    ? defaultPublicCatalog
    : getPublicCatalogFromAdminData(catalogResult.data);
  const catalogIssues = validateCatalogSelections(parsed.data, catalog);

  if (Object.keys(catalogIssues).length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "Please review the inquiry details.",
        issues: catalogIssues
      },
      { status: 400 }
    );
  }

  const summary = buildInquirySummary(parsed.data, catalog);
  const appsScript = await submitInquiryToAppsScript(parsed.data, summary);
  const email = appsScript.status === "sent"
    ? { status: "skipped", reason: "apps-script-sent" }
    : await sendInquiryEmail(parsed.data, summary);

  return NextResponse.json({
    ok: true,
    appsScript,
    email,
    summary,
    order: {
      id: appsScript.status === "sent" && appsScript.orderId ? appsScript.orderId : `pending_${Date.now()}`,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      eventDate: parsed.data.eventDate,
      pickupTime: parsed.data.pickupTime,
      productType: "cake",
      cakeSizeId: parsed.data.cakeSizeId,
      flavourId: parsed.data.flavourId,
      frostingId: parsed.data.frostingId,
      fillingIds: parsed.data.fillingIds,
      toppingIds: parsed.data.toppingIds,
      message: parsed.data.message,
      paymentEmail,
      summary
    }
  });
}
