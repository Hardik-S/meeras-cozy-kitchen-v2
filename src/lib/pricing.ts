export type ProductType = string;

export type PriceRange = {
  low: number;
  high: number;
};

export type CakeSize = PriceRange & {
  id: string;
  label: string;
  servings: string;
};

export type AddOn = PriceRange & {
  id: string;
  label: string;
  productId?: string;
};

export type QuoteInput = {
  productType: ProductType;
  cakeSizeId?: string;
  addOnIds?: string[];
};

export type QuoteLine = PriceRange & {
  label: string;
};

export type QuoteEstimate = PriceRange & {
  lines: QuoteLine[];
};

export const cakeSizes: CakeSize[] = [
  { id: "six-inch", label: "6 inch round cake", servings: "8-10", low: 58, high: 68 },
  { id: "eight-inch", label: "8 inch round cake", servings: "14-20", low: 88, high: 100 },
  { id: "ten-inch", label: "10 inch round cake", servings: "24-30", low: 128, high: 150 }
];

export const productBasePrices: Record<string, PriceRange & { label: string }> = {
  cake: { label: "Custom cake", low: 58, high: 150 },
  cupcakes: { label: "Cupcake dozen", low: 34, high: 44 },
  "dessert-box": { label: "Dessert box", low: 38, high: 48 }
};

export const flavours = [
  { id: "vanilla-rose", label: "Vanilla rose" },
  { id: "chocolate-fudge", label: "Chocolate fudge" },
  { id: "cardamom-pistachio", label: "Cardamom pistachio" },
  { id: "lemon-raspberry", label: "Lemon raspberry" }
];

export const addOns: AddOn[] = [
  { id: "fresh-berries", label: "Fresh berry finish", low: 10, high: 12 },
  { id: "fondant-name", label: "Fondant name or age", low: 5, high: 8 },
  { id: "floral-piping", label: "Floral piping", low: 12, high: 18 },
  { id: "premium-filling", label: "Premium filling", low: 8, high: 14 }
];

export const holdForLaterItems = [
  "Tiered cakes",
  "Wedding cakes",
  "Fresh cream cakes",
  "Custard fillings",
  "Cheesecake",
  "Delivery"
];

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0
  }).format(value);
}

function normalizeQuoteLine(line: QuoteLine): QuoteLine {
  return {
    ...line,
    low: Math.min(line.low, line.high),
    high: Math.max(line.low, line.high)
  };
}

function normalizeCatalogId(value: string) {
  return value.trim().toLowerCase();
}

function isScopedToProduct(item: { productId?: string }, productType: string) {
  if (!item.productId) {
    return true;
  }

  const normalizedProductId = normalizeCatalogId(item.productId);

  return normalizedProductId === "all" || normalizedProductId === productType;
}

export function calculateQuoteEstimate(
  input: QuoteInput,
  catalog?: {
    products?: Array<PriceRange & { id: string; label: string }>;
    cakeSizes?: Array<CakeSize | (PriceRange & { id: string; label: string; servings: string })>;
    addOns?: Array<AddOn | (PriceRange & { id: string; label: string; productId?: string })>;
  }
): QuoteEstimate {
  const lines: QuoteLine[] = [];
  const productType = normalizeCatalogId(input.productType);
  const cakeSizeId = input.cakeSizeId ? normalizeCatalogId(input.cakeSizeId) : undefined;
  const selectedCakeSize = cakeSizeId
    ? (catalog?.cakeSizes ?? cakeSizes).find((size) => size.id === cakeSizeId)
    : undefined;
  const selectedProduct = (catalog?.products ?? []).find((product) => product.id === productType);
  const base = productType === "cake" && selectedCakeSize
    ? selectedCakeSize
    : selectedProduct ?? productBasePrices[productType] ?? {
      label: productType,
      low: 0,
      high: 0
    };

  lines.push(normalizeQuoteLine({ label: base.label, low: base.low, high: base.high }));

  for (const addOnId of input.addOnIds ?? []) {
    const normalizedAddOnId = normalizeCatalogId(addOnId);
    const addOn = (catalog?.addOns ?? addOns).find((item) => item.id === normalizedAddOnId && isScopedToProduct(item, productType));
    if (addOn) {
      lines.push(normalizeQuoteLine({ label: addOn.label, low: addOn.low, high: addOn.high }));
    }
  }

  return lines.reduce<QuoteEstimate>(
    (estimate, line) => ({
      low: estimate.low + line.low,
      high: estimate.high + line.high,
      lines: [...estimate.lines, line]
    }),
    { low: 0, high: 0, lines: [] }
  );
}

export function quoteRangeLabel(estimate: PriceRange) {
  const low = Math.min(estimate.low, estimate.high);
  const high = Math.max(estimate.low, estimate.high);

  return `${formatCurrency(low)}-${formatCurrency(high)}`;
}
