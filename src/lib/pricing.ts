export type ProductType = string;

export type PriceRange = {
  low: number;
  high: number;
};

export type CakeSize = PriceRange & {
  id: string;
  label: string;
};

export type CakeOption = PriceRange & {
  id: string;
  label: string;
  productId?: string;
};

export type QuoteInput = {
  cakeSizeId?: string;
  flavourId?: string;
  frostingId?: string;
  fillingIds?: string[];
  toppingIds?: string[];
};

export type QuoteLine = PriceRange & {
  label: string;
  kind: "size" | "included" | "extra";
};

export type QuoteEstimate = PriceRange & {
  lines: QuoteLine[];
};

export const cakeSizes: CakeSize[] = [
  { id: "four-inch", label: "4-inch cake", low: 35, high: 35 },
  { id: "six-inch", label: "6-inch cake", low: 60, high: 60 },
  { id: "eight-inch", label: "8-inch cake", low: 75, high: 75 }
];

export const productBasePrices: Record<string, PriceRange & { label: string }> = {
  cake: { label: "Custom cake", low: 35, high: 75 }
};

export const flavours: CakeOption[] = [
  { id: "chocolate", label: "Chocolate", low: 0, high: 0 },
  { id: "vanilla", label: "Vanilla", low: 0, high: 0 },
  { id: "almond", label: "Almond", low: 0, high: 0 },
  { id: "lemon", label: "Lemon", low: 0, high: 0 },
  { id: "coconut", label: "Coconut", low: 0, high: 0 }
];

export const frostings: CakeOption[] = [
  { id: "chocolate-frosting", label: "Chocolate", low: 0, high: 0 },
  { id: "vanilla-frosting", label: "Vanilla", low: 0, high: 0 },
  { id: "almond-frosting", label: "Almond", low: 0, high: 0 },
  { id: "lemon-frosting", label: "Lemon", low: 0, high: 0 },
  { id: "coconut-frosting", label: "Coconut", low: 0, high: 0 },
  { id: "oreo-crunch", label: "Oreo Crunch", low: 5, high: 5 },
  { id: "dark-chocolate-ganache", label: "Dark Chocolate Ganache", low: 10, high: 10 },
  { id: "white-chocolate-ganache", label: "White Chocolate Ganache", low: 10, high: 10 }
];

export const fillings: CakeOption[] = [
  { id: "raspberry-filling", label: "Raspberry", low: 5, high: 5 },
  { id: "blueberry-filling", label: "Blueberry", low: 5, high: 5 },
  { id: "cherry-filling", label: "Cherry", low: 5, high: 5 },
  { id: "strawberry-filling", label: "Strawberry", low: 5, high: 5 },
  { id: "apricot-filling", label: "Apricot", low: 5, high: 5 }
];

export const toppings: CakeOption[] = [
  { id: "dark-chocolate-ganache-drip", label: "Dark Chocolate Ganache Drip", low: 5, high: 5 },
  { id: "white-chocolate-ganache-drip", label: "White Chocolate Ganache Drip", low: 5, high: 5 },
  { id: "fresh-raspberry", label: "Fresh Raspberry", low: 5, high: 5 },
  { id: "fresh-blueberry", label: "Fresh Blueberry", low: 5, high: 5 },
  { id: "fresh-strawberry", label: "Fresh Strawberry", low: 5, high: 5 },
  { id: "chopped-pistachio", label: "Chopped Pistachio", low: 5, high: 5 },
  { id: "chopped-almonds", label: "Chopped Almonds", low: 5, high: 5 }
];

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0
  }).format(value);
}

function normalizeCatalogId(value: string) {
  return value.trim().toLowerCase();
}

function findOption<T extends { id: string }>(items: T[], id?: string) {
  if (!id) return undefined;

  const normalizedId = normalizeCatalogId(id);
  return items.find((item) => normalizeCatalogId(item.id) === normalizedId);
}

function normalizeQuoteLine(line: QuoteLine): QuoteLine {
  return {
    ...line,
    label: line.label.replace(/\s+/g, " ").trim(),
    low: Math.min(line.low, line.high),
    high: Math.max(line.low, line.high)
  };
}

export function calculateQuoteEstimate(
  input: QuoteInput,
  catalog?: {
    cakeSizes?: CakeSize[];
    flavours?: CakeOption[];
    frostings?: CakeOption[];
    fillings?: CakeOption[];
    toppings?: CakeOption[];
  }
): QuoteEstimate {
  const lines: QuoteLine[] = [];
  const selectedSize = findOption(catalog?.cakeSizes ?? cakeSizes, input.cakeSizeId);
  const selectedFlavour = findOption(catalog?.flavours ?? flavours, input.flavourId);
  const selectedFrosting = findOption(catalog?.frostings ?? frostings, input.frostingId);

  if (selectedSize) {
    lines.push(normalizeQuoteLine({ ...selectedSize, kind: "size" }));
  }

  if (selectedFlavour) {
    lines.push(normalizeQuoteLine({ ...selectedFlavour, kind: "included" }));
  }

  if (selectedFrosting) {
    lines.push(normalizeQuoteLine({
      ...selectedFrosting,
      kind: selectedFrosting.low === 0 && selectedFrosting.high === 0 ? "included" : "extra"
    }));
  }

  for (const fillingId of input.fillingIds ?? []) {
    const filling = findOption(catalog?.fillings ?? fillings, fillingId);
    if (filling) {
      lines.push(normalizeQuoteLine({ ...filling, kind: "extra" }));
    }
  }

  for (const toppingId of input.toppingIds ?? []) {
    const topping = findOption(catalog?.toppings ?? toppings, toppingId);
    if (topping) {
      lines.push(normalizeQuoteLine({ ...topping, kind: "extra" }));
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

export function quoteRangeLabel(price: PriceRange) {
  const low = Math.min(price.low, price.high);
  const high = Math.max(price.low, price.high);

  return low === high
    ? formatCurrency(low)
    : `${formatCurrency(low)}-${formatCurrency(high)}`;
}

export function optionPriceLabel(price: PriceRange) {
  return price.low === 0 && price.high === 0
    ? "Included"
    : `+${quoteRangeLabel(price)}`;
}

export function startingPriceLabel(price: PriceRange) {
  return `Starting at ${formatCurrency(Math.min(price.low, price.high))}`;
}
