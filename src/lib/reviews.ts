import { z } from "zod";

export const reviewStatuses = ["pending", "published", "hidden"] as const;

export type ReviewStatus = typeof reviewStatuses[number];

export type AdminReview = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  rating: number;
  description: string;
  status: ReviewStatus;
  publishedAt: string;
  updatedAt: string;
};

export type PublicReview = Pick<AdminReview, "id" | "createdAt" | "name" | "rating" | "description">;

export type ReviewSummary = {
  average: number;
  count: number;
};

const singleLineText = z.string()
  .trim()
  .transform((value) => value.replace(/\s+/g, " "));

export const reviewSubmissionSchema = z.strictObject({
  name: singleLineText.pipe(z.string().min(2, "Please enter the name you would like shown publicly.").max(80)),
  email: z.string().trim().pipe(z.email("Please enter a valid email address.").max(254)),
  rating: z.number().int("Please choose a whole-star rating.").min(1, "Please choose a star rating.").max(5),
  description: z.string()
    .trim()
    .min(10, "Please describe your experience in at least 10 characters.")
    .max(1000, "Please keep your review to 1000 characters or fewer."),
  website: z.string().trim().max(0, "Spam check failed.").optional().default("")
});

export type ReviewSubmission = z.infer<typeof reviewSubmissionSchema>;

export function isReviewStatus(value: unknown): value is ReviewStatus {
  return typeof value === "string" && reviewStatuses.includes(value.trim().toLowerCase() as ReviewStatus);
}

export function publicReviewFromAdmin(review: AdminReview): PublicReview {
  return {
    id: review.id,
    createdAt: review.createdAt,
    name: review.name,
    rating: review.rating,
    description: review.description
  };
}

export function summarizeReviews(reviews: PublicReview[]): ReviewSummary {
  if (reviews.length === 0) return { average: 0, count: 0 };

  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return {
    average: Math.round((total / reviews.length) * 10) / 10,
    count: reviews.length
  };
}

export function sortReviewsNewestFirst<T extends Pick<AdminReview, "createdAt">>(reviews: T[]) {
  return [...reviews].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}
