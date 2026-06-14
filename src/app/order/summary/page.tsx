"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState, useSyncExternalStore } from "react";
import { CheckCircle2, Copy, Mail, WalletCards } from "lucide-react";

type StoredOrder = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  eventDate?: string;
  productType?: string;
  cakeSizeId?: string;
  flavourId?: string;
  servings?: number;
  budget?: string;
  message?: string;
  paymentEmail: string;
  summary: string;
};

const defaultPaymentEmail = "m.ssethi1123@gmail.com";

export default function OrderSummaryPage() {
  const order = useStoredOrder();
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const paymentEmail = paymentEmailOrDefault(order?.paymentEmail);

  const transferNote = useMemo(() => {
    if (!order) return "";

    return order.name ? `Meera order ${order.id} - ${order.name}` : `Meera order ${order.id}`;
  }, [order]);

  async function copyPaymentDetails() {
    try {
      await navigator.clipboard.writeText(`E-transfer: ${paymentEmail}\nMemo: ${transferNote}`);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopied(false);
      setCopyFailed(true);
    }
  }

  if (!order) {
    return (
      <section className="section-wrap grid min-h-[60vh] place-items-center py-16 text-center">
        <div className="surface max-w-xl p-6">
          <Image className="mx-auto h-20 w-20 rounded-full object-cover" src="/logo.png" alt="" width={80} height={80} />
          <h1 className="mt-5 text-4xl font-black">No recent inquiry found.</h1>
          <p className="lede mt-4">Start a fresh quote and this page will show the payment instructions after submission.</p>
          <Link className="btn-primary mt-6" href="/order">Start a quote</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section-wrap py-12 md:py-20">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <div className="flex items-center gap-3 text-[var(--sage)]">
            <CheckCircle2 size={28} aria-hidden="true" />
            <p className="text-sm font-black uppercase tracking-[0.08em]">Inquiry received</p>
          </div>
          <h1 className="page-title">Here are your payment instructions.</h1>
          <p className="lede mt-6">
            Meera will review the details before confirming the order. Use these details if she asks for a deposit or balance payment.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <button className="btn-primary click-pop" type="button" onClick={copyPaymentDetails}>
              <Copy size={18} aria-hidden="true" />
              {copied ? "Copied" : "Copy e-transfer details"}
            </button>
            <a className="btn-secondary click-pop" href={`mailto:${paymentEmail}?subject=${encodeURIComponent(transferNote)}`}>
              <Mail size={18} aria-hidden="true" />
              Email Meera
            </a>
          </div>
          {copyFailed ? (
            <p className="mt-3 text-sm font-bold text-[var(--accent-strong)]">
              Copy failed. Use the email button or select the payment details manually.
            </p>
          ) : null}
        </div>

        <div className="grid gap-5">
          <article className="surface p-5">
            <div className="flex items-center gap-3">
              <WalletCards className="text-[var(--accent-strong)]" size={24} aria-hidden="true" />
              <h2 className="text-2xl font-black">Payment methods</h2>
            </div>
            <div className="mt-5 grid gap-4">
              <div className="rounded-[8px] bg-[var(--surface-warm)] p-4">
                <p className="text-sm font-black text-[var(--muted)]">E-transfer</p>
                <p className="mt-1 text-xl font-black">{paymentEmail}</p>
                <p className="mt-2 text-sm font-bold text-[var(--muted)]">Suggested memo: {transferNote}</p>
              </div>
              <div className="rounded-[8px] bg-white/80 p-4">
                <p className="text-sm font-black text-[var(--muted)]">Cash</p>
                <p className="mt-1 font-bold">Cash can be arranged directly with Meera for pickup.</p>
              </div>
            </div>
          </article>

          <article className="surface p-5">
            <h2 className="text-2xl font-black">Order summary</h2>
            <dl className="mt-5 grid gap-3 text-sm font-bold text-[var(--muted)] sm:grid-cols-2">
              <div><dt>Name</dt><dd className="text-[var(--foreground)]">{order.name || "To confirm"}</dd></div>
              <div><dt>Order ID</dt><dd className="text-[var(--foreground)]">{order.id}</dd></div>
              <div><dt>Pickup date</dt><dd className="text-[var(--foreground)]">{order.eventDate || "To confirm"}</dd></div>
              <div><dt>Product</dt><dd className="text-[var(--foreground)]">{order.productType || "Custom order"}</dd></div>
            </dl>
            <pre className="mt-5 max-h-80 overflow-auto whitespace-pre-wrap rounded-[8px] bg-[#fffdf8] p-4 text-sm leading-6 text-[var(--muted)]">{order.summary}</pre>
          </article>
        </div>
      </div>
    </section>
  );
}

function useStoredOrder() {
  const urlOrderId = useSyncExternalStore(
    () => () => undefined,
    () => readOrderIdFromLocation(),
    () => undefined
  );
  const rawOrder = useSyncExternalStore(
    () => () => undefined,
    () => readStoredOrder(),
    () => null
  );

  return useMemo(() => {
    if (rawOrder) {
      try {
        const parsed = JSON.parse(rawOrder);

        if (isStoredOrder(parsed) && (!urlOrderId || parsed.id === urlOrderId)) {
          return parsed;
        }
      } catch {
        // Fall through to the URL id fallback below.
      }
    }

    if (!urlOrderId) return null;

    return {
      id: urlOrderId,
      paymentEmail: defaultPaymentEmail,
      summary: "Your inquiry was received. Meera will confirm the details directly."
    };
  }, [rawOrder, urlOrderId]);
}

function isStoredOrder(value: unknown): value is StoredOrder {
  if (!value || typeof value !== "object") return false;

  const order = value as Record<string, unknown>;

  return typeof order.id === "string"
    && order.id.trim().length > 0
    && typeof order.summary === "string"
    && order.summary.trim().length > 0
    && (order.name === undefined || typeof order.name === "string")
    && (order.email === undefined || typeof order.email === "string")
    && (order.phone === undefined || typeof order.phone === "string")
    && (order.eventDate === undefined || typeof order.eventDate === "string")
    && (order.productType === undefined || typeof order.productType === "string")
    && (order.cakeSizeId === undefined || typeof order.cakeSizeId === "string")
    && (order.flavourId === undefined || typeof order.flavourId === "string")
    && (order.servings === undefined || typeof order.servings === "number")
    && (order.budget === undefined || typeof order.budget === "string")
    && (order.message === undefined || typeof order.message === "string")
    && (order.paymentEmail === undefined || typeof order.paymentEmail === "string");
}

function paymentEmailOrDefault(value: string | undefined) {
  const email = value?.trim();

  if (!email || !/^[^\s@?&=]+@[^\s@?&=]+\.[^\s@?&=]+$/.test(email)) {
    return defaultPaymentEmail;
  }

  return email;
}

function readStoredOrder() {
  try {
    return sessionStorage.getItem("meera:last-order");
  } catch {
    return null;
  }
}

function readOrderIdFromLocation() {
  if (typeof window === "undefined") return undefined;

  const id = new URLSearchParams(window.location.search).get("id")?.trim();
  return id || undefined;
}
