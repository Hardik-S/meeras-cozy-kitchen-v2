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

describe("OrderForm v2 submit flow", () => {
  afterEach(() => {
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
  });

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
});
