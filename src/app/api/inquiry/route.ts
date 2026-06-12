import { NextResponse } from "next/server";
import { listAdminDataFromAppsScript, submitInquiryToAppsScript } from "@/lib/apps-script";
import { defaultPublicCatalog, getPublicCatalogFromAdminData, type PublicCatalog } from "@/lib/catalog";
import { buildInquirySummary } from "@/lib/inquiry-summary";
import { sendInquiryEmail } from "@/lib/mail";
import { createInquirySchema, type InquiryInput } from "@/lib/validation";

const paymentEmail = "m.ssethi1123@gmail.com";

function validateCatalogSelections(inquiry: InquiryInput, catalog: PublicCatalog) {
  const issues: Partial<Record<"productType" | "cakeSizeId" | "flavourId" | "addOnIds", string[]>> = {};
  const isAvailableForProduct = (offering: { productId: string }) =>
    offering.productId === "all" || offering.productId === inquiry.productType;

  if (!catalog.products.some((product) => product.id === inquiry.productType)) {
    issues.productType = ["Please choose an available product."];
  }

  const availableCakeSizes = catalog.cakeSizes.filter(isAvailableForProduct);
  if (inquiry.productType === "cake" && !availableCakeSizes.some((size) => size.id === inquiry.cakeSizeId)) {
    issues.cakeSizeId = ["Please choose an available cake size."];
  }

  const availableFlavours = catalog.flavours.filter(isAvailableForProduct);
  if (!availableFlavours.some((flavour) => flavour.id === inquiry.flavourId)) {
    issues.flavourId = ["Please choose an available flavour."];
  }

  const availableAddOns = new Set(catalog.addOns.filter(isAvailableForProduct).map((addOn) => addOn.id));
  if (inquiry.addOnIds.some((addOnId) => !availableAddOns.has(addOnId))) {
    issues.addOnIds = ["Please remove unavailable add-ons and try again."];
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
      productType: parsed.data.productType,
      cakeSizeId: parsed.data.cakeSizeId ?? "",
      flavourId: parsed.data.flavourId ?? "",
      servings: parsed.data.servings,
      budget: parsed.data.budget,
      message: parsed.data.message,
      paymentEmail,
      summary
    }
  });
}
