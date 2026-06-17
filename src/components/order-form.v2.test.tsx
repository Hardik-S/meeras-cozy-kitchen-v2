import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultPublicCatalog } from "@/lib/catalog";
import { OrderForm } from "./order-form";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock
  })
}));

function fillValidInquiry() {
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Amina" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "amina@example.com" } });
  fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "4165550101" } });
  fireEvent.change(screen.getByLabelText("Pickup date"), { target: { value: "2099-05-20" } });
  fireEvent.change(screen.getByLabelText("Design notes"), {
    target: { value: "Birthday cake with soft floral piping." }
  });

  for (const checkbox of screen.getAllByRole("checkbox")) {
    fireEvent.click(checkbox);
  }
}

function fillInquiryWithPickupDate(eventDate: string) {
  fillValidInquiry();
  fireEvent.change(screen.getByLabelText("Pickup date"), { target: { value: eventDate } });
}

describe("OrderForm v2 submit flow", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    sessionStorage.clear();
    pushMock.mockClear();
  });

  it("stores the order summary and navigates to payment instructions after API success", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({
        ok: true,
        order: {
          id: "ord_route_123",
          name: "Amina",
          email: "amina@example.com",
          paymentEmail: "m.ssethi1123@gmail.com",
          summary: "Name: Amina"
        }
      }), { status: 200 })
    ));

    render(<OrderForm />);
    fillValidInquiry();
    fireEvent.click(screen.getByRole("button", { name: /submit inquiry/i }));

    expect(screen.getByTestId("submit-confetti")).toBeInTheDocument();

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/order/summary?id=ord_route_123");
    });

    expect(JSON.parse(sessionStorage.getItem("meera:last-order") || "{}")).toMatchObject({
      id: "ord_route_123",
      paymentEmail: "m.ssethi1123@gmail.com"
    });
  }, 10_000);

  it("shows an error when inquiry submission cannot reach the API", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network unavailable");
    }));

    render(<OrderForm />);
    fillValidInquiry();
    fireEvent.click(screen.getByRole("button", { name: /submit inquiry/i }));

    await waitFor(() => {
      expect(screen.getByText("Please review the highlighted details.")).toBeInTheDocument();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("validates pickup notice against the current browser date before submit", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2099-01-01T12:00:00"));
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({
        ok: true,
        order: {
          id: "ord_stale_notice",
          name: "Amina",
          email: "amina@example.com",
          paymentEmail: "m.ssethi1123@gmail.com",
          summary: "Name: Amina"
        }
      }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<OrderForm />);
    fillInquiryWithPickupDate("2099-01-07");
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);

    expect(screen.getByText("Please choose a pickup date at least 7 days away.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("still navigates after success when browser storage is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({
        ok: true,
        order: {
          id: "ord_storage_blocked",
          name: "Amina",
          email: "amina@example.com",
          paymentEmail: "m.ssethi1123@gmail.com",
          summary: "Name: Amina"
        }
      }), { status: 200 })
    ));
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    render(<OrderForm />);
    fillValidInquiry();
    fireEvent.click(screen.getByRole("button", { name: /submit inquiry/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/order/summary?id=ord_storage_blocked");
    });
    expect(screen.queryByText("Please review the highlighted details.")).not.toBeInTheDocument();

    setItemSpy.mockRestore();
  });

  it("falls back to a pending order when the API returns malformed order metadata", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2099-01-01T12:00:00-05:00"));
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({
        ok: true,
        order: {
          id: 123,
          name: "Amina",
          email: "amina@example.com",
          paymentEmail: "",
          summary: ""
        }
      }), { status: 200 })
    ));

    render(<OrderForm />);
    fillValidInquiry();
    fireEvent.click(screen.getByRole("button", { name: /submit inquiry/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/order/summary?id=pending_4070970000000");
    });

    expect(JSON.parse(sessionStorage.getItem("meera:last-order") || "{}")).toMatchObject({
      id: "pending_4070970000000",
      paymentEmail: "m.ssethi1123@gmail.com"
    });
  });

  it("shows an error when the inquiry API returns a null response envelope", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response("null", { status: 200 })
    ));

    render(<OrderForm />);
    fillValidInquiry();
    fireEvent.click(screen.getByRole("button", { name: /submit inquiry/i }));

    await waitFor(() => {
      expect(screen.getByText("Please review the highlighted details.")).toBeInTheDocument();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows a copy-specific notice when clipboard access is blocked", async () => {
    const writeTextMock = vi.fn(async () => {
      throw new Error("clipboard blocked");
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: writeTextMock }
    });

    render(<OrderForm />);
    fireEvent.click(screen.getByRole("button", { name: /^copy$/i }));

    await waitFor(() => {
      expect(screen.getByText("Copy failed. Use the email button or select the summary manually.")).toBeInTheDocument();
    });
    expect(writeTextMock).toHaveBeenCalled();
  });

  it("previews Sheet-driven catalog labels and prices before submit", () => {
    render(
      <OrderForm
        catalog={{
          ...defaultPublicCatalog,
          cakeSizes: [
            {
              id: "tall-six-inch",
              productId: "cake",
              category: "cake-size",
              label: "Tall six inch celebration cake",
              low: 72,
              high: 84,
              servings: "10-12",
              enabled: true,
              sortOrder: 1
            }
          ],
          flavours: [
            {
              id: "mango-saffron",
              productId: "all",
              category: "flavour",
              label: "Mango saffron",
              low: 0,
              high: 0,
              servings: "",
              enabled: true,
              sortOrder: 1
            }
          ]
        }}
      />
    );

    const summaryPreview = screen.getByText(/Meera's Cozy Kitchen inquiry/);

    expect(summaryPreview).toHaveTextContent("Cake size: Tall six inch celebration cake");
    expect(summaryPreview).toHaveTextContent("Flavour: Mango saffron");
    expect(summaryPreview).toHaveTextContent("Estimated range: $72-$84");
  });

  it("uses product-neutral copy for the customer email fallback", () => {
    render(<OrderForm />);

    const emailLink = screen.getByRole("link", { name: /email/i });

    expect(emailLink).toHaveAttribute(
      "href",
      expect.stringContaining("subject=Bakery%20inquiry%20for%20Meera's%20Cozy%20Kitchen")
    );
    expect(emailLink).not.toHaveAttribute("href", expect.stringContaining("Cake%20inquiry"));
  });

  it("drops selected add-ons that disappear after a live catalog refresh", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const liveCatalogWithoutAddOns = {
      ...defaultPublicCatalog,
      offerings: defaultPublicCatalog.offerings.filter((offering) => offering.category !== "add-on"),
      addOns: []
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ok: true,
        source: "live",
        catalog: liveCatalogWithoutAddOns
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ok: true,
        order: {
          id: "ord_refreshed_catalog",
          name: "Amina",
          email: "amina@example.com",
          paymentEmail: "m.ssethi1123@gmail.com",
          summary: "Name: Amina"
        }
      }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<OrderForm />);
    fireEvent.click(screen.getByLabelText(/Fresh berry finish/i));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/catalog", expect.any(Object));
    });
    fillValidInquiry();
    fireEvent.click(screen.getByRole("button", { name: /submit inquiry/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/order/summary?id=ord_refreshed_catalog");
    });
    const inquiryCall = fetchMock.mock.calls.find(([url]) => url === "/api/inquiry");
    expect(JSON.parse(inquiryCall?.[1]?.body as string).addOnIds).toEqual([]);
  });

  it("hides and drops add-ons that are scoped to a different selected product", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({
        ok: true,
        order: {
          id: "ord_product_scoped_addons",
          name: "Amina",
          email: "amina@example.com",
          paymentEmail: "m.ssethi1123@gmail.com",
          summary: "Name: Amina"
        }
      }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <OrderForm
        catalog={{
          ...defaultPublicCatalog,
          addOns: [
            ...defaultPublicCatalog.addOns,
            {
              id: "cake-topper",
              productId: "cake",
              category: "add-on",
              label: "Cake topper",
              low: 10,
              high: 14,
              servings: "",
              enabled: true,
              sortOrder: 99
            },
            {
              id: "cupcake-sleeve",
              productId: "cupcakes",
              category: "add-on",
              label: "Cupcake sleeve",
              low: 4,
              high: 6,
              servings: "",
              enabled: true,
              sortOrder: 100
            }
          ]
        }}
      />
    );

    fireEvent.click(screen.getByLabelText(/Cake topper/i));
    expect(screen.queryByLabelText(/Cupcake sleeve/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Cupcake dozen/i }));

    expect(screen.queryByLabelText(/Cake topper/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Cupcake sleeve/i)).toBeInTheDocument();

    fillValidInquiry();
    fireEvent.click(screen.getByRole("button", { name: /submit inquiry/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/order/summary?id=ord_product_scoped_addons");
    });
    const inquiryCall = fetchMock.mock.calls.find(([url]) => url === "/api/inquiry");
    expect(JSON.parse(inquiryCall?.[1]?.body as string).addOnIds).not.toContain("cake-topper");
  });
});
