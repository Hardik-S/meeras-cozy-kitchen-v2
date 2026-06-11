import { NextResponse } from "next/server";
import { listAdminDataFromAppsScript, submitInquiryToAppsScript } from "@/lib/apps-script";
import { getPublicCatalogFromAdminData } from "@/lib/catalog";
import { buildInquirySummary } from "@/lib/inquiry-summary";
import { sendInquiryEmail } from "@/lib/mail";
import { createInquirySchema } from "@/lib/validation";

const paymentEmail = "m.ssethi1123@gmail.com";

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
    ? undefined
    : getPublicCatalogFromAdminData(catalogResult.data);
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
