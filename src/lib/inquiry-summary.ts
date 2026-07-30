import { business } from "@/content/business";
import type { PublicCatalog } from "./catalog";
import {
  calculateQuoteEstimate,
  cakeSizes,
  fillings,
  flavours,
  frostings,
  startingPriceLabel,
  toppings
} from "./pricing";
import { pickupTimeLabel, type InquiryInput } from "./validation";

type InquirySummaryInput = Omit<InquiryInput, "frostingId"> & {
  frostingId?: string;
};

function normalizeCatalogId(value: string) {
  return value.trim().toLowerCase();
}

function normalizeDisplayLabel(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function labelFor<T extends { id: string; label: string }>(items: T[], id?: string) {
  if (!id) return "Not selected";

  const normalizedId = normalizeCatalogId(id);
  const label = items.find((item) => normalizeCatalogId(item.id) === normalizedId)?.label;

  return label ? normalizeDisplayLabel(label) : "Not selected";
}

function labelsFor<T extends { id: string; label: string }>(items: T[], ids: string[]) {
  return ids
    .map((id) => labelFor(items, id))
    .filter((label) => label !== "Not selected");
}

export function buildInquirySummary(inquiry: InquirySummaryInput, catalog?: PublicCatalog) {
  const estimate = calculateQuoteEstimate(inquiry, {
    cakeSizes: catalog?.cakeSizes ?? cakeSizes,
    flavours: catalog?.flavours ?? flavours,
    frostings: catalog?.frostings ?? frostings,
    fillings: catalog?.fillings ?? fillings,
    toppings: catalog?.toppings ?? toppings
  });
  const selectedFillings = labelsFor(catalog?.fillings ?? fillings, inquiry.fillingIds);
  const selectedToppings = labelsFor(catalog?.toppings ?? toppings, inquiry.toppingIds);
  const lines = [
    `${business.name} inquiry`,
    `Name: ${inquiry.name}`,
    `Email: ${inquiry.email}`,
    `Phone: ${inquiry.phone}`,
    `Pickup date: ${inquiry.eventDate}`,
    `Pickup time: ${pickupTimeLabel(inquiry.pickupTime)}`,
    `Cake size: ${labelFor(catalog?.cakeSizes ?? cakeSizes, inquiry.cakeSizeId)}`,
    `Cake flavour: ${labelFor(catalog?.flavours ?? flavours, inquiry.flavourId)}`,
    ...(inquiry.frostingId
      ? [`Frosting flavour: ${labelFor(catalog?.frostings ?? frostings, inquiry.frostingId)}`]
      : ["Frosting flavour: Not recorded"]),
    ...(selectedFillings.length > 0 ? [`Fillings: ${selectedFillings.join(", ")}`] : []),
    ...(selectedToppings.length > 0 ? [`Toppings: ${selectedToppings.join(", ")}`] : []),
    `${startingPriceLabel(estimate)}`,
    "",
    "Payment policy:",
    business.depositPolicy,
    "",
    "Notes:",
    inquiry.message
  ];

  return lines.join("\n");
}
