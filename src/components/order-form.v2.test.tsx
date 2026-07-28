import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { business } from "@/content/business";
import { defaultPublicCatalog } from "@/lib/catalog";
import { resetPublicCatalogSyncForTests } from "@/lib/public-catalog-sync";
import { OrderForm } from "./order-form";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock })
}));

function acknowledgeAll() {
  fireEvent.click(screen.getByLabelText("Accept required acknowledgements"));
}

function fillValidInquiry() {
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Amina" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "amina@example.com" } });
  fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "4165550101" } });
  fireEvent.change(screen.getByLabelText("Pickup date"), { target: { value: "2099-05-20" } });
  fireEvent.change(screen.getByLabelText("Pickup time"), { target: { value: "12:00-14:00" } });
  fireEvent.change(screen.getByLabelText("Flavour"), { target: { value: "vanilla" } });
  fireEvent.change(screen.getByLabelText("Frosting upgrade"), {
    target: { value: "white-chocolate-ganache" }
  });
  fireEvent.click(screen.getByLabelText("Raspberry, plus $5"));
  fireEvent.click(screen.getByLabelText("Apricot, plus $5"));
  fireEvent.click(screen.getByLabelText("Fresh Strawberry, plus $5"));
  fireEvent.change(screen.getByLabelText("Design notes"), {
    target: { value: "Birthday cake with soft floral piping." }
  });
  acknowledgeAll();
}

function successResponse() {
  return new Response(JSON.stringify({
    ok: true,
    order: {
      id: "ord_route_123",
      name: "Amina",
      email: "amina@example.com",
      phone: "4165550101",
      eventDate: "2099-05-20",
      pickupTime: "12:00-14:00",
      productType: "cake",
      cakeSizeId: "four-inch",
      flavourId: "vanilla",
      frostingId: "white-chocolate-ganache",
      fillingIds: ["raspberry-filling", "apricot-filling"],
      toppingIds: ["fresh-strawberry"],
      message: "Birthday cake with soft floral piping.",
      paymentEmail: "m.ssethi1123@gmail.com",
      summary: "Name: Amina"
    }
  }), { status: 200 });
}

describe("OrderForm cake-only flow", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    sessionStorage.clear();
    pushMock.mockClear();
    resetPublicCatalogSyncForTests();
  });

  it("shows only cake controls and the three starting prices", () => {
    render(<OrderForm />);

    expect(screen.getByRole("button", { name: "4-inch cake, Starting at $35" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "6-inch cake, Starting at $60" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "8-inch cake, Starting at $75" })).toBeInTheDocument();
    expect(screen.getByLabelText("Pickup time")).toBeInTheDocument();
    expect(screen.getByLabelText("Frosting upgrade")).toBeInTheDocument();
    expect(screen.queryByLabelText(/product/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/servings/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/budget/i)).not.toBeInTheDocument();
  });

  it("uses one acceptance checkbox with all acknowledgements in a disclosure", () => {
    render(<OrderForm />);

    expect(screen.getByLabelText("Accept required acknowledgements")).not.toBeChecked();
    expect(screen.queryByLabelText(business.noticeCopy)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(business.allergenNotice)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(business.pickupPolicy)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(business.ingredientPositioning)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Slight adjustments may be made compared to the inspiration photo.")).not.toBeInTheDocument();
    expect(screen.getByText("View all required acknowledgements")).toBeInTheDocument();
    expect(screen.getByText(business.noticeCopy)).toBeInTheDocument();
    expect(screen.getByText(business.allergenNotice)).toBeInTheDocument();
    expect(screen.getByText(business.pickupPolicy)).toBeInTheDocument();
    expect(screen.getByText(business.ingredientPositioning)).toBeInTheDocument();
    expect(screen.getByText("Slight adjustments may be made compared to the inspiration photo.")).toBeInTheDocument();

    acknowledgeAll();

    expect(screen.getByLabelText("Accept required acknowledgements")).toBeChecked();
  });

  it("submits pickup time and all selected cake options without legacy fields", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      void _init;
      if (String(input) === "/api/inquiry") return successResponse();
      return new Response(JSON.stringify({
        ok: true,
        source: "fallback",
        catalog: defaultPublicCatalog
      }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<OrderForm />);
    fillValidInquiry();
    fireEvent.click(screen.getByRole("button", { name: /submit inquiry/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/order/summary?id=ord_route_123");
    });

    const inquiryCall = fetchMock.mock.calls.find(([url]) => String(url) === "/api/inquiry");
    const payload = JSON.parse(String(inquiryCall?.[1]?.body));
    expect(payload).toMatchObject({
      pickupTime: "12:00-14:00",
      cakeSizeId: "four-inch",
      flavourId: "vanilla",
      frostingId: "white-chocolate-ganache",
      fillingIds: ["raspberry-filling", "apricot-filling"],
      toppingIds: ["fresh-strawberry"]
    });
    expect(payload).not.toHaveProperty("productType");
    expect(payload).not.toHaveProperty("servings");
    expect(payload).not.toHaveProperty("budget");
    expect(payload).not.toHaveProperty("addOnIds");
  });

  it("stores normalized returned order metadata", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) !== "/api/inquiry") {
        return new Response(JSON.stringify({ ok: true, source: "fallback", catalog: defaultPublicCatalog }));
      }
      return new Response(JSON.stringify({
        ok: true,
        order: {
          id: "  ord_copied\nresponse  ",
          name: " Amina ",
          email: " amina@example.com ",
          pickupTime: " 12:00-14:00 ",
          productType: " Cake ",
          cakeSizeId: " Four-Inch ",
          flavourId: " Vanilla ",
          frostingId: " Oreo-Crunch ",
          fillingIds: [" Raspberry-Filling "],
          toppingIds: [" Fresh-Strawberry "],
          paymentEmail: " payments@example.com ",
          summary: " Name: Amina "
        }
      }), { status: 200 });
    }));

    render(<OrderForm />);
    fillValidInquiry();
    fireEvent.click(screen.getByRole("button", { name: /submit inquiry/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/order/summary?id=ord_copied%20response");
    });
    expect(JSON.parse(sessionStorage.getItem("meera:last-order") ?? "{}")).toMatchObject({
      id: "ord_copied response",
      productType: "cake",
      cakeSizeId: "four-inch",
      flavourId: "vanilla",
      frostingId: "oreo-crunch",
      fillingIds: ["raspberry-filling"],
      toppingIds: ["fresh-strawberry"]
    });
  });

  it("requires pickup time and the combined acknowledgement", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      source: "fallback",
      catalog: defaultPublicCatalog
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<OrderForm />);
    fillValidInquiry();
    fireEvent.change(screen.getByLabelText("Pickup time"), { target: { value: "" } });
    fireEvent.click(screen.getByLabelText("Accept required acknowledgements"));

    fireEvent.click(screen.getByRole("button", { name: /submit inquiry/i }));

    expect(await screen.findByText("Please choose a pickup time.")).toBeInTheDocument();
    expect(screen.getByText("Please confirm the notice policy.")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url) === "/api/inquiry")).toBe(false);
  });

  it("falls back to a safe pending order when the successful API response lacks order metadata", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === "/api/inquiry") {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true, source: "fallback", catalog: defaultPublicCatalog }));
    }));

    render(<OrderForm />);
    fillValidInquiry();
    fireEvent.click(screen.getByRole("button", { name: /submit inquiry/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalled());
    expect(JSON.parse(sessionStorage.getItem("meera:last-order") ?? "{}")).toMatchObject({
      productType: "cake",
      pickupTime: "12:00-14:00",
      frostingId: "white-chocolate-ganache",
      fillingIds: ["raspberry-filling", "apricot-filling"],
      toppingIds: ["fresh-strawberry"]
    });
  });

  it("keeps a successful inquiry usable when session storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === "/api/inquiry") return successResponse();
      return new Response(JSON.stringify({ ok: true, source: "fallback", catalog: defaultPublicCatalog }));
    }));

    render(<OrderForm />);
    fillValidInquiry();
    fireEvent.click(screen.getByRole("button", { name: /submit inquiry/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/order/summary?id=ord_route_123");
    });
  });

  it("surfaces a copy fallback when clipboard access fails", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("blocked")) }
    });
    render(<OrderForm />);

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    expect(await screen.findByText(/Copy failed/)).toBeInTheDocument();
  });
});
