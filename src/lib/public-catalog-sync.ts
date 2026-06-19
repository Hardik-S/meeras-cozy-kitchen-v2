import type { OfferingCategory, PublicCatalog } from "./catalog";

type CatalogSyncResult = {
  catalog: PublicCatalog;
  source: "default" | "cached" | "live" | "fallback";
};

const cacheKey = "meera:public-catalog";
const cacheTtlMs = 10 * 60 * 1000;
let inFlight: Promise<CatalogSyncResult> | undefined;

function isPublicCatalog(value: unknown): value is PublicCatalog {
  if (!value || typeof value !== "object") return false;

  const catalog = value as Partial<Record<keyof PublicCatalog, unknown>>;
  return Array.isArray(catalog.products)
    && Array.isArray(catalog.offerings)
    && Array.isArray(catalog.cakeSizes)
    && Array.isArray(catalog.flavours)
    && Array.isArray(catalog.addOns)
    && catalog.products.every(isPublicProduct)
    && catalog.offerings.every(isPublicOffering)
    && catalog.cakeSizes.every((offering) => hasPublicOfferingCategory(offering, "cake-size"))
    && catalog.flavours.every((offering) => hasPublicOfferingCategory(offering, "flavour"))
    && catalog.addOns.every((offering) => hasPublicOfferingCategory(offering, "add-on"));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeOfferingCategory(value: unknown): OfferingCategory | undefined {
  if (typeof value !== "string") return undefined;

  const category = value.trim();
  return category === "cake-size" || category === "flavour" || category === "add-on"
    ? category
    : undefined;
}

function isPublicProduct(value: unknown) {
  if (!isRecord(value)) return false;

  return isNonEmptyString(value.id)
    && isNonEmptyString(value.label)
    && isFiniteNumber(value.low)
    && isFiniteNumber(value.high)
    && typeof value.enabled === "boolean"
    && isFiniteNumber(value.sortOrder);
}

function isPublicOffering(value: unknown) {
  if (!isRecord(value)) return false;

  return isNonEmptyString(value.id)
    && isNonEmptyString(value.productId)
    && normalizeOfferingCategory(value.category) !== undefined
    && isNonEmptyString(value.label)
    && isFiniteNumber(value.low)
    && isFiniteNumber(value.high)
    && typeof value.servings === "string"
    && typeof value.enabled === "boolean"
    && isFiniteNumber(value.sortOrder);
}

function hasPublicOfferingCategory(value: unknown, category: OfferingCategory) {
  return isPublicOffering(value)
    && isRecord(value)
    && normalizeOfferingCategory(value.category) === category;
}

function normalizePublicProduct(product: PublicCatalog["products"][number]): PublicCatalog["products"][number] {
  return {
    ...product,
    id: product.id.trim(),
    label: product.label.trim()
  };
}

function normalizePublicOffering(offering: PublicCatalog["offerings"][number]): PublicCatalog["offerings"][number] {
  return {
    ...offering,
    id: offering.id.trim(),
    productId: offering.productId.trim(),
    category: normalizeOfferingCategory(offering.category) ?? offering.category,
    label: offering.label.trim(),
    servings: offering.servings.trim()
  };
}

function normalizePublicCatalog(catalog: PublicCatalog): PublicCatalog {
  const products = catalog.products.map(normalizePublicProduct);
  const offerings = catalog.offerings.map(normalizePublicOffering);

  return {
    products,
    offerings,
    cakeSizes: offerings.filter((offering) => offering.category === "cake-size"),
    flavours: offerings.filter((offering) => offering.category === "flavour"),
    addOns: offerings.filter((offering) => offering.category === "add-on")
  };
}

function clearCachedCatalog() {
  try {
    sessionStorage.removeItem(cacheKey);
  } catch {
    // Public pages should continue with defaults even when browser storage is unavailable.
  }
}

function readCachedCatalog(now = Date.now()): CatalogSyncResult | undefined {
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (!cached) return undefined;

    const parsed = JSON.parse(cached) as { savedAt?: number; catalog?: unknown };
    const cacheAge = typeof parsed.savedAt === "number" ? now - parsed.savedAt : Number.POSITIVE_INFINITY;
    if (!isPublicCatalog(parsed.catalog) || cacheAge < 0 || cacheAge > cacheTtlMs) {
      clearCachedCatalog();
      return undefined;
    }

    return { catalog: normalizePublicCatalog(parsed.catalog), source: "cached" };
  } catch {
    clearCachedCatalog();
    return undefined;
  }
}

function writeCachedCatalog(catalog: PublicCatalog) {
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), catalog }));
  } catch {
    // Public pages should never become slower because browser storage is unavailable.
  }
}

export async function loadPublicCatalog(
  fallbackCatalog: PublicCatalog,
  options: { timeoutMs?: number } = {}
): Promise<CatalogSyncResult> {
  const cached = readCachedCatalog();
  if (cached) return cached;
  if (inFlight) return inFlight;

  const timeoutMs = options.timeoutMs ?? 1200;
  inFlight = (async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch("/api/catalog", { signal: controller.signal });
      const body = await response.json();

      if (response.ok && body.ok && isPublicCatalog(body.catalog)) {
        const catalog = normalizePublicCatalog(body.catalog);
        if (body.source === "live") {
          writeCachedCatalog(catalog);
        }
        return {
          catalog,
          source: body.source === "live" ? "live" : "fallback"
        };
      }
    } catch {
      return { catalog: fallbackCatalog, source: "default" };
    } finally {
      window.clearTimeout(timeout);
      inFlight = undefined;
    }

    return { catalog: fallbackCatalog, source: "default" };
  })();

  return inFlight;
}

export function schedulePublicCatalogSync(callback: () => void) {
  const scheduler = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };

  if (scheduler.requestIdleCallback && scheduler.cancelIdleCallback) {
    const id = scheduler.requestIdleCallback(callback, { timeout: 1000 });
    return () => scheduler.cancelIdleCallback?.(id);
  }

  const id = globalThis.setTimeout(callback, 250);
  return () => globalThis.clearTimeout(id);
}

export function resetPublicCatalogSyncForTests() {
  inFlight = undefined;
}
