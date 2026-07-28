import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultPublicCatalog } from "./catalog";
import { loadPublicCatalog, resetPublicCatalogSyncForTests } from "./public-catalog-sync";

const cacheKey = "meera:public-catalog:cake-v1";

describe("public catalog sync", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    sessionStorage.clear();
    resetPublicCatalogSyncForTests();
  });

  it("aborts slow live catalog fetches so navigation stays responsive", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = loadPublicCatalog(defaultPublicCatalog, { timeoutMs: 250 });
    await vi.advanceTimersByTimeAsync(260);

    await expect(resultPromise).resolves.toEqual({ catalog: defaultPublicCatalog, source: "default" });
  });

  it("uses only the versioned cake-menu cache key", async () => {
    sessionStorage.setItem("meera:public-catalog", JSON.stringify({
      savedAt: Date.now(),
      catalog: defaultPublicCatalog
    }));
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadPublicCatalog(defaultPublicCatalog)).resolves.toEqual({
      catalog: defaultPublicCatalog,
      source: "default"
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("reuses and normalizes a valid cake-only cached catalog", async () => {
    const copiedCatalog = {
      ...defaultPublicCatalog,
      products: [{ ...defaultPublicCatalog.products[0], id: " Cake ", label: " Custom\ncake " }],
      offerings: defaultPublicCatalog.offerings.map((item) =>
        item.id === "fresh-strawberry"
          ? { ...item, id: " Fresh-Strawberry ", label: " Fresh\nstrawberry " }
          : item
      ),
      toppings: defaultPublicCatalog.toppings.map((item) =>
        item.id === "fresh-strawberry"
          ? { ...item, id: " Fresh-Strawberry ", label: " Fresh\nstrawberry " }
          : item
      )
    };
    sessionStorage.setItem(cacheKey, JSON.stringify({
      savedAt: Date.now(),
      catalog: copiedCatalog
    }));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await loadPublicCatalog(defaultPublicCatalog);

    expect(result.source).toBe("cached");
    expect(result.catalog.products[0]).toMatchObject({ id: "cake", label: "Custom cake" });
    expect(result.catalog.toppings.find((item) => item.id === "fresh-strawberry")?.label).toBe("Fresh strawberry");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: "missing cake categories",
      catalog: { products: [], offerings: [], cakeSizes: [], flavours: [] }
    },
    {
      label: "invalid price",
      catalog: {
        ...defaultPublicCatalog,
        toppings: [{ ...defaultPublicCatalog.toppings[0], low: -1 }]
      }
    },
    {
      label: "obsolete add-on category",
      catalog: {
        ...defaultPublicCatalog,
        toppings: [{ ...defaultPublicCatalog.toppings[0], category: "add-on" }]
      }
    }
  ])("clears cached data with $label", async ({ catalog }) => {
    sessionStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), catalog }));
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(loadPublicCatalog(defaultPublicCatalog)).resolves.toEqual({
      catalog: defaultPublicCatalog,
      source: "default"
    });
    expect(sessionStorage.getItem(cacheKey)).toBeNull();
  });

  it("clears expired and future-dated cache entries", async () => {
    sessionStorage.setItem(cacheKey, JSON.stringify({
      savedAt: Date.now() + 60 * 60 * 1000,
      catalog: defaultPublicCatalog
    }));
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await loadPublicCatalog(defaultPublicCatalog);

    expect(sessionStorage.getItem(cacheKey)).toBeNull();
  });

  it("caches live catalog responses but not server fallback responses", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, source: "fallback", catalog: defaultPublicCatalog })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, source: "live", catalog: defaultPublicCatalog })
      });
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadPublicCatalog(defaultPublicCatalog)).resolves.toMatchObject({ source: "fallback" });
    expect(sessionStorage.getItem(cacheKey)).toBeNull();

    await expect(loadPublicCatalog(defaultPublicCatalog)).resolves.toMatchObject({ source: "live" });
    expect(sessionStorage.getItem(cacheKey)).not.toBeNull();
  });

  it("does not cache malformed live data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        source: "live",
        catalog: { ...defaultPublicCatalog, frostings: "not-an-array" }
      })
    }));

    await expect(loadPublicCatalog(defaultPublicCatalog)).resolves.toEqual({
      catalog: defaultPublicCatalog,
      source: "default"
    });
    expect(sessionStorage.getItem(cacheKey)).toBeNull();
  });
});
