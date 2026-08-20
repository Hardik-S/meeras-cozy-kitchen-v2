import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { business } from "@/content/business";
import { defaultPublicCatalog } from "@/lib/catalog";
import { getMinimumPickupDate } from "@/lib/dates";
import { resetPublicCatalogSyncForTests } from "@/lib/public-catalog-sync";
import { OrderForm } from "./order-form";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock })
}));

function acknowledgeAll() {
  fireEvent.click(screen.getByRole("button", { name: "Accept all acknowledgements" }));
}

function selectMinimumPickupDate() {
  const minimumDate = getMinimumPickupDate();
  const date = new Date(`${minimumDate}T00:00:00`);
  const label = new Intl.DateTimeFormat("en-CA", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);

  fireEvent.click(screen.getByRole("button", { name: "Pickup date" }));
  fireEvent.click(screen.getByRole("gridcell", { name: label }));
}

function fillValidInquiry() {
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Amina" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "amina@example.com" } });
  fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "4165550101" } });
  selectMinimumPickupDate();
  fireEvent.change(screen.getByLabelText("Pickup time"), { target: { value: "12:00-14:00" } });
  fireEvent.change(screen.getByLabelText("Cake Flavour"), { target: { value: "vanilla" } });
  fireEvent.change(screen.getByLabelText("Frosting Flavours"), {
    target: { value: "chocolate-frosting" }
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
      frostingId: "chocolate-frosting",
      fillingIds: ["raspberry-filling", "apricot-filling"],
      toppingIds: ["fresh-strawberry"],
      message: "Birthday cake with soft floral piping.",
      paymentEmail: "meerascozykitchen@gmail.com",
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
    expect(screen.getByLabelText("Cake Flavour")).toBeInTheDocument();
    expect(screen.getByLabelText("Cake Flavour")).toHaveValue("");
    expect(screen.getByLabelText("Frosting Flavours")).toHaveValue("");
    expect(screen.queryByLabelText(/product/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/servings/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/budget/i)).not.toBeInTheDocument();
  });

  it("requires an independent frosting choice and shows all eight options in canonical order", () => {
    render(<OrderForm />);

    const cakeFlavourSelect = screen.getByLabelText("Cake Flavour");
    expect(cakeFlavourSelect).toHaveValue("");
    expect(within(cakeFlavourSelect).getByRole("option", { name: "Choose a cake flavour" })).toBeDisabled();
    const frostingSelect = screen.getByLabelText("Frosting Flavours");
    expect(frostingSelect).toHaveValue("");
    expect(within(frostingSelect).getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Choose a frosting flavour",
      "Chocolate (Included)",
      "Vanilla (Included)",
      "Almond (Included)",
      "Lemon (Included)",
      "Coconut (Included)",
      "Oreo Crunch (+$5)",
      "Dark Chocolate Ganache (+$10)",
      "White Chocolate Ganache (+$10)"
    ]);
    expect(within(frostingSelect).getByRole("option", { name: "Choose a frosting flavour" })).toBeDisabled();
  });

  it("starts with five individually checkable acknowledgements expanded", () => {
    render(<OrderForm />);

    const toggle = screen.getByRole("button", { name: /hide required acknowledgements/i });
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    const acknowledgementLabels = [
      business.noticeCopy,
      business.allergenNotice,
      business.pickupPolicy,
      "Slight adjustments may be made compared to the inspiration photo.",
      business.depositPolicy
    ];
    for (const label of acknowledgementLabels) {
      const checkbox = screen.getByLabelText(label);
      expect(checkbox).not.toBeChecked();
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
    }
  });

  it("accepts all terms at once, preserves them while folded, and re-enables after one is unchecked", () => {
    render(<OrderForm />);

    acknowledgeAll();
    expect(screen.getByRole("button", { name: "Clear all acknowledgements" })).toBeEnabled();
    expect(screen.getByLabelText(business.noticeCopy)).toBeChecked();
    expect(screen.getByLabelText(business.allergenNotice)).toBeChecked();
    expect(screen.getByLabelText(business.pickupPolicy)).toBeChecked();
    expect(screen.getByLabelText("Slight adjustments may be made compared to the inspiration photo.")).toBeChecked();
    expect(screen.getByLabelText(business.depositPolicy)).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: /hide required acknowledgements/i }));
    const showButton = screen.getByRole("button", { name: /show required acknowledgements/i });
    expect(showButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByLabelText(business.noticeCopy)).toBeChecked();
    expect(screen.getByLabelText(business.depositPolicy)).toBeChecked();

    fireEvent.click(showButton);
    fireEvent.click(screen.getByLabelText(business.depositPolicy));

    expect(screen.getByLabelText(business.depositPolicy)).not.toBeChecked();
    expect(screen.getByLabelText(business.noticeCopy)).toBeChecked();
    expect(screen.getByRole("button", { name: "Accept all acknowledgements" })).toBeEnabled();

    acknowledgeAll();
    fireEvent.click(screen.getByRole("button", { name: "Clear all acknowledgements" }));
    expect(screen.getByLabelText(business.noticeCopy)).not.toBeChecked();
    expect(screen.getByLabelText(business.depositPolicy)).not.toBeChecked();
  });

  it("keeps submission disabled until every acknowledgement is accepted", () => {
    render(<OrderForm />);

    const submitButton = screen.getByRole("button", { name: "Submit inquiry" });
    expect(submitButton).toBeDisabled();
    expect(screen.getByText("Accept all required acknowledgements to submit your inquiry.")).toBeInTheDocument();

    acknowledgeAll();
    expect(submitButton).toBeEnabled();
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
      frostingId: "chocolate-frosting",
      fillingIds: ["raspberry-filling", "apricot-filling"],
      toppingIds: ["fresh-strawberry"],
      acknowledgements: {
        notice: true,
        allergens: true,
        address: true,
        inspiration: true,
        payment: true
      }
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

  it("requires pickup time and a frosting after acknowledgements are accepted", async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL) => Promise<Response>>(async () => new Response(JSON.stringify({
      ok: true,
      source: "fallback",
      catalog: defaultPublicCatalog
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<OrderForm />);
    fillValidInquiry();
    fireEvent.change(screen.getByLabelText("Pickup time"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Frosting Flavours"), { target: { value: "" } });

    fireEvent.click(screen.getByRole("button", { name: /submit inquiry/i }));

    expect(await screen.findByText("Please choose a pickup time.")).toBeInTheDocument();
    expect(screen.getByText("Please choose a frosting flavour.")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url) === "/api/inquiry")).toBe(false);
  });

  it("locks submission again when an acknowledgement is cleared", () => {
    render(<OrderForm />);
    fillValidInquiry();
    fireEvent.click(screen.getByLabelText(business.noticeCopy));

    expect(screen.getByRole("button", { name: "Submit inquiry" })).toBeDisabled();
    expect(screen.getByText("Accept all required acknowledgements to submit your inquiry.")).toBeInTheDocument();
  });

  it("does not render or trigger submit confetti", () => {
    render(<OrderForm />);

    expect(document.querySelector(".button-confetti")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /submit inquiry/i }));
    expect(document.querySelector(".button-confetti")).not.toBeInTheDocument();
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
      frostingId: "chocolate-frosting",
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
