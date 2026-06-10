import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultPublicCatalog } from "./catalog";
import { loadPublicCatalog, resetPublicCatalogSyncForTests } from "./public-catalog-sync";

describe("public catalog sync", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    sessionStorage.clear();
    resetPublicCatalogSyncForTests();
  });

  it("aborts slow live catalog fetches so public navigation stays responsive", async () => {
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
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("reuses a session cached live catalog instead of fetching on every tab visit", async () => {
    sessionStorage.setItem("meera:public-catalog", JSON.stringify({
      savedAt: Date.now(),
      catalog: defaultPublicCatalog
    }));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadPublicCatalog(defaultPublicCatalog)).resolves.toEqual({
      catalog: defaultPublicCatalog,
      source: "cached"
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clears malformed cached catalog data before falling back", async () => {
    sessionStorage.setItem("meera:public-catalog", JSON.stringify({
      savedAt: Date.now(),
      catalog: {
        products: "not an array",
        offerings: [],
        cakeSizes: [],
        flavours: [],
        addOns: []
      }
    }));
    const fetchMock = vi.fn().mockRejectedValue(new Error("catalog endpoint unavailable"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadPublicCatalog(defaultPublicCatalog)).resolves.toEqual({
      catalog: defaultPublicCatalog,
      source: "default"
    });
    expect(sessionStorage.getItem("meera:public-catalog")).toBeNull();
  });

  it("clears future-dated cached catalog data before falling back", async () => {
    sessionStorage.setItem("meera:public-catalog", JSON.stringify({
      savedAt: Date.now() + 60 * 60 * 1000,
      catalog: defaultPublicCatalog
    }));
    const fetchMock = vi.fn().mockRejectedValue(new Error("catalog endpoint unavailable"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadPublicCatalog(defaultPublicCatalog)).resolves.toEqual({
      catalog: defaultPublicCatalog,
      source: "default"
    });
    expect(sessionStorage.getItem("meera:public-catalog")).toBeNull();
  });

  it("falls back instead of caching malformed live catalog data", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        source: "live",
        catalog: {
          products: "not an array",
          offerings: [],
          cakeSizes: [],
          flavours: [],
          addOns: []
        }
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadPublicCatalog(defaultPublicCatalog)).resolves.toEqual({
      catalog: defaultPublicCatalog,
      source: "default"
    });
    expect(sessionStorage.getItem("meera:public-catalog")).toBeNull();
  });
});
