import type { AdminOrder, LedgerEntry, LedgerEntryType } from "./catalog";

export type LedgerEntryLike = Omit<LedgerEntry, "quantity"> & { quantity?: number };

export type FinanceReport = {
  month: string;
  entries: LedgerEntry[];
  income: number;
  expenses: number;
  net: number;
  confirmedPotential: number;
};

export function currentMonthKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function monthKey(value: string) {
  return /^\d{4}-\d{2}/.test(value) ? value.slice(0, 7) : "";
}

function normalizeLedgerType(value: LedgerEntry["type"]): LedgerEntryType {
  return value.trim() as LedgerEntryType;
}

export function normalizeLedgerEntry(entry: LedgerEntryLike): LedgerEntry {
  const quantity = Number(entry.quantity);
  const safeQuantity = Number.isInteger(quantity) && quantity > 0 ? quantity : 1;

  return {
    ...entry,
    id: entry.id.trim(),
    date: entry.date.trim(),
    type: normalizeLedgerType(entry.type),
    category: entry.category.trim(),
    description: entry.description.trim(),
    quantity: safeQuantity,
    orderId: entry.orderId.trim()
  };
}

export function ledgerEntryTotal(input: { amount: number; quantity?: number }) {
  const amount = Number(input.amount);
  const quantity = Number(input.quantity);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const safeQuantity = Number.isInteger(quantity) && quantity > 0 ? quantity : 1;

  return safeAmount * safeQuantity;
}

export function calculateMonthlyFinanceReport(
  entries: LedgerEntryLike[],
  orders: AdminOrder[],
  month = currentMonthKey()
): FinanceReport {
  const normalizedEntries = entries
    .map(normalizeLedgerEntry)
    .filter((entry) => monthKey(entry.date) === month);
  const income = normalizedEntries
    .filter((entry) => entry.type === "income")
    .reduce((total, entry) => total + ledgerEntryTotal(entry), 0);
  const expenses = normalizedEntries
    .filter((entry) => entry.type === "expense")
    .reduce((total, entry) => total + ledgerEntryTotal(entry), 0);
  const confirmedPotential = orders
    .filter((order) => monthKey(order.eventDate) === month)
    .filter((order) => order.status === "confirmed" || order.status === "completed")
    .reduce((total, order) => total + order.estimateHigh, 0);

  return {
    month,
    entries: normalizedEntries,
    income,
    expenses,
    net: income - expenses,
    confirmedPotential
  };
}

export function buildLedgerCsvRows(entries: LedgerEntryLike[], month = currentMonthKey()) {
  return [
    ["date", "type", "category", "description", "quantity", "amount", "orderId"],
    ...entries
      .map(normalizeLedgerEntry)
      .filter((entry) => monthKey(entry.date) === month)
      .map((entry) => [
        entry.date,
        entry.type,
        entry.category,
        entry.description,
        entry.quantity,
        entry.amount,
        entry.orderId
      ])
  ];
}
