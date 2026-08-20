import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReviewsContent } from "./reviews-content";

const publicResponse = {
  ok: true,
  reviews: [
    {
      id: "rev_2",
      createdAt: "2026-07-15T12:00:00.000Z",
      name: "Sam",
      rating: 5,
      description: "Beautiful cake and thoughtful service."
    },
    {
      id: "rev_1",
      createdAt: "2026-06-10T12:00:00.000Z",
      name: "Amina",
      rating: 4,
      description: "Delicious cake for our celebration."
    }
  ],
  summary: { average: 4.5, count: 2 }
};

function successfulFetch() {
  return vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "POST") {
      return new Response(JSON.stringify({
        ok: true,
        status: "pending",
        message: "Thank you. Your review has been received and is awaiting approval."
      }), { status: 201 });
    }
    return new Response(JSON.stringify(publicResponse), { status: 200 });
  });
}

describe("ReviewsContent", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders approved reviews and their aggregate without exposing an email", async () => {
    vi.stubGlobal("fetch", successfulFetch());
    render(<ReviewsContent />);

    expect(await screen.findByText("Sam")).toBeInTheDocument();
    expect(screen.getByText("Amina")).toBeInTheDocument();
    expect(screen.getByText("4.5")).toBeInTheDocument();
    expect(screen.getByText("2 reviews")).toBeInTheDocument();
    expect(screen.queryByText(/@example\.com/)).not.toBeInTheDocument();
  });

  it("renders an intentional empty state when nothing is approved", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      reviews: [],
      summary: { average: 0, count: 0 }
    }), { status: 200 })));
    render(<ReviewsContent />);

    expect(await screen.findByRole("heading", { name: "No approved reviews yet" })).toBeInTheDocument();
    expect(screen.queryByText("0.0")).not.toBeInTheDocument();
  });

  it("provides accessible cumulative solid and outlined star states", async () => {
    vi.stubGlobal("fetch", successfulFetch());
    render(<ReviewsContent />);
    await screen.findByText("Sam");

    fireEvent.click(screen.getByRole("radio", { name: "4 stars" }));

    expect(screen.getByRole("radio", { name: "4 stars" })).toBeChecked();
    expect(document.querySelectorAll(".review-stars-input .review-star-filled")).toHaveLength(4);
    expect(document.querySelectorAll(".review-stars-input .review-star-empty")).toHaveLength(1);

    fireEvent.keyDown(screen.getByRole("radio", { name: "4 stars" }), { key: "ArrowRight" });
    expect(screen.getByRole("radio", { name: "5 stars" })).toBeChecked();
    expect(document.querySelectorAll(".review-stars-input .review-star-filled")).toHaveLength(5);
  });

  it("shows client-side errors for every required review detail", async () => {
    const fetchMock = successfulFetch();
    vi.stubGlobal("fetch", fetchMock);
    render(<ReviewsContent />);
    await screen.findByText("Sam");

    fireEvent.click(screen.getByRole("button", { name: "Submit review" }));

    expect(screen.getByText("Please choose a star rating.")).toBeInTheDocument();
    expect(screen.getByText("Please enter the name you would like shown publicly.")).toBeInTheDocument();
    expect(screen.getByText("Please enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("Please describe your experience in at least 10 characters.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("submits normalized fields, disables while pending, and confirms moderation", async () => {
    let resolvePost: (response: Response) => void = () => undefined;
    const postResponse = new Promise<Response>((resolve) => {
      resolvePost = resolve;
    });
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") return postResponse;
      return Promise.resolve(new Response(JSON.stringify(publicResponse), { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<ReviewsContent />);
    await screen.findByText("Sam");

    fireEvent.click(screen.getByRole("radio", { name: "5 stars" }));
    fireEvent.change(screen.getByLabelText(/Display name/i), { target: { value: "  Amina   Khan " } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "amina@example.com" } });
    fireEvent.change(screen.getByLabelText(/Your experience/i), {
      target: { value: "  The cake was beautiful and delicious.  " }
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit review" }));

    expect(screen.getByRole("button", { name: "Sending review..." })).toBeDisabled();

    resolvePost(new Response(JSON.stringify({
      ok: true,
      status: "pending",
      message: "Thank you. Your review has been received and is awaiting approval."
    }), { status: 201 }));

    expect(await screen.findByText(/awaiting approval/i)).toBeInTheDocument();
    const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(postCall?.[1]?.body as string)).toEqual({
      name: "Amina Khan",
      email: "amina@example.com",
      rating: 5,
      description: "The cake was beautiful and delicious.",
      website: ""
    });
  });

  it("shows public-load and submission failure states", async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve(new Response(JSON.stringify({ error: "Reviews are temporarily unavailable. Please try again later." }), { status: 503 }));
      }
      return Promise.reject(new Error("offline"));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<ReviewsContent />);

    expect(await screen.findByRole("heading", { name: "Reviews are temporarily unavailable" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "5 stars" }));
    fireEvent.change(screen.getByLabelText(/Display name/i), { target: { value: "Amina" } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "amina@example.com" } });
    fireEvent.change(screen.getByLabelText(/Your experience/i), { target: { value: "Beautiful celebration cake." } });
    fireEvent.click(screen.getByRole("button", { name: "Submit review" }));

    await waitFor(() => expect(screen.getByText("Reviews are temporarily unavailable. Please try again later.")).toBeInTheDocument());
  });
});
