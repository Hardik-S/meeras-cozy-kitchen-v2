import type { PublicCatalog } from "./catalog";

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
    && Array.isArray(catalog.addOns);
}

function readCachedCatalog(now = Date.now()): CatalogSyncResult | undefined {
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (!cached) return undefined;

    const parsed = JSON.parse(cached) as { savedAt?: number; catalog?: unknown };
    if (!isPublicCatalog(parsed.catalog) || !parsed.savedAt || now - parsed.savedAt > cacheTtlMs) {
      return undefined;
    }

    return { catalog: parsed.catalog, source: "cached" };
  } catch {
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
        writeCachedCatalog(body.catalog);
        return {
          catalog: body.catalog,
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
