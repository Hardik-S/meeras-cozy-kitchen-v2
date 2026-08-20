import { NextResponse } from "next/server";
import { listPublicReviewsFromAppsScript, submitReviewToAppsScript } from "@/lib/apps-script";
import { reviewSubmissionSchema, sortReviewsNewestFirst, summarizeReviews } from "@/lib/reviews";

const unavailableMessage = "Reviews are temporarily unavailable. Please try again later.";

export async function GET() {
  const result = await listPublicReviewsFromAppsScript();

  if (result.status === "skipped") {
    return NextResponse.json({ ok: false, error: unavailableMessage }, { status: 503 });
  }

  if (result.status === "error") {
    return NextResponse.json({ ok: false, error: unavailableMessage }, { status: 502 });
  }

  const reviews = sortReviewsNewestFirst(result.reviews);
  return NextResponse.json(
    { ok: true, reviews, summary: summarizeReviews(reviews) },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = reviewSubmissionSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Please review your review details.",
        issues: parsed.error.flatten().fieldErrors
      },
      { status: 400 }
    );
  }

  const result = await submitReviewToAppsScript(parsed.data);

  if (result.status === "skipped") {
    return NextResponse.json({ ok: false, error: unavailableMessage }, { status: 503 });
  }

  if (result.status === "error") {
    return NextResponse.json({ ok: false, error: unavailableMessage }, { status: 502 });
  }

  return NextResponse.json(
    {
      ok: true,
      status: "pending",
      message: "Thank you. Your review has been received and is awaiting approval."
    },
    { status: 201 }
  );
}
