import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const validPayload = {
  name: "Amina Khan",
  email: "amina@example.com",
  rating: 5,
  description: "The cake was beautiful and delicious.",
  website: ""
};

function postRequest(payload: unknown = validPayload) {
  return new Request("http://localhost/api/reviews", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

function configureAppsScript() {
  vi.stubEnv("GOOGLE_APPS_SCRIPT_URL", "https://script.google.com/macros/s/test/exec");
  vi.stubEnv("GOOGLE_APPS_SCRIPT_SECRET", "shared-secret");
}

describe("/api/reviews", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns a sanitized newest-first public list and aggregate", async () => {
    configureAppsScript();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return new Response(JSON.stringify({
        ok: true,
        reviews: [
          { id: "older", createdAt: "2026-01-01T00:00:00.000Z", name: "Amina", rating: 4, description: "A lovely birthday cake." },
          { id: "newer", createdAt: "2026-07-01T00:00:00.000Z", name: "Sam", rating: 5, description: "Beautiful work and service." }
        ]
      }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.reviews.map((review: { id: string }) => review.id)).toEqual(["newer", "older"]);
    expect(body.summary).toEqual({ average: 4.5, count: 2 });
    expect(JSON.stringify(body)).not.toContain("email");
    const proxyBody = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(proxyBody).toMatchObject({ action: "listPublicReviews", secret: "shared-secret" });
  });

  it("rejects a public backend response that contains private email data", async () => {
    configureAppsScript();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      reviews: [{
        id: "rev_1",
        createdAt: "2026-07-01T00:00:00.000Z",
        name: "Amina",
        email: "amina@example.com",
        rating: 5,
        description: "Beautiful work and service."
      }]
    }), { status: 200 })));

    expect((await GET()).status).toBe(502);
  });

  it("stores a validated pending review without echoing private data", async () => {
    configureAppsScript();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return new Response(JSON.stringify({
        ok: true,
        reviewId: "rev_123",
        notifications: { owner: true, reviewer: true }
      }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(postRequest());
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({ ok: true, status: "pending" });
    expect(JSON.stringify(body)).not.toContain(validPayload.email);
    const proxyBody = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(proxyBody).toMatchObject({ action: "submitReview", review: validPayload });
  });

  it("rejects malformed JSON, invalid fields, honeypots, and unknown fields", async () => {
    expect((await POST(new Request("http://localhost/api/reviews", { method: "POST", body: "{" }))).status).toBe(400);
    expect((await POST(postRequest({ ...validPayload, rating: 2.5 }))).status).toBe(400);
    expect((await POST(postRequest({ ...validPayload, description: "short" }))).status).toBe(400);
    expect((await POST(postRequest({ ...validPayload, website: "spam" }))).status).toBe(400);
    expect((await POST(postRequest({ ...validPayload, orderId: "ord_1" }))).status).toBe(400);
  });

  it("reports unavailable persistence instead of claiming success", async () => {
    const response = await POST(postRequest());
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Reviews are temporarily unavailable. Please try again later."
    });
  });
});
