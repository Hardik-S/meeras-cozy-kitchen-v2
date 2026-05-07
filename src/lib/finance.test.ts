import { describe, expect, it } from "vitest";
import type { AdminOrder, LedgerEntry } from "./catalog";
import {
  buildLedgerCsvRows,
  calculateMonthlyFinanceReport,
  currentMonthKey,
  ledgerEntryTotal,
  normalizeLedgerEntry
} from "./finance";

const entries: LedgerEntry[] = [
  {
    id: "led_1",
    date: "2026-05-03",
    type: "income",
    category: "Order",
    description: "Cake balance",
    amount: 120,
    quantity: 1,
    orderId: "ord_1"
  },
  {
    id: "led_2",
    date: "2026-05-05",
    type: "expense",
    category: "Packaging",
    description: "Cake boxes",
    amount: 45,
    quantity: 3,
    orderId: ""
  },
  {
    id: "led_3",
    date: "2026-04-28",
    type: "expense",
    category: "Ingredients",
    description: "April butter",
    amount: 22,
    quantity: 1,
    orderId: ""
  }
];

const orders: AdminOrder[] = [
  {
    id: "ord_1",
    createdAt: "2026-05-01T12:00:00.000Z",
    name: "Amina",
    email: "amina@example.com",
    phone: "4165550101",
    eventDate: "2026-05-20",
    productType: "cake",
    cakeSizeId: "eight-inch",
    flavourId: "vanilla-rose",
    budget: "100-150",
    message: "Birthday cake",
    estimateLow: 100,
    estimateHigh: 150,
    status: "confirmed",
    hearted: false,
    pinned: false,
    summary: "summary"
  },
  {
    id: "ord_2",
    createdAt: "2026-04-01T12:00:00.000Z",
    name: "Sara",
    email: "sara@example.com",
    phone: "4165550102",
    eventDate: "2026-04-12",
    productType: "cupcakes",
    cakeSizeId: "",
    flavourId: "chocolate-fudge",
    budget: "",
    message: "Cupcakes",
    estimateLow: 34,
    estimateHigh: 44,
    status: "completed",
    hearted: false,
    pinned: false,
    summary: "summary"
  }
];

describe("finance helpers", () => {
  it("defaults ledger quantity to one for existing sheet rows", () => {
    const normalized = normalizeLedgerEntry({
      id: "legacy",
      date: "2026-05-01",
      type: "expense",
      category: "Packaging",
      description: "Legacy box row",
      amount: 12,
      orderId: ""
    });

    expect(normalized.quantity).toBe(1);
  });

  it("stores expense totals from unit amount and quantity", () => {
    expect(ledgerEntryTotal({ amount: 15, quantity: 4 })).toBe(60);
    expect(ledgerEntryTotal({ amount: 15, quantity: 0 })).toBe(15);
  });

  it("calculates reports for the selected month only", () => {
    const report = calculateMonthlyFinanceReport(entries, orders, "2026-05");

    expect(report.month).toBe("2026-05");
    expect(report.entries.map((entry) => entry.id)).toEqual(["led_1", "led_2"]);
    expect(report.income).toBe(120);
    expect(report.expenses).toBe(45);
    expect(report.net).toBe(75);
    expect(report.confirmedPotential).toBe(150);
  });

  it("creates CSV rows with quantity for the selected month", () => {
    expect(buildLedgerCsvRows(entries, "2026-05")).toEqual([
      ["date", "type", "category", "description", "quantity", "amount", "orderId"],
      ["2026-05-03", "income", "Order", "Cake balance", 1, 120, "ord_1"],
      ["2026-05-05", "expense", "Packaging", "Cake boxes", 3, 45, ""]
    ]);
  });

  it("formats the current month key from a date", () => {
    expect(currentMonthKey(new Date("2026-05-07T12:00:00"))).toBe("2026-05");
  });
});
