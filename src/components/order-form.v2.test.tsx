import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
});
