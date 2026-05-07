import { NextResponse } from "next/server";
import { listAdminDataFromAppsScript } from "@/lib/apps-script";
import { defaultPublicCatalog, getPublicCatalogFromAdminData } from "@/lib/catalog";

export async function GET() {
  const result = await listAdminDataFromAppsScript();

  if (result.status === "error") {
    return NextResponse.json({
      ok: true,
      source: "fallback",
      catalog: defaultPublicCatalog,
      warning: result.message
    });
  }

  return NextResponse.json({
    ok: true,
    source: result.status,
    catalog: getPublicCatalogFromAdminData(result.data)
  });
}
