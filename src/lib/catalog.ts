import {
  cakeSizes,
  fillings,
  flavours,
  frostings,
  productBasePrices,
  toppings,
  type ProductType
} from "./pricing";

export type AdminSettings = {
  defaultSender: string;
  defaultReceiver: string;
  senderName: string;
  chefNotificationCopy: string;
};

export type AdminProduct = {
  id: ProductType;
  label: string;
  low: number;
  high: number;
  enabled: boolean;
  sortOrder: number;
};

export type OfferingCategory = "cake-size" | "flavour" | "frosting" | "filling" | "topping";

export type AdminOffering = {
  id: string;
  productId: ProductType | "all";
  category: OfferingCategory;
  label: string;
  low: number;
  high: number;
  servings: string;
  enabled: boolean;
  sortOrder: number;
};

export type OrderStatus = "new" | "replied" | "confirmed" | "completed" | "cancelled";

export type AdminOrder = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  phone: string;
  eventDate: string;
  pickupTime?: string;
  productType: string;
  cakeSizeId: string;
  flavourId: string;
  frostingId?: string;
  fillingIds?: string[];
  toppingIds?: string[];
  servings?: number;
  budget?: string;
  message: string;
  estimateLow: number;
  estimateHigh: number;
  status: OrderStatus;
  hearted: boolean;
  pinned: boolean;
  summary: string;
};

export type LedgerEntryType = "income" | "expense";

export type LedgerEntry = {
  id: string;
  date: string;
  type: LedgerEntryType;
  category: string;
  description: string;
  amount: number;
  quantity: number;
  orderId: string;
};

export type AdminData = {
  settings: AdminSettings;
  products: AdminProduct[];
  offerings: AdminOffering[];
  orders: AdminOrder[];
  ledger: LedgerEntry[];
};

export type PublicCatalog = {
  products: AdminProduct[];
  offerings: AdminOffering[];
  cakeSizes: AdminOffering[];
  flavours: AdminOffering[];
  frostings: AdminOffering[];
  fillings: AdminOffering[];
  toppings: AdminOffering[];
};

function offering(
  category: OfferingCategory,
  item: { id: string; label: string; low?: number; high?: number },
  sortOrder: number
): AdminOffering {
  return {
    id: item.id,
    productId: "cake",
    category,
    label: item.label,
    low: item.low ?? 0,
    high: item.high ?? 0,
    servings: "",
    enabled: true,
    sortOrder
  };
}

export const defaultAdminData: AdminData = {
  settings: {
    defaultSender: "meerascozykitchen@gmail.com",
    defaultReceiver: "meerascozykitchen@gmail.com",
    senderName: "Meera's Cozy Kitchen",
    chefNotificationCopy: "New bakery inquiry received. Reply from the admin dashboard or your inbox."
  },
  products: (Object.entries(productBasePrices) as Array<[ProductType, { label: string; low: number; high: number }]>)
    .map(([id, product], index) => ({
      id,
      label: product.label,
      low: product.low,
      high: product.high,
      enabled: true,
      sortOrder: index + 1
    })),
  offerings: [
    ...cakeSizes.map((item, index) => offering("cake-size", item, index + 1)),
    ...flavours.map((item, index) => offering("flavour", item, index + 1)),
    ...frostings.map((item, index) => offering("frosting", item, index + 1)),
    ...fillings.map((item, index) => offering("filling", item, index + 1)),
    ...toppings.map((item, index) => offering("topping", item, index + 1))
  ],
  orders: [],
  ledger: []
};

export function sortByOrder<T extends { sortOrder: number; label: string }>(items: T[]) {
  return [...items].sort((left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label));
}

function hasPublicPriceRange(item: { low: number; high: number }) {
  return Number.isFinite(item.low)
    && Number.isFinite(item.high)
    && item.low >= 0
    && item.high >= item.low;
}

function hasPublicSortOrder(item: { sortOrder: number }) {
  return Number.isInteger(item.sortOrder) && item.sortOrder >= 0;
}

export function normalizeOfferingCategory(value: string): OfferingCategory | undefined {
  const category = value.trim().toLowerCase();
  const categories: OfferingCategory[] = ["cake-size", "flavour", "frosting", "filling", "topping"];

  return categories.includes(category as OfferingCategory)
    ? category as OfferingCategory
    : undefined;
}

function normalizeCatalogProductId(value: string) {
  return value.trim().toLowerCase();
}

function normalizeCatalogDisplayText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeProduct(product: AdminProduct): AdminProduct {
  return {
    ...product,
    id: normalizeCatalogProductId(product.id),
    label: normalizeCatalogDisplayText(product.label)
  };
}

function normalizeOffering(item: AdminOffering): AdminOffering {
  return {
    ...item,
    id: normalizeCatalogProductId(item.id),
    productId: normalizeCatalogProductId(item.productId),
    category: normalizeOfferingCategory(item.category) ?? item.category,
    label: normalizeCatalogDisplayText(item.label),
    servings: normalizeCatalogDisplayText(item.servings)
  };
}

export function getPublicCatalogFromAdminData(data: AdminData): PublicCatalog {
  const products = sortByOrder(data.products
    .map(normalizeProduct)
    .filter((product) =>
      product.enabled
      && product.id === "cake"
      && product.label.length > 0
      && hasPublicPriceRange(product)
      && hasPublicSortOrder(product)
    ));
  const offerings = sortByOrder(data.offerings
    .map(normalizeOffering)
    .filter((item) =>
      item.enabled
      && item.id.length > 0
      && item.label.length > 0
      && normalizeOfferingCategory(item.category) !== undefined
      && hasPublicPriceRange(item)
      && hasPublicSortOrder(item)
      && (item.productId === "all" || item.productId === "cake")
    ));

  return {
    products,
    offerings,
    cakeSizes: offerings.filter((item) => item.category === "cake-size"),
    flavours: offerings.filter((item) => item.category === "flavour"),
    frostings: offerings.filter((item) => item.category === "frosting"),
    fillings: offerings.filter((item) => item.category === "filling"),
    toppings: offerings.filter((item) => item.category === "topping")
  };
}

export const defaultPublicCatalog = getPublicCatalogFromAdminData(defaultAdminData);
