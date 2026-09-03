"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState, useSyncExternalStore } from "react";
import { CheckCircle2, Copy, Mail, WalletCards } from "lucide-react";
import { business } from "@/content/business";
import { pickupTimeLabel } from "@/lib/validation";

type StoredOrder = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  eventDate?: string;
  pickupTime?: string;
  productType?: string;
  cakeSizeId?: string;
  flavourId?: string;
  frostingId?: string;
  fillingIds?: string[];
  toppingIds?: string[];
  message?: string;
  paymentEmail?: string;
  summary: string;
};

const defaultPaymentEmail = business.orderEmail;

export default function OrderSummaryPage() {
  const order = useStoredOrder();
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const paymentEmail = defaultPaymentEmail;

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
          <Image className="mx-auto h-20 w-20 rounded-full object-cover" src="/meeras-logo-2.png" alt="" width={80} height={80} />
          <h1 className="mt-5 text-4xl font-black">No recent inquiry found.</h1>
          <p className="lede mt-4">Start a fresh quote and this page will show the inquiry details and post-acceptance payment guidance.</p>
          <Link className="btn-primary mt-6" href="/order">Start a quote</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section-wrap py-12 md:py-20">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <div className="flex items-center gap-3 text-[var(--accent)]">
            <CheckCircle2 size={28} aria-hidden="true" />
            <p className="text-sm font-black uppercase tracking-[0.08em]">Inquiry received</p>
          </div>
          <h1 className="page-title">Your inquiry is in for review.</h1>
          <p className="lede mt-6">
            Meera will review the details and confirm availability and the final price in writing.
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
              <h2 className="text-2xl font-black">Payment guidance after acceptance</h2>
            </div>
            <p className="mt-4 leading-7 text-[var(--muted)]">{business.depositPolicy}</p>
            <div className="mt-5 grid gap-4">
              <div className="rounded-[8px] bg-[var(--surface-warm)] p-4">
                <p className="text-sm font-black text-[var(--muted)]">E-transfer</p>
                <p className="mt-1 text-xl font-black">{paymentEmail}</p>
                <p className="mt-2 text-sm font-bold text-[var(--muted)]">Suggested memo: {transferNote}</p>
              </div>
            </div>
          </article>

          <article className="surface p-5">
            <h2 className="text-2xl font-black">Order summary</h2>
            <dl className="mt-5 grid gap-3 text-sm font-bold text-[var(--muted)] sm:grid-cols-2">
              <div><dt>Name</dt><dd className="text-[var(--foreground)]">{order.name || "To confirm"}</dd></div>
              <div><dt>Order ID</dt><dd className="text-[var(--foreground)]">{order.id}</dd></div>
              <div><dt>Pickup date</dt><dd className="text-[var(--foreground)]">{order.eventDate || "To confirm"}</dd></div>
              <div><dt>Pickup time</dt><dd className="text-[var(--foreground)]">{order.pickupTime ? pickupTimeLabel(order.pickupTime) : "To confirm"}</dd></div>
              <div><dt>Cake size</dt><dd className="text-[var(--foreground)]">{order.cakeSizeId || "To confirm"}</dd></div>
            </dl>
            <pre className="summary-preview mt-5 max-h-80">{order.summary}</pre>
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

        if (isStoredOrder(parsed)) {
          const order = normalizeStoredOrder(parsed);

          if (!urlOrderId || order.id === urlOrderId) {
            return order;
          }
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
    && (order.pickupTime === undefined || typeof order.pickupTime === "string")
    && (order.productType === undefined || typeof order.productType === "string")
    && (order.cakeSizeId === undefined || typeof order.cakeSizeId === "string")
    && (order.flavourId === undefined || typeof order.flavourId === "string")
    && (order.frostingId === undefined || typeof order.frostingId === "string")
    && (order.fillingIds === undefined || (Array.isArray(order.fillingIds) && order.fillingIds.every((item) => typeof item === "string")))
    && (order.toppingIds === undefined || (Array.isArray(order.toppingIds) && order.toppingIds.every((item) => typeof item === "string")))
    && (order.message === undefined || typeof order.message === "string")
    && (order.paymentEmail === undefined || typeof order.paymentEmail === "string");
}

function normalizeStoredText(value: string | undefined) {
  return value?.trim().replace(/\s+/g, " ");
}

function normalizeStoredOrder(order: StoredOrder): StoredOrder {
  return {
    ...order,
    id: normalizeStoredText(order.id) ?? "",
    name: normalizeStoredText(order.name),
    email: normalizeStoredText(order.email),
    phone: normalizeStoredText(order.phone),
    eventDate: normalizeStoredText(order.eventDate),
    pickupTime: normalizeStoredText(order.pickupTime),
    productType: normalizeStoredText(order.productType),
    cakeSizeId: normalizeStoredText(order.cakeSizeId),
    flavourId: normalizeStoredText(order.flavourId),
    frostingId: normalizeStoredText(order.frostingId),
    fillingIds: order.fillingIds?.map((item) => normalizeStoredText(item) ?? "").filter(Boolean),
    toppingIds: order.toppingIds?.map((item) => normalizeStoredText(item) ?? "").filter(Boolean),
    message: normalizeStoredText(order.message),
    paymentEmail: normalizeStoredText(order.paymentEmail),
    summary: order.summary.trim()
  };
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

  const id = normalizeStoredText(new URLSearchParams(window.location.search).get("id") ?? undefined);
  return id || undefined;
}
