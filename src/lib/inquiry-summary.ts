import { business } from "@/content/business";
import type { PublicCatalog } from "./catalog";
import { addOns, calculateQuoteEstimate, cakeSizes, flavours, productBasePrices, quoteRangeLabel } from "./pricing";
import type { InquiryInput } from "./validation";

function titleCaseProduct(productType: InquiryInput["productType"], catalog?: PublicCatalog) {
  const normalizedProductType = normalizeCatalogId(productType);
  const product = catalog?.products.find((item) => normalizeCatalogId(item.id) === normalizedProductType);
  const label = (product?.label ?? productBasePrices[normalizedProductType]?.label ?? normalizedProductType).replace("Custom ", "");

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function normalizeCatalogId(value: string) {
  return value.trim().toLowerCase();
}

function labelFor<T extends { id: string; label: string }>(items: T[], id?: string) {
  if (!id) {
    return "Not selected";
  }

  const normalizedId = normalizeCatalogId(id);

  return items.find((item) => normalizeCatalogId(item.id) === normalizedId)?.label ?? "Not selected";
}

function labelsFor<T extends { id: string; label: string }>(items: T[], ids: string[]) {
  return ids
    .map((id) => labelFor(items, id))
    .filter((label) => label !== "Not selected");
}

export function buildInquirySummary(inquiry: InquiryInput, catalog?: PublicCatalog) {
  const estimate = calculateQuoteEstimate(inquiry, catalog);
  const selectedAddOns = labelsFor(catalog?.addOns ?? addOns, inquiry.addOnIds);
  const lines = [
    `${business.name} inquiry`,
    `Name: ${inquiry.name}`,
    `Email: ${inquiry.email}`,
    `Phone: ${inquiry.phone}`,
    `Pickup date: ${inquiry.eventDate}`,
    `Servings: ${inquiry.servings}`,
    `Product: ${titleCaseProduct(inquiry.productType, catalog)}`,
    ...(inquiry.productType === "cake"
      ? [`Cake size: ${labelFor(catalog?.cakeSizes ?? cakeSizes, inquiry.cakeSizeId)}`]
      : []),
    `Flavour: ${labelFor(catalog?.flavours ?? flavours, inquiry.flavourId)}`,
    ...(selectedAddOns.length > 0 ? [`Add-ons: ${selectedAddOns.join(", ")}`] : []),
    `Budget: ${inquiry.budget || "Not provided"}`,
    `Estimated range: ${quoteRangeLabel(estimate)}`,
    "",
    "Notes:",
    inquiry.message
  ];

  return lines.join("\n");
}
