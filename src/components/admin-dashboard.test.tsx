import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

  it("shows the load failure notice when admin data is malformed after login", async () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/api/admin/session")) {
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      }

      return Promise.resolve(new Response(JSON.stringify({
        ok: true,
        source: "live",
        data: { ...defaultAdminData, orders: null }
      }), { status: 200 }));
    }));

    render(<AdminDashboard />);
    fireEvent.change(screen.getByLabelText("Admin PIN"), { target: { value: "149149" } });
    fireEvent.click(screen.getByRole("button", { name: /open admin/i }));

    expect(await screen.findByText("Admin data could not be loaded.")).toBeInTheDocument();
    expect(screen.getByLabelText("Admin PIN")).toBeInTheDocument();
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

  it("shows historical blank frosting values as not recorded", async () => {
    const data: AdminData = {
      ...defaultAdminData,
      orders: [{
        id: "ord_legacy",
        createdAt: "2026-05-01T12:00:00.000Z",
        name: "Amina",
        email: "amina@example.com",
        phone: "4165550101",
        eventDate: "2099-05-20",
        productType: "cake",
        cakeSizeId: "eight-inch",
        flavourId: "vanilla",
        message: "Birthday cake",
        estimateLow: 75,
        estimateHigh: 75,
        status: "new",
        hearted: false,
        pinned: false,
        summary: "Legacy order"
      }]
    };

    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/admin/session")) {
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ ok: true, source: "live", data }), { status: 200 }));
    }));

    render(<AdminDashboard />);
    fireEvent.change(screen.getByLabelText("Admin PIN"), { target: { value: "149149" } });
    fireEvent.click(screen.getByRole("button", { name: /open admin/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Amina/i }));

    expect(screen.getByText("Not recorded")).toBeInTheDocument();
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

  it("rolls back optimistic order status when the mutation data is malformed", async () => {
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
        return Promise.resolve(new Response(JSON.stringify({
          ok: true,
          result: {
            data: { ...data, orders: null }
          }
        }), { status: 200 }));
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

  it("rolls back optimistic order status when the mutation envelope is null", async () => {
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
        return Promise.resolve(new Response("null", { status: 200, headers: { "Content-Type": "application/json" } }));
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

  it("rolls back settings edits when the sheet save request fails", async () => {
    const data: AdminData = {
      ...defaultAdminData,
      settings: {
        ...defaultAdminData.settings,
        defaultReceiver: "meera@example.com"
      }
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

    fireEvent.click(await screen.findByRole("button", { name: "settings" }));
    const receiverInput = screen.getByLabelText("Default receiver");

    fireEvent.change(receiverInput, { target: { value: "wrong@example.com" } });
    expect(receiverInput).toHaveValue("wrong@example.com");

    fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

    await waitFor(() => expect(screen.getByText("Change could not be saved.")).toBeInTheDocument());
    expect(receiverInput).toHaveValue("meera@example.com");
  });

  it("saves ledger unit amount separately from quantity", async () => {
    const data: AdminData = defaultAdminData;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/admin/session")) {
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      }
      if (url.includes("/api/admin/data") && init?.method === "POST") {
        return Promise.resolve(new Response(JSON.stringify({ ok: true, result: { data } }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ ok: true, source: "live", data }), { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminDashboard />);
    fireEvent.change(screen.getByLabelText("Admin PIN"), { target: { value: "149149" } });
    fireEvent.click(screen.getByRole("button", { name: /open admin/i }));

    fireEvent.click(await screen.findByRole("button", { name: "finances" }));
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "Packaging" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Cake boxes" } });
    fireEvent.change(screen.getByLabelText("Unit amount"), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: /save ledger entry/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/data",
      expect.objectContaining({ method: "POST" })
    ));
    const mutationCall = fetchMock.mock.calls.find(([input, init]) =>
      String(input).includes("/api/admin/data") && init?.method === "POST"
    );
    const body = JSON.parse(mutationCall?.[1]?.body as string);

    expect(body.payload.entry).toMatchObject({
      category: "Packaging",
      description: "Cake boxes",
      amount: 8,
      quantity: 12
    });
  });

  it("shows multi-quantity ledger row totals in the finance ledger", async () => {
    const data: AdminData = {
      ...defaultAdminData,
      ledger: [{
        id: "led_boxes",
        date: "2026-06-10",
        type: "expense",
        category: "Packaging",
        description: "Cake boxes",
        amount: 8,
        quantity: 12,
        orderId: ""
      }]
    };

    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/api/admin/session")) {
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      }

      return Promise.resolve(new Response(JSON.stringify({ ok: true, source: "live", data }), { status: 200 }));
    }));

    render(<AdminDashboard />);
    fireEvent.change(screen.getByLabelText("Admin PIN"), { target: { value: "149149" } });
    fireEvent.click(screen.getByRole("button", { name: /open admin/i }));

    fireEvent.click(await screen.findByRole("button", { name: "finances" }));
    fireEvent.change(screen.getByLabelText("Report month"), { target: { value: "2026-06" } });

    const ledgerRow = (await screen.findByText("Cake boxes")).closest(".admin-row");

    expect(ledgerRow).not.toBeNull();
    expect(within(ledgerRow as HTMLElement).getByText("2026-06-10 - Packaging - qty 12")).toBeInTheDocument();
    expect(within(ledgerRow as HTMLElement).getByText("-$96")).toBeInTheDocument();
  });
});
