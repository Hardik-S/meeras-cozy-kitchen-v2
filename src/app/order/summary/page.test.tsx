import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
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
});
