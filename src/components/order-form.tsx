"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Mail, Send } from "lucide-react";
import { business } from "@/content/business";
import { defaultPublicCatalog, type PublicCatalog } from "@/lib/catalog";
import { loadPublicCatalog, schedulePublicCatalogSync } from "@/lib/public-catalog-sync";
import { calculateQuoteEstimate, quoteRangeLabel, type ProductType } from "@/lib/pricing";
import { getMinimumPickupDate } from "@/lib/dates";
import { buildInquirySummary } from "@/lib/inquiry-summary";
import { createInquirySchema, type InquiryInput } from "@/lib/validation";

type FormState = {
  name: string;
  email: string;
  phone: string;
  eventDate: string;
  servings: string;
  productType: ProductType;
  cakeSizeId: string;
  flavourId: string;
  addOnIds: string[];
  budget: string;
  message: string;
  acknowledgements: {
    notice: boolean;
    allergens: boolean;
    address: boolean;
    certification: boolean;
  };
  website: string;
};

type SubmittedOrder = {
  id: string;
  name: string;
  email: string;
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

const initialForm: FormState = {
  name: "",
  email: "",
  phone: "",
  eventDate: "",
  servings: "12",
  productType: "cake",
  cakeSizeId: "six-inch",
  flavourId: "vanilla-rose",
  addOnIds: [],
  budget: "",
  message: "",
  acknowledgements: {
    notice: false,
    allergens: false,
    address: false,
    certification: false
  },
  website: ""
};

function toPayload(form: FormState) {
  return {
    ...form,
    servings: Number(form.servings),
    cakeSizeId: form.productType === "cake" ? form.cakeSizeId : undefined
  };
}

function mailtoLink(summary: string) {
  const subject = encodeURIComponent(`Bakery inquiry for ${business.name}`);
  const body = encodeURIComponent(summary);

  return `mailto:${business.orderEmail}?subject=${subject}&body=${body}`;
}

function storeSubmittedOrder(order: SubmittedOrder) {
  try {
    sessionStorage.setItem("meera:last-order", JSON.stringify(order));
  } catch {
    // Browser storage can be unavailable in privacy modes; the inquiry already succeeded.
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function recordFromJson(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function isSubmittedOrder(value: unknown): value is SubmittedOrder {
  if (!value || typeof value !== "object") {
    return false;
  }

  const order = value as Record<string, unknown>;

  return isNonEmptyString(order.id)
    && isNonEmptyString(order.name)
    && isNonEmptyString(order.email)
    && isOptionalString(order.phone)
    && isOptionalString(order.eventDate)
    && isOptionalString(order.productType)
    && isOptionalString(order.cakeSizeId)
    && isOptionalString(order.flavourId)
    && (order.servings === undefined || typeof order.servings === "number")
    && isOptionalString(order.budget)
    && isOptionalString(order.message)
    && isNonEmptyString(order.paymentEmail)
    && isNonEmptyString(order.summary);
}

function buildPendingOrder(data: InquiryInput, summary: string): SubmittedOrder {
  return {
    id: `pending_${Date.now()}`,
    name: data.name,
    email: data.email,
    phone: data.phone,
    eventDate: data.eventDate,
    productType: data.productType,
    cakeSizeId: data.cakeSizeId ?? "",
    flavourId: data.flavourId ?? "",
    servings: data.servings,
    budget: data.budget,
    message: data.message,
    paymentEmail: "m.ssethi1123@gmail.com",
    summary
  };
}

function isOfferingAvailableForProduct(offering: { productId: string }, productType: ProductType) {
  return offering.productId === "all" || offering.productId === productType;
}

function scopeCatalogToProduct(catalog: PublicCatalog, productType: ProductType): PublicCatalog {
  const offerings = catalog.offerings.filter((offering) => isOfferingAvailableForProduct(offering, productType));

  return {
    ...catalog,
    offerings,
    cakeSizes: catalog.cakeSizes.filter((size) => isOfferingAvailableForProduct(size, productType)),
    flavours: catalog.flavours.filter((flavour) => isOfferingAvailableForProduct(flavour, productType)),
    addOns: catalog.addOns.filter((addOn) => isOfferingAvailableForProduct(addOn, productType))
  };
}

function availableId<T extends { id: string }>(items: T[], currentId: string) {
  return items.some((item) => item.id === currentId) ? currentId : items[0]?.id ?? currentId;
}

function reconcileFormWithCatalog(form: FormState, catalog: PublicCatalog): FormState {
  const productType = catalog.products.some((product) => product.id === form.productType)
    ? form.productType
    : catalog.products[0]?.id ?? form.productType;
  const scopedCatalog = scopeCatalogToProduct(catalog, productType);

  return {
    ...form,
    productType,
    cakeSizeId: productType === "cake" ? availableId(scopedCatalog.cakeSizes, form.cakeSizeId) : form.cakeSizeId,
    flavourId: availableId(scopedCatalog.flavours, form.flavourId),
    addOnIds: form.addOnIds.filter((id) => scopedCatalog.addOns.some((addOn) => addOn.id === id))
  };
}

export function OrderForm({ catalog = defaultPublicCatalog }: { catalog?: PublicCatalog }) {
  const router = useRouter();
  const [liveCatalog, setLiveCatalog] = useState(catalog);
  const [form, setForm] = useState<FormState>(() =>
    reconcileFormWithCatalog({
      ...initialForm,
      productType: catalog.products[0]?.id ?? initialForm.productType
    }, catalog)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error" | "copied" | "copy-error">("idle");
  const [summary, setSummary] = useState("");
  const [confettiKey, setConfettiKey] = useState(0);
  const scopedCatalog = useMemo(
    () => scopeCatalogToProduct(liveCatalog, form.productType),
    [liveCatalog, form.productType]
  );
  const estimate = useMemo(
    () =>
      calculateQuoteEstimate({
        productType: form.productType,
        cakeSizeId: form.cakeSizeId,
        addOnIds: form.addOnIds
      },
      {
        products: liveCatalog.products,
        cakeSizes: scopedCatalog.cakeSizes,
        addOns: scopedCatalog.addOns
      }),
    [liveCatalog.products, scopedCatalog.addOns, scopedCatalog.cakeSizes, form.addOnIds, form.cakeSizeId, form.productType]
  );
  const minimumDate = getMinimumPickupDate();
  const previewInquiry: InquiryInput = {
    name: form.name || "Not provided",
    email: form.email || "not-provided@example.com",
    phone: form.phone || "Not provided",
    eventDate: form.eventDate || minimumDate,
    servings: Number(form.servings) || 1,
    productType: form.productType,
    cakeSizeId: form.productType === "cake" ? form.cakeSizeId : undefined,
    flavourId: form.flavourId,
    addOnIds: form.addOnIds,
    budget: form.budget,
    message: form.message || "Not provided yet.",
    acknowledgements: {
      notice: true,
      allergens: true,
      address: true,
      certification: true
    },
    website: ""
  };
  const currentSummary = summary || buildInquirySummary(previewInquiry, scopedCatalog);

  useEffect(() => {
    let active = true;

    const cancel = schedulePublicCatalogSync(() => {
      void loadPublicCatalog(catalog).then((result) => {
        if (active) {
          const nextCatalog = result.catalog;
          setLiveCatalog(nextCatalog);
          setForm((current) => reconcileFormWithCatalog(current, nextCatalog));
        }
      });
    });

    return () => {
      active = false;
      cancel();
    };
  }, [catalog]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  function selectProductType(productType: ProductType) {
    setForm((current) => reconcileFormWithCatalog({ ...current, productType }, liveCatalog));
    setErrors((current) => ({
      ...current,
      productType: "",
      cakeSizeId: "",
      flavourId: "",
      addOnIds: ""
    }));
  }

  function toggleAddOn(id: string) {
    setForm((current) => ({
      ...current,
      addOnIds: current.addOnIds.includes(id)
        ? current.addOnIds.filter((item) => item !== id)
        : [...current.addOnIds, id]
    }));
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(currentSummary);
      setSummary(currentSummary);
      setStatus("copied");
    } catch {
      setSummary(currentSummary);
      setStatus("copy-error");
    }
  }

  async function submitInquiry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setConfettiKey((value) => value + 1);
    setErrors({});

    const parsed = createInquirySchema().safeParse(toPayload(form));
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors(
        Object.fromEntries(
          Object.entries(fieldErrors).map(([key, value]) => [key, value?.[0] ?? "Please review this field."])
        )
      );
      setStatus("error");
      return;
    }

    const nextSummary = buildInquirySummary(parsed.data, scopedCatalog);
    setSummary(nextSummary);

    let response: Response;
    let body: Record<string, unknown>;

    try {
      response = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data)
      });
      body = recordFromJson(await response.json().catch(() => ({})));
    } catch {
      setStatus("error");
      return;
    }

    if (!response.ok || body.ok !== true) {
      setStatus("error");
      return;
    }

    const order = isSubmittedOrder(body.order) ? body.order : buildPendingOrder(parsed.data, nextSummary);
    storeSubmittedOrder(order);
    setStatus("sent");
    router.push(`/order/summary?id=${encodeURIComponent(order.id)}`);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
      <form className="surface grid gap-5 p-5 md:p-6" onSubmit={submitInquiry}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-black">
            Name
            <input className="rounded-[8px] border border-[var(--line)] px-3 py-3 font-semibold" value={form.name} onChange={(event) => update("name", event.target.value)} />
            {errors.name ? <span className="text-sm font-bold text-[var(--accent-strong)]">{errors.name}</span> : null}
          </label>
          <label className="grid gap-2 text-sm font-black">
            Email
            <input className="rounded-[8px] border border-[var(--line)] px-3 py-3 font-semibold" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} />
            {errors.email ? <span className="text-sm font-bold text-[var(--accent-strong)]">{errors.email}</span> : null}
          </label>
          <label className="grid gap-2 text-sm font-black">
            Phone
            <input className="rounded-[8px] border border-[var(--line)] px-3 py-3 font-semibold" value={form.phone} onChange={(event) => update("phone", event.target.value)} />
            {errors.phone ? <span className="text-sm font-bold text-[var(--accent-strong)]">{errors.phone}</span> : null}
          </label>
          <label className="grid gap-2 text-sm font-black">
            Pickup date
            <input className="rounded-[8px] border border-[var(--line)] px-3 py-3 font-semibold" min={minimumDate} type="date" value={form.eventDate} onChange={(event) => update("eventDate", event.target.value)} />
            {errors.eventDate ? <span className="text-sm font-bold text-[var(--accent-strong)]">{errors.eventDate}</span> : null}
          </label>
        </div>

        <input aria-hidden="true" className="hidden" tabIndex={-1} value={form.website} onChange={(event) => update("website", event.target.value)} name="website" />

        <fieldset className="grid gap-3">
          <legend className="text-sm font-black">Product</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {liveCatalog.products.map((product) => (
              <button
                className={`rounded-[8px] border p-4 text-left font-black ${form.productType === product.id ? "border-[var(--accent)] bg-[var(--surface-rose)]" : "border-[var(--line)] bg-white/70"}`}
                key={product.id}
                type="button"
                onClick={() => selectProductType(product.id)}
              >
                {product.label}
              </button>
            ))}
          </div>
        </fieldset>

        {form.productType === "cake" ? (
          <fieldset className="grid gap-3">
            <legend className="text-sm font-black">Cake size</legend>
            <div className="grid gap-3 sm:grid-cols-3">
            {scopedCatalog.cakeSizes.map((size) => (
                <button
                  className={`rounded-[8px] border p-4 text-left ${form.cakeSizeId === size.id ? "border-[var(--accent)] bg-[var(--surface-rose)]" : "border-[var(--line)] bg-white/70"}`}
                  key={size.id}
                  type="button"
                  onClick={() => update("cakeSizeId", size.id)}
                >
                  <span className="block font-black">{size.label}</span>
                  <span className="mt-1 block text-sm font-bold text-[var(--muted)]">{size.servings} servings</span>
                </button>
              ))}
            </div>
          </fieldset>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-black">
            Flavour
            <select className="rounded-[8px] border border-[var(--line)] px-3 py-3 font-semibold" value={form.flavourId} onChange={(event) => update("flavourId", event.target.value)}>
              {scopedCatalog.flavours.map((flavour) => (
                <option key={flavour.id} value={flavour.id}>
                  {flavour.label}
                </option>
              ))}
            </select>
            {errors.flavourId ? <span className="text-sm font-bold text-[var(--accent-strong)]">{errors.flavourId}</span> : null}
          </label>
          <label className="grid gap-2 text-sm font-black">
            Servings
            <input className="rounded-[8px] border border-[var(--line)] px-3 py-3 font-semibold" min={1} max={120} type="number" value={form.servings} onChange={(event) => update("servings", event.target.value)} />
            {errors.servings ? <span className="text-sm font-bold text-[var(--accent-strong)]">{errors.servings}</span> : null}
          </label>
        </div>

        <fieldset className="grid gap-3">
          <legend className="text-sm font-black">Add-ons</legend>
          <div className="grid gap-2">
            {scopedCatalog.addOns.map((addOn) => (
              <label key={addOn.id} className="flex items-center justify-between gap-3 rounded-[8px] border border-[var(--line)] bg-white/70 p-3">
                <span className="flex items-center gap-3 font-bold">
                  <input type="checkbox" checked={form.addOnIds.includes(addOn.id)} onChange={() => toggleAddOn(addOn.id)} />
                  {addOn.label}
                </span>
                <span className="text-sm font-extrabold text-[var(--accent-strong)]">{quoteRangeLabel(addOn)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="grid gap-2 text-sm font-black">
          Budget
          <input className="rounded-[8px] border border-[var(--line)] px-3 py-3 font-semibold" value={form.budget} onChange={(event) => update("budget", event.target.value)} placeholder="Example: 100-150" />
        </label>

        <label className="grid gap-2 text-sm font-black">
          Design notes
          <textarea className="min-h-32 rounded-[8px] border border-[var(--line)] px-3 py-3 font-semibold" value={form.message} onChange={(event) => update("message", event.target.value)} placeholder="Occasion, colours, inspiration, allergy notes, pickup timing..." />
          {errors.message ? <span className="text-sm font-bold text-[var(--accent-strong)]">{errors.message}</span> : null}
        </label>

        <fieldset className="grid gap-3">
          <legend className="text-sm font-black">Required acknowledgements</legend>
          {[
            ["notice", business.noticeCopy],
            ["allergens", business.allergenNotice],
            ["address", business.pickupPolicy],
            ["certification", business.ingredientPositioning]
          ].map(([key, label]) => (
            <label key={key} className="flex items-start gap-3 rounded-[8px] bg-[var(--surface-warm)] p-3 text-sm font-bold leading-6 text-[var(--muted)]">
              <input
                className="mt-1"
                type="checkbox"
                checked={form.acknowledgements[key as keyof FormState["acknowledgements"]]}
                onChange={(event) =>
                  update("acknowledgements", {
                    ...form.acknowledgements,
                    [key]: event.target.checked
                  })
                }
              />
              {label}
            </label>
          ))}
          {errors.acknowledgements ? <span className="text-sm font-bold text-[var(--accent-strong)]">{errors.acknowledgements}</span> : null}
        </fieldset>

        <button className="btn-primary click-pop" type="submit" disabled={status === "submitting"}>
          <Send size={18} aria-hidden="true" />
          {status === "submitting" ? "Sending..." : "Submit inquiry"}
          {confettiKey > 0 ? <ButtonConfetti key={confettiKey} testId="submit-confetti" /> : null}
        </button>
        {status === "error" ? <p className="text-sm font-bold text-[var(--accent-strong)]">Please review the highlighted details.</p> : null}
        {status === "sent" ? <p className="text-sm font-bold text-[var(--sage)]">Inquiry ready. If email is not configured, use the copy or email buttons.</p> : null}
      </form>

      <aside className="grid content-start gap-5">
        <div className="surface p-5">
          <p className="eyebrow">Estimate</p>
          <p className="mt-3 text-5xl font-black text-[var(--accent-strong)]">{quoteRangeLabel(estimate)}</p>
          <div className="mt-5 grid gap-2">
            {estimate.lines.map((line) => (
              <div key={line.label} className="flex justify-between gap-3 border-b border-[var(--line)] py-2 text-sm font-bold">
                <span>{line.label}</span>
                <span>{quoteRangeLabel(line)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="surface p-5">
          <p className="eyebrow">Copyable summary</p>
          <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-[8px] bg-[#fffdf8] p-4 text-sm leading-6 text-[var(--muted)]">{currentSummary}</pre>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button className="btn-secondary" type="button" onClick={copySummary}>
              <Copy size={18} aria-hidden="true" />
              {status === "copied" ? "Copied" : "Copy"}
            </button>
            <a className="btn-secondary" href={mailtoLink(currentSummary)}>
              <Mail size={18} aria-hidden="true" />
              Email
            </a>
          </div>
          {status === "copy-error" ? <p className="mt-3 text-sm font-bold text-[var(--accent-strong)]">Copy failed. Use the email button or select the summary manually.</p> : null}
        </div>
      </aside>
    </div>
  );
}

function ButtonConfetti({ testId }: { testId?: string }) {
  return (
    <span className="button-confetti" aria-hidden="true" data-testid={testId}>
      <span />
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}
