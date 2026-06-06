import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import OrderSummaryPage from "./page";

describe("OrderSummaryPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, "", "/");
    sessionStorage.clear();
  });

  it("shows payment instructions from the URL id when browser storage is unavailable", () => {
    window.history.replaceState(null, "", "/order/summary?id=ord_storage_blocked");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    render(<OrderSummaryPage />);

    expect(screen.getByRole("heading", { name: "Here are your payment instructions." })).toBeInTheDocument();
    expect(screen.getAllByText("ord_storage_blocked")[0]).toBeInTheDocument();
    expect(screen.getByText("m.ssethi1123@gmail.com")).toBeInTheDocument();
  });

  it("falls back to the URL id when stored order data is malformed", () => {
    window.history.replaceState(null, "", "/order/summary?id=ord_valid_url");
    sessionStorage.setItem("meera:last-order", JSON.stringify({
      id: 123,
      paymentEmail: "m.ssethi1123@gmail.com"
    }));

    render(<OrderSummaryPage />);

    expect(screen.getByRole("heading", { name: "Here are your payment instructions." })).toBeInTheDocument();
    expect(screen.getAllByText("ord_valid_url")[0]).toBeInTheDocument();
    expect(screen.getByText("Your inquiry was received. Meera will confirm the details directly.")).toBeInTheDocument();
  });

  it("shows a payment copy fallback when clipboard access is blocked", async () => {
    sessionStorage.setItem("meera:last-order", JSON.stringify({
      id: "ord_clipboard_blocked",
      name: "Amina",
      paymentEmail: "m.ssethi1123@gmail.com",
      summary: "Name: Amina"
    }));
    const writeTextMock = vi.fn(async () => {
      throw new Error("clipboard blocked");
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: writeTextMock }
    });

    render(<OrderSummaryPage />);
    fireEvent.click(screen.getByRole("button", { name: /copy e-transfer details/i }));

    await waitFor(() => {
      expect(screen.getByText("Copy failed. Use the email button or select the payment details manually.")).toBeInTheDocument();
    });
    expect(writeTextMock).toHaveBeenCalledWith("E-transfer: m.ssethi1123@gmail.com\nMemo: Meera order ord_clipboard_blocked - Amina");
  });
});
