import { business } from "@/content/business";
import type { PublicCatalog } from "./catalog";
import { calculateQuoteEstimate, cakeSizes, flavours, productBasePrices, quoteRangeLabel } from "./pricing";
import type { InquiryInput } from "./validation";

function titleCaseProduct(productType: InquiryInput["productType"], catalog?: PublicCatalog) {
  const product = catalog?.products.find((item) => item.id === productType);
  const label = (product?.label ?? productBasePrices[productType]?.label ?? productType).replace("Custom ", "");

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function labelFor<T extends { id: string; label: string }>(items: T[], id?: string) {
  return items.find((item) => item.id === id)?.label ?? "Not selected";
}

export function buildInquirySummary(inquiry: InquiryInput, catalog?: PublicCatalog) {
  const estimate = calculateQuoteEstimate(inquiry, catalog);
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
    `Budget: ${inquiry.budget || "Not provided"}`,
    `Estimated range: ${quoteRangeLabel(estimate)}`,
    "",
    "Notes:",
    inquiry.message
  ];

  return lines.join("\n");
}
