"use client";

import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import {
  reviewSubmissionSchema,
  type PublicReview,
  type ReviewSubmission,
  type ReviewSummary
} from "@/lib/reviews";

type ReviewsResponse = {
  ok: true;
  reviews: PublicReview[];
  summary: ReviewSummary;
};

type FormState = ReviewSubmission & { rating: number };
type FormStatus = "idle" | "submitting" | "sent" | "error";

const emptyForm: FormState = {
  name: "",
  email: "",
  rating: 0,
  description: "",
  website: ""
};

function isReviewsResponse(value: unknown): value is ReviewsResponse {
  if (!value || typeof value !== "object") return false;
  const response = value as Partial<ReviewsResponse>;
  return response.ok === true
    && Array.isArray(response.reviews)
    && Boolean(response.summary)
    && typeof response.summary?.average === "number"
    && typeof response.summary?.count === "number";
}

function formatReviewDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}

function StarRow({ rating, label }: { rating: number; label: string }) {
  return (
    <div className="review-stars review-stars-static" aria-label={label}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          aria-hidden="true"
          className={star <= Math.round(rating) ? "review-star-filled" : "review-star-empty"}
          key={star}
          size={22}
        />
      ))}
    </div>
  );
}

function RatingField({ value, onChange, error }: { value: number; onChange: (rating: number) => void; error?: string }) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>, star: number) {
    const nextRating = event.key === "ArrowRight" || event.key === "ArrowDown"
      ? Math.min(5, star + 1)
      : event.key === "ArrowLeft" || event.key === "ArrowUp"
        ? Math.max(1, star - 1)
        : event.key === "Home"
          ? 1
          : event.key === "End"
            ? 5
            : undefined;

    if (nextRating === undefined) return;
    event.preventDefault();
    onChange(nextRating);
    document.getElementById(`review-rating-${nextRating}`)?.focus();
  }

  return (
    <fieldset className="grid gap-2" aria-describedby={error ? "rating-error" : undefined}>
      <legend className="text-sm font-black">Your rating <span aria-hidden="true">*</span></legend>
      <div className="review-stars review-stars-input">
        {[1, 2, 3, 4, 5].map((star) => (
          <span className="review-star-choice" key={star}>
            <input
              checked={value === star}
              className="review-star-input"
              id={`review-rating-${star}`}
              name="rating"
              onChange={() => onChange(star)}
              onKeyDown={(event) => handleKeyDown(event, star)}
              required
              type="radio"
              value={star}
            />
            <label className="review-star-label" htmlFor={`review-rating-${star}`}>
              <span className="sr-only">{star} {star === 1 ? "star" : "stars"}</span>
              <Star
                aria-hidden="true"
                className={star <= value ? "review-star-filled" : "review-star-empty"}
                size={34}
              />
            </label>
          </span>
        ))}
      </div>
      {error ? <p className="review-field-error" id="rating-error">{error}</p> : null}
    </fieldset>
  );
}

function firstIssue(issues: Record<string, string[]>, field: string) {
  return issues[field]?.[0];
}

export function ReviewsContent() {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [summary, setSummary] = useState<ReviewSummary>({ average: 0, count: 0 });
  const [reviewsState, setReviewsState] = useState<"loading" | "ready" | "error">("loading");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [issues, setIssues] = useState<Record<string, string[]>>({});
  const [formMessage, setFormMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadReviews() {
      try {
        const response = await fetch("/api/reviews", { cache: "no-store" });
        const body: unknown = await response.json().catch(() => ({}));
        if (!response.ok || !isReviewsResponse(body)) throw new Error("Reviews unavailable");
        if (!active) return;

        setReviews(body.reviews);
        setSummary(body.summary);
        setReviewsState("ready");
      } catch {
        if (active) setReviewsState("error");
      }
    }

    void loadReviews();
    return () => {
      active = false;
    };
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setIssues((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    if (formStatus !== "submitting") {
      setFormStatus("idle");
      setFormMessage("");
    }
  }

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormMessage("");

    const parsed = reviewSubmissionSchema.safeParse(form);
    if (!parsed.success) {
      setIssues(parsed.error.flatten().fieldErrors);
      setFormStatus("error");
      setFormMessage("Please review the highlighted details.");
      return;
    }

    setIssues({});
    setFormStatus("submitting");

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data)
      });
      const body = await response.json().catch(() => ({})) as {
        error?: string;
        issues?: Record<string, string[]>;
        message?: string;
      };

      if (!response.ok) {
        setIssues(body.issues || {});
        throw new Error(body.error || "Your review could not be submitted.");
      }

      setForm(emptyForm);
      setFormStatus("sent");
      setFormMessage(body.message || "Thank you. Your review is awaiting approval.");
    } catch (error) {
      setFormStatus("error");
      setFormMessage(error instanceof Error ? error.message : "Your review could not be submitted.");
    }
  }

  return (
    <div className="section-wrap py-12 md:py-20">
      <div data-reveal>
        <p className="eyebrow">Reviews</p>
        <h1 className="page-title">Share your experience.</h1>
        <p className="lede mt-6 max-w-3xl">
          Tell Meera what you loved about your cake and service. Every review is checked before it appears publicly.
        </p>
      </div>

      <div className="mt-12 grid items-start gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form className="surface review-form grid gap-5 p-5 md:p-6" onSubmit={submitReview} data-reveal noValidate>
          <div>
            <h2 className="text-3xl font-black">Add your review</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Fields marked with * are required.</p>
          </div>

          <RatingField value={form.rating} onChange={(rating) => update("rating", rating)} error={firstIssue(issues, "rating")} />

          <label className="grid gap-2 text-sm font-black">
            Display name <span className="text-xs font-bold text-[var(--muted)]">Shown publicly *</span>
            <input
              autoComplete="name"
              className="form-control"
              maxLength={80}
              onChange={(event) => update("name", event.target.value)}
              required
              value={form.name}
            />
            {firstIssue(issues, "name") ? <span className="review-field-error">{firstIssue(issues, "name")}</span> : null}
          </label>

          <label className="grid gap-2 text-sm font-black">
            Email <span className="text-xs font-bold text-[var(--muted)]">Kept private *</span>
            <input
              autoComplete="email"
              className="form-control"
              maxLength={254}
              onChange={(event) => update("email", event.target.value)}
              required
              type="email"
              value={form.email}
            />
            {firstIssue(issues, "email") ? <span className="review-field-error">{firstIssue(issues, "email")}</span> : null}
          </label>

          <label className="grid gap-2 text-sm font-black">
            <span>Your experience <span aria-hidden="true">*</span></span>
            <textarea
              className="form-control min-h-36 resize-y"
              maxLength={1000}
              onChange={(event) => update("description", event.target.value)}
              required
              value={form.description}
            />
            <span className="flex justify-between gap-3 text-xs font-bold text-[var(--muted)]">
              <span>{firstIssue(issues, "description") ? <span className="review-field-error">{firstIssue(issues, "description")}</span> : "At least 10 characters"}</span>
              <span>{form.description.length}/1000</span>
            </span>
          </label>

          <input
            aria-hidden="true"
            autoComplete="off"
            className="hidden"
            name="website"
            onChange={(event) => update("website", event.target.value)}
            tabIndex={-1}
            value={form.website}
          />

          <button className="btn-primary" disabled={formStatus === "submitting"} type="submit">
            {formStatus === "submitting" ? "Sending review..." : "Submit review"}
          </button>
          <p
            aria-live="polite"
            className={`text-sm font-bold ${formStatus === "sent" ? "text-[var(--muted)]" : "text-[var(--accent-strong)]"}`}
          >
            {formMessage}
          </p>
        </form>

        <section className="grid gap-5" aria-labelledby="customer-reviews-heading" data-reveal>
          <div className="review-summary surface p-5 md:p-6">
            <p className="eyebrow">Customer feedback</p>
            <h2 className="mt-2 text-3xl font-black" id="customer-reviews-heading">Approved reviews</h2>
            {reviewsState === "ready" && summary.count > 0 ? (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <strong className="text-4xl font-black">{summary.average.toFixed(1)}</strong>
                <StarRow rating={summary.average} label={`${summary.average} out of 5 stars`} />
                <span className="text-sm font-bold text-[var(--muted)]">{summary.count} {summary.count === 1 ? "review" : "reviews"}</span>
              </div>
            ) : null}
          </div>

          {reviewsState === "loading" ? <div className="surface p-5 font-bold text-[var(--muted)]">Loading approved reviews...</div> : null}
          {reviewsState === "error" ? (
            <div className="surface review-state p-5">
              <h3 className="text-xl font-black">Reviews are temporarily unavailable</h3>
              <p className="mt-2 leading-6 text-[var(--muted)]">Please check back soon. You can still try submitting your review.</p>
            </div>
          ) : null}
          {reviewsState === "ready" && reviews.length === 0 ? (
            <div className="surface review-state p-5">
              <h3 className="text-xl font-black">No approved reviews yet</h3>
              <p className="mt-2 leading-6 text-[var(--muted)]">Be the first customer to share an experience for Meera to review.</p>
            </div>
          ) : null}
          {reviews.map((review) => (
            <article className="surface review-card p-5 md:p-6" key={review.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black">{review.name}</h3>
                  <p className="mt-1 text-xs font-bold text-[var(--muted)]">{formatReviewDate(review.createdAt)}</p>
                </div>
                <StarRow rating={review.rating} label={`${review.rating} out of 5 stars`} />
              </div>
              <p className="review-description mt-4 leading-7 text-[var(--muted)]">{review.description}</p>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
