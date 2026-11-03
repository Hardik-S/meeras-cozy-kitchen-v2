import { NextResponse } from "next/server";
import { listAdminDataFromAppsScript, submitInquiryToAppsScript } from "@/lib/apps-script";
import { defaultPublicCatalog, getPublicCatalogFromAdminData, offeringsForProduct, type PublicCatalog } from "@/lib/catalog";
import { buildMultiInquirySummary } from "@/lib/inquiry-summary";
import { sendInquiryEmail } from "@/lib/mail";
import { calculateItemsEstimate } from "@/lib/pricing";
import { createMultiInquirySchema, type MultiInquiryInput } from "@/lib/validation";

const paymentEmail = "meerascozykitchen@gmail.com";

type CatalogIssueKey = string;

function validateCatalogSelections(inquiry: MultiInquiryInput, catalog: PublicCatalog) {
  const issues: Partial<Record<CatalogIssueKey, string[]>> = {};
  const ids = <T extends { id: string }>(items: T[]) => new Set(items.map((item) => item.id));
  inquiry.items.forEach((item, index) => {
    const prefix = `items.${index}`;
    const cakeSizeIds = ids(offeringsForProduct(catalog.cakeSizes, item.productId));
    const flavourIds = ids(offeringsForProduct(catalog.flavours, item.productId));
    const frostingIds = ids(offeringsForProduct(catalog.frostings, item.productId));
    const fillingIds = ids(offeringsForProduct(catalog.fillings, item.productId));
    const toppingIds = ids(offeringsForProduct(catalog.toppings, item.productId));
    if (item.productId === "cake" && !cakeSizeIds.has(item.cakeSizeId)) issues[prefix] = ["Please choose an available cake size."];
    if (!flavourIds.has(item.flavourId)) issues[prefix] = ["Please choose an available flavour."];
    if (!frostingIds.has(item.frostingId)) issues[prefix] = ["Please choose an available frosting."];
    if (item.fillingIds.some((id) => !fillingIds.has(id))) issues[prefix] = ["Please remove unavailable fillings and try again."];
    if (item.toppingIds.some((id) => !toppingIds.has(id))) issues[prefix] = ["Please remove unavailable toppings and try again."];
  });

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

  const parsed = createMultiInquirySchema().safeParse(payload);

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

  const summary = buildMultiInquirySummary(parsed.data, catalog);
  const estimate = calculateItemsEstimate(parsed.data.items, {
    products: catalog.products,
    cakeSizes: catalog.cakeSizes,
    flavours: catalog.flavours,
    frostings: catalog.frostings,
    fillings: catalog.fillings,
    toppings: catalog.toppings
  });
  const firstItem = parsed.data.items[0];
  const legacyPayload = {
    ...parsed.data,
    cakeSizeId: firstItem.cakeSizeId,
    flavourId: firstItem.flavourId,
    frostingId: firstItem.frostingId,
    fillingIds: firstItem.fillingIds,
    toppingIds: firstItem.toppingIds,
    message: firstItem.message,
    productType: firstItem.productId,
    estimateLow: estimate.low,
    estimateHigh: estimate.high
  };
  const appsScript = await submitInquiryToAppsScript(legacyPayload as never, summary);
  const email = appsScript.status === "sent"
    ? { status: "skipped", reason: "apps-script-sent" }
    : await sendInquiryEmail(legacyPayload as never, summary);

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
      productType: firstItem.productId,
      cakeSizeId: firstItem.cakeSizeId,
      flavourId: firstItem.flavourId,
      frostingId: firstItem.frostingId,
      fillingIds: firstItem.fillingIds,
      toppingIds: firstItem.toppingIds,
      message: firstItem.message,
      paymentEmail,
      summary
    }
  });
}
