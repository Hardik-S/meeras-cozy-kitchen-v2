import { addOns, cakeSizes, flavours, productBasePrices, type ProductType } from "./pricing";

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

export type OfferingCategory = "cake-size" | "flavour" | "add-on";

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
  productType: string;
  cakeSizeId: string;
  flavourId: string;
  budget: string;
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
  addOns: AdminOffering[];
};

export const defaultAdminData: AdminData = {
  settings: {
    defaultSender: "batb4016@gmail.com",
    defaultReceiver: "batb4016@gmail.com",
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
    ...cakeSizes.map((size, index) => ({
      id: size.id,
      productId: "cake" as const,
      category: "cake-size" as const,
      label: size.label,
      low: size.low,
      high: size.high,
      servings: size.servings,
      enabled: true,
      sortOrder: index + 1
    })),
    ...flavours.map((flavour, index) => ({
      id: flavour.id,
      productId: "all" as const,
      category: "flavour" as const,
      label: flavour.label,
      low: 0,
      high: 0,
      servings: "",
      enabled: true,
      sortOrder: index + 1
    })),
    ...addOns.map((addOn, index) => ({
      id: addOn.id,
      productId: "all" as const,
      category: "add-on" as const,
      label: addOn.label,
      low: addOn.low,
      high: addOn.high,
      servings: "",
      enabled: true,
      sortOrder: index + 1
    }))
  ],
  orders: [],
  ledger: []
};

export function sortByOrder<T extends { sortOrder: number; label: string }>(items: T[]) {
  return [...items].sort((left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label));
}

function normalizeProduct(product: AdminProduct): AdminProduct {
  return {
    ...product,
    id: product.id.trim(),
    label: product.label.trim()
  };
}

function normalizeOffering(offering: AdminOffering): AdminOffering {
  return {
    ...offering,
    id: offering.id.trim(),
    productId: offering.productId.trim(),
    label: offering.label.trim(),
    servings: offering.servings.trim()
  };
}

export function getPublicCatalogFromAdminData(data: AdminData): PublicCatalog {
  const products = sortByOrder(data.products
    .map(normalizeProduct)
    .filter((product) => product.enabled && product.id.length > 0 && product.label.length > 0));
  const enabledProductIds = new Set<ProductType>(products.map((product) => product.id));
  const offerings = sortByOrder(data.offerings
    .map(normalizeOffering)
    .filter((offering) =>
      offering.enabled
      && offering.id.length > 0
      && offering.label.length > 0
      && (offering.productId === "all" || enabledProductIds.has(offering.productId))
    ));

  return {
    products,
    offerings,
    cakeSizes: offerings.filter((offering) => offering.category === "cake-size"),
    flavours: offerings.filter((offering) => offering.category === "flavour"),
    addOns: offerings.filter((offering) => offering.category === "add-on")
  };
}

export const defaultPublicCatalog = getPublicCatalogFromAdminData(defaultAdminData);
