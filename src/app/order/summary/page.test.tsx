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

    expect(screen.getByRole("heading", { name: "Your inquiry is in for review." })).toBeInTheDocument();
    expect(screen.getAllByText("ord_storage_blocked")[0]).toBeInTheDocument();
    expect(screen.getByText("meerascozykitchen@gmail.com")).toBeInTheDocument();
  });

  it("falls back to the URL id when stored order data is malformed", () => {
    window.history.replaceState(null, "", "/order/summary?id=ord_valid_url");
    sessionStorage.setItem("meera:last-order", JSON.stringify({
      id: 123,
      paymentEmail: "meerascozykitchen@gmail.com"
    }));

    render(<OrderSummaryPage />);

    expect(screen.getByRole("heading", { name: "Your inquiry is in for review." })).toBeInTheDocument();
    expect(screen.getAllByText("ord_valid_url")[0]).toBeInTheDocument();
    expect(screen.getByText("Your inquiry was received. Meera will confirm the details directly.")).toBeInTheDocument();
  });

  it("ignores a stored order when the summary URL points to a different order", () => {
    window.history.replaceState(null, "", "/order/summary?id=ord_fresh_link");
    sessionStorage.setItem("meera:last-order", JSON.stringify({
      id: "ord_previous_session",
      name: "Amina",
      paymentEmail: "payments@example.com",
      summary: "Name: Amina"
    }));

    render(<OrderSummaryPage />);

    expect(screen.getByRole("heading", { name: "Your inquiry is in for review." })).toBeInTheDocument();
    expect(screen.getAllByText("ord_fresh_link")[0]).toBeInTheDocument();
    expect(screen.queryByText("ord_previous_session")).not.toBeInTheDocument();
    expect(screen.queryByText("Name: Amina")).not.toBeInTheDocument();
    expect(screen.getByText("meerascozykitchen@gmail.com")).toBeInTheDocument();
  });

  it("normalizes copied stored order ids before matching the summary URL", () => {
    window.history.replaceState(null, "", "/order/summary?id=ord_copied_storage");
    sessionStorage.setItem("meera:last-order", JSON.stringify({
      id: " ord_copied_storage ",
      name: "Amina",
      paymentEmail: "payments@example.com",
      summary: "Name: Amina from stored payment metadata"
    }));

    render(<OrderSummaryPage />);

    expect(screen.getByText("Name: Amina from stored payment metadata")).toBeInTheDocument();
    expect(screen.getAllByText("ord_copied_storage")[0]).toBeInTheDocument();
    expect(screen.queryByText(" ord_copied_storage ")).not.toBeInTheDocument();
    expect(screen.getByText("meerascozykitchen@gmail.com")).toBeInTheDocument();
    expect(screen.queryByText("payments@example.com")).not.toBeInTheDocument();
  });

  it("shows a payment copy fallback when clipboard access is blocked", async () => {
    sessionStorage.setItem("meera:last-order", JSON.stringify({
      id: "ord_clipboard_blocked",
      name: "Amina",
      paymentEmail: "meerascozykitchen@gmail.com",
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
    expect(writeTextMock).toHaveBeenCalledWith("E-transfer: meerascozykitchen@gmail.com\nMemo: Meera order ord_clipboard_blocked - Amina");
  });

  it("ignores a legacy stored payment email in visible and copied payment details", async () => {
    sessionStorage.setItem("meera:last-order", JSON.stringify({
      id: "ord_custom_payment",
      name: "Amina",
      paymentEmail: "payments@example.com",
      summary: "Name: Amina"
    }));
    const writeTextMock = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: writeTextMock }
    });

    render(<OrderSummaryPage />);
    fireEvent.click(screen.getByRole("button", { name: /copy e-transfer details/i }));

    expect(screen.getByText("meerascozykitchen@gmail.com")).toBeInTheDocument();
    expect(screen.queryByText("payments@example.com")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /email meera/i })).toHaveAttribute("href", expect.stringContaining("mailto:meerascozykitchen@gmail.com"));
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith("E-transfer: meerascozykitchen@gmail.com\nMemo: Meera order ord_custom_payment - Amina");
    });
  });

  it("keeps copied stored customer names on one payment memo line", async () => {
    sessionStorage.setItem("meera:last-order", JSON.stringify({
      id: "ord_multiline_name",
      name: "  Amina\nMemo: redirected  ",
      paymentEmail: "meerascozykitchen@gmail.com",
      summary: "Name: Amina"
    }));
    const writeTextMock = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: writeTextMock }
    });

    render(<OrderSummaryPage />);
    fireEvent.click(screen.getByRole("button", { name: /copy e-transfer details/i }));

    expect(screen.getByText("Amina Memo: redirected")).toBeInTheDocument();
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith("E-transfer: meerascozykitchen@gmail.com\nMemo: Meera order ord_multiline_name - Amina Memo: redirected");
    });
  });

  it("keeps copied order ids on one payment memo line", async () => {
    window.history.replaceState(null, "", "/order/summary?id=ord_multiline%0AMemo:%20redirected");
    const writeTextMock = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: writeTextMock }
    });

    render(<OrderSummaryPage />);
    fireEvent.click(screen.getByRole("button", { name: /copy e-transfer details/i }));

    expect(screen.getAllByText("ord_multiline Memo: redirected")[0]).toBeInTheDocument();
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith("E-transfer: meerascozykitchen@gmail.com\nMemo: Meera order ord_multiline Memo: redirected");
    });
  });

  it("falls back when stored payment metadata has a malformed email", () => {
    sessionStorage.setItem("meera:last-order", JSON.stringify({
      id: "ord_bad_payment",
      name: "Amina",
      paymentEmail: "payments@example.com?cc=someone@example.com",
      summary: "Name: Amina"
    }));

    render(<OrderSummaryPage />);

    expect(screen.getByText("meerascozykitchen@gmail.com")).toBeInTheDocument();
    expect(screen.queryByText("payments@example.com?cc=someone@example.com")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /email meera/i })).toHaveAttribute("href", expect.stringContaining("mailto:meerascozykitchen@gmail.com"));
  });

  it("shows payment only as post-acceptance guidance using the canonical policy", () => {
    sessionStorage.setItem("meera:last-order", JSON.stringify({
      id: "ord_payment_policy",
      name: "Amina",
      summary: "Name: Amina"
    }));

    render(<OrderSummaryPage />);

    expect(screen.getByRole("heading", { name: "Payment guidance after acceptance" })).toBeInTheDocument();
    expect(screen.getByText(
      "Do not send payment until Meera accepts your order and confirms the final price in writing. Once accepted, 50% of the confirmed final price is due by e-transfer within 48 hours. The remaining 50% is due at pickup and may be paid by e-transfer or cash."
    )).toBeInTheDocument();
  });
});
