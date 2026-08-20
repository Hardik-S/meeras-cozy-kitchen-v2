"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Download, Heart, Lock, Pin, Plus, Printer, RefreshCcw, Save, Star, Trash2 } from "lucide-react";
import { defaultAdminData, type AdminData, type AdminOffering, type AdminOrder, type AdminProduct, type LedgerEntry, type OrderStatus } from "@/lib/catalog";
import { buildLedgerCsvRows, calculateMonthlyFinanceReport, currentMonthKey, ledgerEntryTotal } from "@/lib/finance";
import type { ReviewStatus } from "@/lib/reviews";
import { pickupTimeLabel } from "@/lib/validation";

type Tab = "orders" | "reviews" | "products" | "finances" | "settings";

const statuses: OrderStatus[] = ["new", "replied", "confirmed", "completed", "cancelled"];

const emptyProduct: AdminProduct = {
  id: "new-product",
  label: "",
  low: 0,
  high: 0,
  enabled: true,
  sortOrder: 99
};

const emptyOffering: AdminOffering = {
  id: "new-offering",
  productId: "all",
  category: "topping",
  label: "",
  low: 0,
  high: 0,
  servings: "",
  enabled: true,
  sortOrder: 99
};

const emptyLedger: LedgerEntry = {
  id: "",
  date: new Date().toISOString().slice(0, 10),
  type: "income",
  category: "Order",
  description: "",
  amount: 0,
  quantity: 1,
  orderId: ""
};

function urgencyClass(order: AdminOrder) {
  const pickup = new Date(`${order.eventDate}T12:00:00`);
  const today = new Date();
  const days = Math.ceil((pickup.getTime() - today.getTime()) / 86_400_000);

  if (order.status === "completed" || order.status === "cancelled") return "note-calm";
  if (days <= 2) return "note-hot";
  if (days <= 7) return "note-warm";
  return "note-fresh";
}

function currency(value: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(value);
}

function priceLabel(low: number, high: number) {
  return low === high ? currency(low) : `${currency(low)}-${currency(high)}`;
}

function slug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function offeringLabel(
  offerings: AdminOffering[],
  id: string | undefined,
  category: AdminOffering["category"]
) {
  if (!id) return "Not recorded";

  return offerings.find((offering) => offering.id === id && offering.category === category)?.label ?? id;
}

function csvEscape(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function isAdminData(value: unknown): value is AdminData {
  if (!value || typeof value !== "object") return false;

  const data = value as Partial<AdminData>;
  return Boolean(data.settings && typeof data.settings === "object")
    && Array.isArray(data.products)
    && Array.isArray(data.offerings)
    && Array.isArray(data.orders)
    && Array.isArray(data.ledger)
    && Array.isArray(data.reviews);
}

function recordFromJson(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function AdminDashboard() {
  const [locked, setLocked] = useState(true);
  const [pin, setPin] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("orders");
  const [data, setData] = useState<AdminData>(defaultAdminData);
  const [settingsDraft, setSettingsDraft] = useState(defaultAdminData.settings);
  const [source, setSource] = useState("fallback");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [productDraft, setProductDraft] = useState<AdminProduct>(emptyProduct);
  const [offeringDraft, setOfferingDraft] = useState<AdminOffering>(emptyOffering);
  const [ledgerDraft, setLedgerDraft] = useState<LedgerEntry>(emptyLedger);
  const [financeMonth, setFinanceMonth] = useState(() => currentMonthKey());
  const [confettiKey, setConfettiKey] = useState(0);

  async function loadData() {
    let response: Response;
    let body: Record<string, unknown>;

    try {
      response = await fetch("/api/admin/data", { cache: "no-store" });
      body = recordFromJson(await response.json().catch(() => ({})));
    } catch {
      setNotice("Admin data could not be loaded.");
      return;
    }

    if (response.status === 401) {
      setLocked(true);
      return;
    }
    if (!response.ok || body.ok !== true || !isAdminData(body.data)) {
      setNotice(typeof body.error === "string" ? body.error : "Admin data could not be loaded.");
      return;
    }
    setData(body.data);
    setSettingsDraft(body.data.settings);
    setSource(typeof body.source === "string" ? body.source : "fallback");
    setLocked(false);
  }

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    let response: Response;

    try {
      response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin })
      });
    } catch {
      setNotice("Admin login could not be reached.");
      return;
    }

    if (!response.ok) {
      setNotice("That PIN did not open the kitchen.");
      return;
    }

    await loadData();
  }

  useEffect(() => {
    if (locked) return undefined;

    function refreshOnFocus() {
      if (document.visibilityState === "visible") {
        void loadData();
      }
    }

    document.addEventListener("visibilitychange", refreshOnFocus);

    return () => {
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, [locked]);

  async function mutate(
    action: string,
    payload: Record<string, unknown>,
    optimistic?: (current: AdminData) => AdminData
  ) {
    setNotice("");
    setConfettiKey((value) => value + 1);
    const previous = data;

    if (optimistic) {
      setData(optimistic);
    }

    let response: Response;
    let body: Record<string, unknown>;

    try {
      response = await fetch("/api/admin/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload })
      });
      body = recordFromJson(await response.json().catch(() => ({})));
    } catch {
      setData(previous);
      setNotice("Change could not be saved.");
      return false;
    }

    if (!response.ok || body.ok !== true) {
      setData(previous);
      setNotice(typeof body.error === "string" ? body.error : "Change could not be saved.");
      return false;
    }

    const result = recordFromJson(body.result);

    if ("data" in result && result.data !== undefined) {
      if (!isAdminData(result.data)) {
        setData(previous);
        setNotice("Change could not be saved.");
        return false;
      }

      setData(result.data);
      setSettingsDraft(result.data.settings);
    } else {
      await loadData();
    }
    setNotice("Saved.");
    return true;
  }

  const sortedOrders = useMemo(
    () => [...data.orders].sort((left, right) => Number(right.pinned) - Number(left.pinned) || left.eventDate.localeCompare(right.eventDate)),
    [data.orders]
  );
  const sortedReviews = useMemo(
    () => [...data.reviews].sort((left, right) => {
      const priority: Record<ReviewStatus, number> = { pending: 0, published: 1, hidden: 2 };
      return priority[left.status] - priority[right.status] || right.createdAt.localeCompare(left.createdAt);
    }),
    [data.reviews]
  );
  const financeReport = useMemo(
    () => calculateMonthlyFinanceReport(data.ledger, data.orders, financeMonth),
    [data.ledger, data.orders, financeMonth]
  );
  const topProduct = data.orders.reduce<Record<string, number>>((counts, order) => {
    counts[order.productType] = (counts[order.productType] ?? 0) + 1;
    return counts;
  }, {});

  function downloadCsv() {
    const rows = buildLedgerCsvRows(data.ledger, financeMonth);
    const blob = new Blob([rows.map((row) => row.map(csvEscape).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `meera-finance-ledger-${financeMonth}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (locked) {
    return (
      <section className="admin-shell section-wrap py-12 md:py-20">
        <div className="admin-lock">
          <Image className="brand-logo mx-auto" src="/meeras-logo.jpg" alt="" width={64} height={64} priority />
          <h1>Kitchen admin</h1>
          <p>Enter the private PIN to manage orders, reviews, products, reports, and email settings.</p>
          <form onSubmit={login} className="mt-6 grid gap-3">
            <label className="grid gap-2 text-sm font-black">
              Admin PIN
              <input value={pin} onChange={(event) => setPin(event.target.value)} className="admin-input text-center tracking-[0.35em]" inputMode="numeric" type="password" />
            </label>
            <button className="btn-primary" type="submit">
              <Lock size={18} aria-hidden="true" />
              Open admin
            </button>
          </form>
          {notice ? <p className="mt-4 text-sm font-bold text-[var(--accent-strong)]">{notice}</p> : null}
        </div>
      </section>
    );
  }

  return (
    <section className="admin-shell section-wrap py-10 md:py-14">
      <div className="admin-topbar">
        <div>
          <h1>Kitchen admin</h1>
          <p>Source: {source === "live" ? "Google Sheet" : "local fallback until Apps Script is configured"}</p>
        </div>
        <button className="btn-secondary" type="button" onClick={loadData}>
          <RefreshCcw size={17} aria-hidden="true" />
          Refresh
        </button>
      </div>

      <nav className="admin-tabs" aria-label="Admin tabs">
        {(["orders", "reviews", "products", "finances", "settings"] as Tab[]).map((tab) => (
          <button key={tab} type="button" className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </nav>
      {notice ? <p className="admin-notice">{notice}</p> : null}
      {confettiKey > 0 ? <AdminConfetti key={confettiKey} /> : null}

      {activeTab === "orders" ? (
        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="admin-panel">
            <h2>Preference trends</h2>
            <p className="text-sm leading-6 text-[var(--muted)]">Basic counts from submitted inquiries.</p>
            <div className="mt-4 grid gap-3">
              {Object.entries(topProduct).length ? Object.entries(topProduct).map(([product, count]) => (
                <div key={product} className="trend-row">
                  <span>{product}</span>
                  <strong>{count}</strong>
                </div>
              )) : <p className="text-sm font-bold text-[var(--muted)]">No orders yet.</p>}
            </div>
          </div>
          <div className="order-notes">
            {sortedOrders.length ? sortedOrders.map((order) => (
              <article key={order.id} className={`order-note ${urgencyClass(order)}`}>
                <button className="note-main" type="button" onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}>
                  <span>
                    <strong>{order.name}</strong>
                    <small>{order.eventDate} · {order.pickupTime ? pickupTimeLabel(order.pickupTime) : "time to confirm"} · {order.cakeSizeId} · {priceLabel(order.estimateLow, order.estimateHigh)}</small>
                  </span>
                  <span className="note-status">{order.status}</span>
                </button>
                <div className="note-actions">
                  <button type="button" onClick={() => mutate("updateOrderFlags", { id: order.id, hearted: !order.hearted, pinned: order.pinned }, (current) => ({
                    ...current,
                    orders: current.orders.map((item) => item.id === order.id ? { ...item, hearted: !item.hearted } : item)
                  }))} aria-label="Heart order">
                    <Heart size={17} fill={order.hearted ? "currentColor" : "none"} />
                  </button>
                  <button type="button" onClick={() => mutate("updateOrderFlags", { id: order.id, hearted: order.hearted, pinned: !order.pinned }, (current) => ({
                    ...current,
                    orders: current.orders.map((item) => item.id === order.id ? { ...item, pinned: !item.pinned } : item)
                  }))} aria-label="Pin order">
                    <Pin size={17} fill={order.pinned ? "currentColor" : "none"} />
                  </button>
                  <select value={order.status} onChange={(event) => mutate("updateOrderStatus", { id: order.id, status: event.target.value }, (current) => ({
                    ...current,
                    orders: current.orders.map((item) => item.id === order.id ? { ...item, status: event.target.value as OrderStatus } : item)
                  }))}>
                    {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
                {expandedOrderId === order.id ? (
                  <div className="note-detail">
                    <p>{order.message}</p>
                    <p><strong>Cake size:</strong> {order.cakeSizeId}</p>
                    <p><strong>Cake flavour:</strong> {offeringLabel(data.offerings, order.flavourId, "flavour")}</p>
                    <p><strong>Frosting flavour:</strong> {offeringLabel(data.offerings, order.frostingId, "frosting")}</p>
                    <p><strong>Fillings:</strong> {order.fillingIds?.length ? order.fillingIds.join(", ") : "None"}</p>
                    <p><strong>Toppings:</strong> {order.toppingIds?.length ? order.toppingIds.join(", ") : "None"}</p>
                    <p><strong>Email:</strong> {order.email}</p>
                    <p><strong>Phone:</strong> {order.phone}</p>
                    <pre>{order.summary}</pre>
                  </div>
                ) : null}
              </article>
            )) : <div className="admin-panel"><h2>No notes yet</h2><p>Submitted inquiries will appear here as note blocks.</p></div>}
          </div>
        </div>
      ) : null}

      {activeTab === "reviews" ? (
        <div className="grid gap-5 lg:grid-cols-[0.7fr_1.3fr]">
          <div className="admin-panel">
            <h2>Review moderation</h2>
            <p className="text-sm leading-6 text-[var(--muted)]">Publish customer reviews, hide them from the public page, or permanently delete them.</p>
            <div className="mt-4 grid gap-3">
              <div className="trend-row"><span>Pending</span><strong>{data.reviews.filter((review) => review.status === "pending").length}</strong></div>
              <div className="trend-row"><span>Published</span><strong>{data.reviews.filter((review) => review.status === "published").length}</strong></div>
              <div className="trend-row"><span>Hidden</span><strong>{data.reviews.filter((review) => review.status === "hidden").length}</strong></div>
            </div>
          </div>
          <div className="admin-list">
            {sortedReviews.length ? sortedReviews.map((review) => (
              <article className="admin-panel admin-review-card" key={review.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <span>
                    <strong className="block text-lg">{review.name}</strong>
                    <small className="block text-[var(--muted)]">{review.email} · {review.createdAt.slice(0, 10)}</small>
                  </span>
                  <span className="note-status">{review.status}</span>
                </div>
                <div className="review-stars review-stars-static mt-3" aria-label={`${review.rating} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      aria-hidden="true"
                      className={star <= review.rating ? "review-star-filled" : "review-star-empty"}
                      key={star}
                      size={20}
                    />
                  ))}
                </div>
                <p className="review-description mt-3 leading-6 text-[var(--muted)]">{review.description}</p>
                <div className="row-actions mt-4 flex flex-wrap gap-2">
                  {review.status !== "published" ? (
                    <button type="button" onClick={() => mutate("updateReviewStatus", { id: review.id, status: "published" }, (current) => ({
                      ...current,
                      reviews: current.reviews.map((item) => item.id === review.id ? { ...item, status: "published" } : item)
                    }))}>Publish</button>
                  ) : null}
                  {review.status !== "hidden" ? (
                    <button type="button" onClick={() => mutate("updateReviewStatus", { id: review.id, status: "hidden" }, (current) => ({
                      ...current,
                      reviews: current.reviews.map((item) => item.id === review.id ? { ...item, status: "hidden" } : item)
                    }))}>Hide</button>
                  ) : null}
                  <button
                    aria-label={`Delete review from ${review.name}`}
                    type="button"
                    onClick={() => {
                      if (!window.confirm(`Permanently delete the review from ${review.name}?`)) return;
                      void mutate("deleteReview", { id: review.id }, (current) => ({
                        ...current,
                        reviews: current.reviews.filter((item) => item.id !== review.id)
                      }));
                    }}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    Delete
                  </button>
                </div>
              </article>
            )) : (
              <div className="admin-panel">
                <h2>No reviews yet</h2>
                <p className="mt-2 text-[var(--muted)]">New review submissions will appear here for approval.</p>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {activeTab === "products" ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="admin-panel">
            <h2>Products</h2>
            <div className="admin-list">
              {data.products.map((product) => (
                <div key={product.id} className="admin-row">
                  <span><strong>{product.label}</strong><small>{priceLabel(product.low, product.high)}</small></span>
                  <span className="row-actions">
                    <button type="button" onClick={() => mutate("toggleProduct", { id: product.id, enabled: !product.enabled }, (current) => ({
                      ...current,
                      products: current.products.map((item) => item.id === product.id ? { ...item, enabled: !item.enabled } : item)
                    }))}>{product.enabled ? "Disable" : "Enable"}</button>
                    <button type="button" onClick={() => mutate("deleteProduct", { id: product.id }, (current) => ({
                      ...current,
                      products: current.products.filter((item) => item.id !== product.id)
                    }))}><Trash2 size={16} /></button>
                  </span>
                </div>
              ))}
            </div>
            <ProductEditor product={productDraft} onChange={setProductDraft} onSave={(product) => mutate("upsertProduct", { product: { ...product, id: slug(product.label || product.id) } })} />
          </div>
          <div className="admin-panel">
            <h2>Sub-offerings</h2>
            <div className="admin-list">
              {data.offerings.map((offering) => (
                <div key={offering.id} className="admin-row">
                  <span><strong>{offering.label}</strong><small>{offering.category} · {offering.low || offering.high ? priceLabel(offering.low, offering.high) : "included"}</small></span>
                  <span className="row-actions">
                    <button type="button" onClick={() => mutate("toggleOffering", { id: offering.id, enabled: !offering.enabled }, (current) => ({
                      ...current,
                      offerings: current.offerings.map((item) => item.id === offering.id ? { ...item, enabled: !item.enabled } : item)
                    }))}>{offering.enabled ? "Disable" : "Enable"}</button>
                    <button type="button" onClick={() => mutate("deleteOffering", { id: offering.id }, (current) => ({
                      ...current,
                      offerings: current.offerings.filter((item) => item.id !== offering.id)
                    }))}><Trash2 size={16} /></button>
                  </span>
                </div>
              ))}
            </div>
            <OfferingEditor offering={offeringDraft} onChange={setOfferingDraft} onSave={(offering) => mutate("upsertOffering", { offering: { ...offering, id: slug(offering.label || offering.id) } })} />
          </div>
        </div>
      ) : null}

      {activeTab === "finances" ? (
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="admin-panel report-panel">
            <h2>Financial snapshot</h2>
            <label className="mt-4 grid gap-2 text-sm font-black">
              Report month
              <input className="admin-input" type="month" value={financeMonth} onChange={(event) => setFinanceMonth(event.target.value)} />
            </label>
            <div className="finance-metrics">
              <strong>{currency(financeReport.income)}<span>ledger income</span></strong>
              <strong>{currency(financeReport.expenses)}<span>expenses</span></strong>
              <strong>{currency(financeReport.net)}<span>net</span></strong>
              <strong>{currency(financeReport.confirmedPotential)}<span>confirmed order value</span></strong>
            </div>
            <div className="chart-bars" aria-label="Finance chart">
              <span style={{ height: `${Math.max(8, Math.min(100, financeReport.income))}%` }}>Income</span>
              <span style={{ height: `${Math.max(8, Math.min(100, financeReport.expenses))}%` }}>Expenses</span>
              <span style={{ height: `${Math.max(8, Math.min(100, Math.abs(financeReport.net)))}%` }}>Net</span>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button className="btn-secondary" type="button" onClick={downloadCsv}><Download size={17} /> CSV</button>
              <button className="btn-secondary" type="button" onClick={() => window.print()}><Printer size={17} /> PDF</button>
            </div>
          </div>
          <div className="admin-panel">
            <h2>Ledger</h2>
            <LedgerEditor entry={ledgerDraft} onChange={setLedgerDraft} onSave={(entry) => {
              const savedEntry = {
                ...entry,
                id: entry.id || undefined,
                amount: entry.amount,
                quantity: entry.quantity || 1
              };

              void mutate("upsertLedgerEntry", { entry: savedEntry }, (current) => ({
                ...current,
                ledger: [
                  { ...savedEntry, id: entry.id || `local_${Date.now()}` } as LedgerEntry,
                  ...current.ledger.filter((item) => item.id !== entry.id)
                ]
              }));
              setLedgerDraft(emptyLedger);
            }} />
            <div className="admin-list mt-5">
              {financeReport.entries.map((entry) => (
                <div key={entry.id} className="admin-row">
                  <span><strong>{entry.description}</strong><small>{entry.date} - {entry.category} - qty {entry.quantity}</small></span>
                  <strong>{entry.type === "expense" ? "-" : ""}{currency(ledgerEntryTotal(entry))}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "settings" ? (
        <div className="admin-panel max-w-3xl">
          <h2>Email settings</h2>
          <SettingsEditor settings={settingsDraft} setSettings={setSettingsDraft} save={async () => {
            const previousSettings = data.settings;
            const saved = await mutate("updateSettings", { settings: settingsDraft }, (current) => ({
              ...current,
              settings: settingsDraft
            }));

            if (!saved) {
              setSettingsDraft(previousSettings);
            }
          }} />
        </div>
      ) : null}
    </section>
  );
}

function ProductEditor({ product, onChange, onSave }: { product: AdminProduct; onChange: (product: AdminProduct) => void; onSave: (product: AdminProduct) => void }) {
  return (
    <div className="admin-form">
      <input className="admin-input" placeholder="Product name" value={product.label} onChange={(event) => onChange({ ...product, label: event.target.value })} />
      <input className="admin-input" placeholder="Low" type="number" value={product.low} onChange={(event) => onChange({ ...product, low: Number(event.target.value) })} />
      <input className="admin-input" placeholder="High" type="number" value={product.high} onChange={(event) => onChange({ ...product, high: Number(event.target.value) })} />
      <button className="btn-primary" type="button" onClick={() => onSave(product)}><Plus size={17} /> Save product</button>
    </div>
  );
}

function OfferingEditor({ offering, onChange, onSave }: { offering: AdminOffering; onChange: (offering: AdminOffering) => void; onSave: (offering: AdminOffering) => void }) {
  return (
    <div className="admin-form">
      <input className="admin-input" placeholder="Offering name" value={offering.label} onChange={(event) => onChange({ ...offering, label: event.target.value })} />
      <select className="admin-input" value={offering.category} onChange={(event) => onChange({ ...offering, category: event.target.value as AdminOffering["category"] })}>
        <option value="cake-size">Cake size</option>
        <option value="flavour">Flavour</option>
        <option value="frosting">Frosting</option>
        <option value="filling">Filling</option>
        <option value="topping">Topping</option>
      </select>
      <input className="admin-input" placeholder="Low" type="number" value={offering.low} onChange={(event) => onChange({ ...offering, low: Number(event.target.value) })} />
      <input className="admin-input" placeholder="High" type="number" value={offering.high} onChange={(event) => onChange({ ...offering, high: Number(event.target.value) })} />
      <button className="btn-primary" type="button" onClick={() => onSave(offering)}><Plus size={17} /> Save offering</button>
    </div>
  );
}

function LedgerEditor({ entry, onChange, onSave }: { entry: LedgerEntry; onChange: (entry: LedgerEntry) => void; onSave: (entry: LedgerEntry) => void }) {
  return (
    <div className="admin-form">
      <label className="grid gap-2 text-sm font-black">Date
        <input className="admin-input" type="date" value={entry.date} onChange={(event) => onChange({ ...entry, date: event.target.value })} />
      </label>
      <label className="grid gap-2 text-sm font-black">Type
        <select className="admin-input" value={entry.type} onChange={(event) => onChange({ ...entry, type: event.target.value as LedgerEntry["type"] })}>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </label>
      <label className="grid gap-2 text-sm font-black">Category
        <input className="admin-input" placeholder="Category" value={entry.category} onChange={(event) => onChange({ ...entry, category: event.target.value })} />
      </label>
      <label className="grid gap-2 text-sm font-black">Description
        <input className="admin-input" placeholder="Description" value={entry.description} onChange={(event) => onChange({ ...entry, description: event.target.value })} />
      </label>
      <label className="grid gap-2 text-sm font-black">Unit amount
        <input className="admin-input" placeholder="Unit amount" type="number" value={entry.amount} onChange={(event) => onChange({ ...entry, amount: Number(event.target.value) })} />
      </label>
      <label className="grid gap-2 text-sm font-black">Quantity
        <input className="admin-input" placeholder="Quantity" min={1} type="number" value={entry.quantity} onChange={(event) => onChange({ ...entry, quantity: Number(event.target.value) || 1 })} />
      </label>
      <p className="text-sm font-bold text-[var(--muted)]">Saved total: {currency(ledgerEntryTotal({ amount: entry.amount, quantity: entry.quantity }))}</p>
      <button className="btn-primary" type="button" onClick={() => onSave(entry)}><Save size={17} /> Save ledger entry</button>
    </div>
  );
}

function SettingsEditor({ settings, setSettings, save }: { settings: AdminData["settings"]; setSettings: (settings: AdminData["settings"]) => void; save: () => void }) {
  return (
    <div className="grid gap-4">
      <label className="grid gap-2 text-sm font-black">Default sender
        <input className="admin-input" value={settings.defaultSender} onChange={(event) => setSettings({ ...settings, defaultSender: event.target.value })} />
      </label>
      <label className="grid gap-2 text-sm font-black">Default receiver
        <input className="admin-input" value={settings.defaultReceiver} onChange={(event) => setSettings({ ...settings, defaultReceiver: event.target.value })} />
      </label>
      <label className="grid gap-2 text-sm font-black">Sender display name
        <input className="admin-input" value={settings.senderName} onChange={(event) => setSettings({ ...settings, senderName: event.target.value })} />
      </label>
      <label className="grid gap-2 text-sm font-black">Chef notification copy
        <textarea className="admin-input min-h-28" value={settings.chefNotificationCopy} onChange={(event) => setSettings({ ...settings, chefNotificationCopy: event.target.value })} />
      </label>
      <button className="btn-primary" type="button" onClick={save}><Save size={17} /> Save settings</button>
    </div>
  );
}

function AdminConfetti() {
  return (
    <div className="admin-confetti" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}
