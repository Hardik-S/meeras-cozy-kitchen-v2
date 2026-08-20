import { describe, expect, it } from "vitest";
import {
  reviewSubmissionSchema,
  sortReviewsNewestFirst,
  summarizeReviews,
  type PublicReview
} from "./reviews";

const validReview = {
  name: "  Amina   Khan  ",
  email: " AMINA@example.com ",
  rating: 5,
  description: "  The cake was beautiful and delicious.  ",
  website: ""
};

describe("reviewSubmissionSchema", () => {
  it("normalizes a complete review while preserving description paragraphs", () => {
    const parsed = reviewSubmissionSchema.parse({
      ...validReview,
      description: "  Beautiful cake.\n\nFriendly service.  "
    });

    expect(parsed).toEqual({
      name: "Amina Khan",
      email: "AMINA@example.com",
      rating: 5,
      description: "Beautiful cake.\n\nFriendly service.",
      website: ""
    });
  });

  it.each([0, 6, 3.5])("rejects invalid rating %s", (rating) => {
    expect(reviewSubmissionSchema.safeParse({ ...validReview, rating }).success).toBe(false);
  });

  it("requires a useful description, valid email, and an empty honeypot", () => {
    expect(reviewSubmissionSchema.safeParse({ ...validReview, description: "Too short" }).success).toBe(false);
    expect(reviewSubmissionSchema.safeParse({ ...validReview, email: "not-an-email" }).success).toBe(false);
    expect(reviewSubmissionSchema.safeParse({ ...validReview, website: "spam" }).success).toBe(false);
  });

  it("rejects descriptions over 1000 characters and unknown fields", () => {
    expect(reviewSubmissionSchema.safeParse({ ...validReview, description: "a".repeat(1001) }).success).toBe(false);
    expect(reviewSubmissionSchema.safeParse({ ...validReview, product: "cake" }).success).toBe(false);
  });
});

describe("review summaries", () => {
  const reviews: PublicReview[] = [
    { id: "old", createdAt: "2026-01-01T00:00:00.000Z", name: "A", rating: 4, description: "Great cake and service." },
    { id: "new", createdAt: "2026-06-01T00:00:00.000Z", name: "B", rating: 5, description: "Wonderful celebration cake." }
  ];

  it("sorts newest first and calculates a one-decimal aggregate", () => {
    expect(sortReviewsNewestFirst(reviews).map((review) => review.id)).toEqual(["new", "old"]);
    expect(summarizeReviews(reviews)).toEqual({ average: 4.5, count: 2 });
  });

  it("returns a stable empty aggregate", () => {
    expect(summarizeReviews([])).toEqual({ average: 0, count: 0 });
  });
});
