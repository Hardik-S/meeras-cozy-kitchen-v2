import { business } from "@/content/business";
import { calculateQuoteEstimate, cakeSizes, flavours, productBasePrices, quoteRangeLabel } from "./pricing";
import type { InquiryInput } from "./validation";

function titleCaseProduct(productType: InquiryInput["productType"]) {
  const label = (productBasePrices[productType]?.label ?? productType).replace("Custom ", "");

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function labelFor<T extends { id: string; label: string }>(items: T[], id?: string) {
  return items.find((item) => item.id === id)?.label ?? "Not selected";
}

export function buildInquirySummary(inquiry: InquiryInput) {
  const estimate = calculateQuoteEstimate(inquiry);
  const lines = [
    `${business.name} inquiry`,
    `Name: ${inquiry.name}`,
    `Email: ${inquiry.email}`,
    `Phone: ${inquiry.phone}`,
    `Pickup date: ${inquiry.eventDate}`,
    `Servings: ${inquiry.servings}`,
    `Product: ${titleCaseProduct(inquiry.productType)}`,
    `Cake size: ${labelFor(cakeSizes, inquiry.cakeSizeId)}`,
    `Flavour: ${labelFor(flavours, inquiry.flavourId)}`,
    `Budget: ${inquiry.budget || "Not provided"}`,
    `Estimated range: ${quoteRangeLabel(estimate)}`,
    "",
    "Notes:",
    inquiry.message
  ];

  return lines.join("\n");
}
