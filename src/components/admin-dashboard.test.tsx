import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultAdminData, type AdminData } from "@/lib/catalog";
import { AdminDashboard } from "./admin-dashboard";

describe("AdminDashboard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts behind the PIN gate", () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: false }), { status: 401 })));

    render(<AdminDashboard />);

    expect(screen.getByRole("heading", { name: "Kitchen admin" })).toBeInTheDocument();
    expect(screen.getByLabelText("Admin PIN")).toBeInTheDocument();
  });

  it("shows the load failure notice when admin data cannot be reached after login", async () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/api/admin/session")) {
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      }

      return Promise.reject(new Error("admin data network unavailable"));
    }));

    render(<AdminDashboard />);
    fireEvent.change(screen.getByLabelText("Admin PIN"), { target: { value: "149149" } });
    fireEvent.click(screen.getByRole("button", { name: /open admin/i }));

    expect(await screen.findByText("Admin data could not be loaded.")).toBeInTheDocument();
  });

  it("shows a login failure notice when the admin session request is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/api/admin/session")) {
        return Promise.reject(new Error("admin session network unavailable"));
      }

      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    }));

    render(<AdminDashboard />);
    fireEvent.change(screen.getByLabelText("Admin PIN"), { target: { value: "149149" } });
    fireEvent.click(screen.getByRole("button", { name: /open admin/i }));

    expect(await screen.findByText("Admin login could not be reached.")).toBeInTheDocument();
  });

  it("updates order status locally before the sheet mutation resolves", async () => {
    const data: AdminData = {
      ...defaultAdminData,
      orders: [
        {
          id: "ord_1",
          createdAt: "2026-05-01T12:00:00.000Z",
          name: "Amina",
          email: "amina@example.com",
          phone: "4165550101",
          eventDate: "2099-05-20",
          productType: "cake",
          cakeSizeId: "eight-inch",
          flavourId: "vanilla-rose",
          budget: "100-150",
          message: "Birthday cake",
          estimateLow: 100,
          estimateHigh: 150,
          status: "new",
          hearted: false,
          pinned: false,
          summary: "summary"
        }
      ]
    };
    let resolveMutation: (value: Response) => void = () => undefined;
    const mutation = new Promise<Response>((resolve) => {
      resolveMutation = resolve;
    });

    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/admin/session")) {
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      }
      if (url.includes("/api/admin/data") && init?.method === "POST") {
        return mutation;
      }
      return Promise.resolve(new Response(JSON.stringify({ ok: true, source: "live", data }), { status: 200 }));
    }));

    render(<AdminDashboard />);
    fireEvent.change(screen.getByLabelText("Admin PIN"), { target: { value: "149149" } });
    fireEvent.click(screen.getByRole("button", { name: /open admin/i }));

    const statusSelect = await screen.findByDisplayValue("new");
    fireEvent.change(statusSelect, { target: { value: "confirmed" } });

    expect(statusSelect).toHaveValue("confirmed");

    resolveMutation(new Response(JSON.stringify({ ok: true, result: { data: {
      ...data,
      orders: data.orders.map((order) => ({ ...order, status: "confirmed" }))
    } } }), { status: 200 }));

    await waitFor(() => expect(screen.getByText("Saved.")).toBeInTheDocument());
  });

  it("rolls back optimistic order status when the sheet save request fails", async () => {
    const data: AdminData = {
      ...defaultAdminData,
      orders: [
        {
          id: "ord_1",
          createdAt: "2026-05-01T12:00:00.000Z",
          name: "Amina",
          email: "amina@example.com",
          phone: "4165550101",
          eventDate: "2099-05-20",
          productType: "cake",
          cakeSizeId: "eight-inch",
          flavourId: "vanilla-rose",
          budget: "100-150",
          message: "Birthday cake",
          estimateLow: 100,
          estimateHigh: 150,
          status: "new",
          hearted: false,
          pinned: false,
          summary: "summary"
        }
      ]
    };

    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/admin/session")) {
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      }
      if (url.includes("/api/admin/data") && init?.method === "POST") {
        return Promise.reject(new Error("sheet unavailable"));
      }
      return Promise.resolve(new Response(JSON.stringify({ ok: true, source: "live", data }), { status: 200 }));
    }));

    render(<AdminDashboard />);
    fireEvent.change(screen.getByLabelText("Admin PIN"), { target: { value: "149149" } });
    fireEvent.click(screen.getByRole("button", { name: /open admin/i }));

    const statusSelect = await screen.findByDisplayValue("new");
    fireEvent.change(statusSelect, { target: { value: "confirmed" } });

    expect(statusSelect).toHaveValue("confirmed");
    await waitFor(() => expect(screen.getByText("Change could not be saved.")).toBeInTheDocument());
    expect(statusSelect).toHaveValue("new");
  });
});
