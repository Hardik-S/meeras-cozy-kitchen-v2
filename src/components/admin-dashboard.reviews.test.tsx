import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultAdminData, type AdminData } from "@/lib/catalog";
import { AdminDashboard } from "./admin-dashboard";

const pendingReview = {
  id: "rev_1",
  createdAt: "2026-08-01T12:00:00.000Z",
  name: "Amina Khan",
  email: "amina@example.com",
  rating: 5,
  description: "The cake was beautiful and delicious.",
  status: "pending" as const,
  publishedAt: "",
  updatedAt: "2026-08-01T12:00:00.000Z"
};

function openAdmin() {
  fireEvent.change(screen.getByLabelText("Admin PIN"), { target: { value: "149149" } });
  fireEvent.click(screen.getByRole("button", { name: /open admin/i }));
}

describe("AdminDashboard review moderation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("publishes and permanently deletes a review while keeping email private to admin", async () => {
    let data: AdminData = { ...defaultAdminData, reviews: [pendingReview] };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/admin/session")) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (url.includes("/api/admin/data") && init?.method === "POST") {
        const body = JSON.parse(init.body as string);
        if (body.action === "updateReviewStatus") {
          data = {
            ...data,
            reviews: data.reviews.map((review) => review.id === body.payload.id
              ? { ...review, status: body.payload.status }
              : review)
          };
        }
        if (body.action === "deleteReview") {
          data = { ...data, reviews: data.reviews.filter((review) => review.id !== body.payload.id) };
        }
        return new Response(JSON.stringify({ ok: true, result: { data } }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true, source: "live", data }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("confirm", vi.fn(() => true));

    render(<AdminDashboard />);
    openAdmin();
    fireEvent.click(await screen.findByRole("button", { name: "reviews" }));

    expect(screen.getByText("amina@example.com", { exact: false })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    await waitFor(() => expect(screen.getByText("Saved.")).toBeInTheDocument());

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/data", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ action: "updateReviewStatus", payload: { id: "rev_1", status: "published" } })
    }));

    fireEvent.click(screen.getByRole("button", { name: "Delete review from Amina Khan" }));
    await waitFor(() => expect(screen.queryByText("amina@example.com", { exact: false })).not.toBeInTheDocument());
    expect(window.confirm).toHaveBeenCalledWith("Permanently delete the review from Amina Khan?");
  });

  it("keeps the review when permanent deletion is cancelled", async () => {
    const data: AdminData = { ...defaultAdminData, reviews: [pendingReview] };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/admin/session")) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true, source: "live", data }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("confirm", vi.fn(() => false));

    render(<AdminDashboard />);
    openAdmin();
    fireEvent.click(await screen.findByRole("button", { name: "reviews" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete review from Amina Khan" }));

    expect(screen.getByText("amina@example.com", { exact: false })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rolls back an optimistic publish when the Sheet mutation fails", async () => {
    const data: AdminData = { ...defaultAdminData, reviews: [pendingReview] };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/api/admin/session")) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (init?.method === "POST") {
        return new Response(JSON.stringify({ ok: false, error: "Sheet save failed." }), { status: 502 });
      }
      return new Response(JSON.stringify({ ok: true, source: "live", data }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminDashboard />);
    openAdmin();
    fireEvent.click(await screen.findByRole("button", { name: "reviews" }));
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));

    expect(await screen.findByText("Sheet save failed.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish" })).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
  });
});
