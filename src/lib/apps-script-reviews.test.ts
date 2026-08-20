import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

const source = readFileSync(join(process.cwd(), "docs/apps-script/Code.gs"), "utf8");

function extractFunction(name: string) {
  const start = source.indexOf(`function ${name}`);
  if (start < 0) throw new Error(`Missing ${name}`);

  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Unclosed ${name}`);
}

function loadSubmitReview(appendObject: ReturnType<typeof vi.fn>, sendReviewEmails: ReturnType<typeof vi.fn>) {
  const script = [
    extractFunction("clean"),
    extractFunction("cleanSingleLine"),
    extractFunction("requireReviewPayload"),
    extractFunction("submitReview"),
    "submitReview"
  ].join("\n");

  return runInNewContext(script, {
    appendObject,
    sendReviewEmails,
    audit: vi.fn(),
    makeId: vi.fn(() => "rev_generated"),
    nowIso: vi.fn(() => "2026-08-17T12:00:00.000Z")
  }) as (payload: { review?: Record<string, unknown> }) => Record<string, unknown>;
}

function loadListPublicReviews(rows: Array<Record<string, unknown>>) {
  const script = [
    extractFunction("clean"),
    extractFunction("cleanSingleLine"),
    extractFunction("normalizeReviewStatus"),
    extractFunction("isReviewRating"),
    extractFunction("listPublicReviews"),
    "listPublicReviews"
  ].join("\n");

  return runInNewContext(script, { readObjects: vi.fn(() => rows) }) as () => {
    ok: true;
    reviews: Array<Record<string, unknown>>;
  };
}

function loadUpdateReviewStatus(rows: Array<Record<string, unknown>>, patchById: ReturnType<typeof vi.fn>) {
  const script = [
    extractFunction("clean"),
    extractFunction("cleanSingleLine"),
    extractFunction("requireMutationId"),
    extractFunction("normalizeReviewStatus"),
    extractFunction("updateReviewStatus"),
    "updateReviewStatus"
  ].join("\n");

  return runInNewContext(script, {
    readObjects: vi.fn(() => rows),
    patchById,
    audit: vi.fn(),
    listAdminData: vi.fn(() => ({ ok: true })),
    nowIso: vi.fn(() => "2026-08-17T13:00:00.000Z")
  }) as (payload: { id?: unknown; status?: unknown }) => unknown;
}

function loadSendReviewEmails(sendMail: ReturnType<typeof vi.fn>, audit: ReturnType<typeof vi.fn>) {
  const script = [
    extractFunction("sendReviewMailSafely"),
    extractFunction("sendReviewEmails"),
    "sendReviewEmails"
  ].join("\n");

  return runInNewContext(script, {
    settingsObject: vi.fn(() => ({ defaultReceiver: "meera@example.com" })),
    sendMail,
    audit
  }) as (review: { name: string; email: string; rating: number; description: string }, reviewId: string) => {
    owner: boolean;
    reviewer: boolean;
  };
}

describe("Apps Script review contract", () => {
  it("declares the review sheet and all proxy actions", () => {
    expect(source).toContain('Reviews: ["id", "createdAt", "name", "email", "rating", "description", "status", "publishedAt", "updatedAt"]');
    expect(source).toMatch(/submitReview,\s+listPublicReviews,/);
    expect(source).toMatch(/updateReviewStatus,\s+deleteReview/);
  });

  it("normalizes and stores a pending review before notifications", () => {
    const appendObject = vi.fn();
    const sendReviewEmails = vi.fn(() => ({ owner: true, reviewer: true }));
    const submitReview = loadSubmitReview(appendObject, sendReviewEmails);

    const response = submitReview({
      review: {
        name: "  Amina   Khan ",
        email: " AMINA@Example.com ",
        rating: 5,
        description: "  A beautiful and delicious cake.  ",
        website: ""
      }
    });

    expect(appendObject).toHaveBeenCalledWith("Reviews", {
      id: "rev_generated",
      createdAt: "2026-08-17T12:00:00.000Z",
      name: "Amina Khan",
      email: "amina@example.com",
      rating: 5,
      description: "A beautiful and delicious cake.",
      status: "pending",
      publishedAt: "",
      updatedAt: "2026-08-17T12:00:00.000Z"
    });
    expect(response).toEqual({
      ok: true,
      reviewId: "rev_generated",
      notifications: { owner: true, reviewer: true }
    });
  });

  it.each([
    { rating: 0 },
    { rating: 4.5 },
    { email: "not-an-email" },
    { description: "short" },
    { website: "spam" },
    { unexpected: true }
  ])("rejects malformed copied review input %#", (override) => {
    const submitReview = loadSubmitReview(vi.fn(), vi.fn());
    const review = {
      name: "Amina",
      email: "amina@example.com",
      rating: 5,
      description: "A beautiful and delicious cake.",
      website: "",
      ...override
    };

    expect(() => submitReview({ review })).toThrow();
  });

  it("returns only valid published fields, without emails, newest first", () => {
    const listPublicReviews = loadListPublicReviews([
      { id: "old", createdAt: "2026-01-01", name: "Amina", email: "private@example.com", rating: 4, description: "Lovely birthday cake.", status: "published" },
      { id: "hidden", createdAt: "2026-08-01", name: "Hidden", email: "hidden@example.com", rating: 1, description: "This stays private.", status: "hidden" },
      { id: "new", createdAt: "2026-07-01", name: "Sam", email: "sam@example.com", rating: 5, description: "Wonderful celebration cake.", status: " PUBLISHED " },
      { id: "bad", createdAt: "2026-09-01", name: "Bad", email: "bad@example.com", rating: 9, description: "Invalid copied rating.", status: "published" }
    ]);

    const response = listPublicReviews();

    expect(response.reviews.map((review) => review.id)).toEqual(["new", "old"]);
    expect(JSON.stringify(response)).not.toContain("email");
    expect(JSON.stringify(response)).not.toContain("private@example.com");
  });

  it("publishes or hides known reviews and rejects unsupported statuses", () => {
    const patchById = vi.fn();
    const updateReviewStatus = loadUpdateReviewStatus([
      { id: "rev_1", publishedAt: "" }
    ], patchById);

    updateReviewStatus({ id: "rev_1", status: "published" });
    expect(patchById).toHaveBeenCalledWith("Reviews", "rev_1", {
      status: "published",
      publishedAt: "2026-08-17T13:00:00.000Z",
      updatedAt: "2026-08-17T13:00:00.000Z"
    });
    expect(() => updateReviewStatus({ id: "rev_1", status: "pending" })).toThrow("Unsupported review status.");
  });

  it("attempts both emails and reports failures without throwing", () => {
    const sendMail = vi.fn()
      .mockImplementationOnce(() => { throw new Error("owner email failed"); })
      .mockImplementationOnce(() => undefined);
    const audit = vi.fn();
    const sendReviewEmails = loadSendReviewEmails(sendMail, audit);

    const result = sendReviewEmails({
      name: "Amina",
      email: "amina@example.com",
      rating: 5,
      description: "A beautiful and delicious cake."
    }, "rev_1");

    expect(result).toEqual({ owner: false, reviewer: true });
    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(audit).toHaveBeenCalledWith("reviewEmailFailed", expect.stringContaining("rev_1:owner"));
  });
});
