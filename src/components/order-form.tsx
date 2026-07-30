"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Copy, Mail, Send } from "lucide-react";
import { business } from "@/content/business";
import { defaultPublicCatalog, type AdminOffering, type PublicCatalog } from "@/lib/catalog";
import { loadPublicCatalog, schedulePublicCatalogSync } from "@/lib/public-catalog-sync";
import { calculateQuoteEstimate, optionPriceLabel, quoteRangeLabel, startingPriceLabel } from "@/lib/pricing";
import { getMinimumPickupDate } from "@/lib/dates";
import { buildInquirySummary } from "@/lib/inquiry-summary";
import { createInquirySchema, pickupTimeOptions, type InquiryInput } from "@/lib/validation";

type FormState = {
  name: string;
  email: string;
  phone: string;
  eventDate: string;
  pickupTime: string;
  cakeSizeId: string;
  flavourId: string;
  frostingId: string;
  fillingIds: string[];
  toppingIds: string[];
  message: string;
  acknowledgements: {
    notice: boolean;
    allergens: boolean;
    address: boolean;
    certification: boolean;
    inspiration: boolean;
    payment: boolean;
  };
  website: string;
};

type AcknowledgementKey = keyof FormState["acknowledgements"];

const acknowledgementItems: Array<{ key: AcknowledgementKey; label: string }> = [
  { key: "notice", label: business.noticeCopy },
  { key: "allergens", label: business.allergenNotice },
  { key: "address", label: business.pickupPolicy },
  { key: "certification", label: business.ingredientPositioning },
  { key: "inspiration", label: "Slight adjustments may be made compared to the inspiration photo." },
  { key: "payment", label: business.depositPolicy }
];

type SubmittedOrder = {
  id: string;
  name: string;
  email: string;
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
  paymentEmail: string;
  summary: string;
};

const initialForm: FormState = {
  name: "",
  email: "",
  phone: "",
  eventDate: "",
  pickupTime: "",
  cakeSizeId: "four-inch",
  flavourId: "chocolate",
  frostingId: "",
  fillingIds: [],
  toppingIds: [],
  message: "",
  acknowledgements: {
    notice: false,
    allergens: false,
    address: false,
    certification: false,
    inspiration: false,
    payment: false
  },
  website: ""
};

function mailtoLink(summary: string) {
  const subject = encodeURIComponent(`Cake inquiry for ${business.name}`);
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

function isOptionalStringArray(value: unknown): value is string[] | undefined {
  return value === undefined || (Array.isArray(value) && value.every((item) => typeof item === "string"));
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
    && isOptionalString(order.pickupTime)
    && isOptionalString(order.productType)
    && isOptionalString(order.cakeSizeId)
    && isOptionalString(order.flavourId)
    && isOptionalString(order.frostingId)
    && isOptionalStringArray(order.fillingIds)
    && isOptionalStringArray(order.toppingIds)
    && isOptionalString(order.message)
    && isNonEmptyString(order.paymentEmail)
    && isNonEmptyString(order.summary);
}

function normalizeSubmittedText(value: string | undefined) {
  return value?.trim().replace(/\s+/g, " ");
}

function normalizeOptionalCatalogId(value: string | undefined) {
  return normalizeSubmittedText(value)?.toLowerCase();
}

function normalizeCatalogIds(values: string[] | undefined) {
  return values?.map((value) => value.trim().toLowerCase()).filter(Boolean);
}

function normalizeSubmittedOrder(order: SubmittedOrder): SubmittedOrder {
  return {
    ...order,
    id: normalizeSubmittedText(order.id) ?? "",
    name: normalizeSubmittedText(order.name) ?? "",
    email: normalizeSubmittedText(order.email) ?? "",
    phone: normalizeSubmittedText(order.phone),
    eventDate: normalizeSubmittedText(order.eventDate),
    pickupTime: normalizeSubmittedText(order.pickupTime),
    productType: normalizeOptionalCatalogId(order.productType),
    cakeSizeId: normalizeOptionalCatalogId(order.cakeSizeId),
    flavourId: normalizeOptionalCatalogId(order.flavourId),
    frostingId: normalizeOptionalCatalogId(order.frostingId),
    fillingIds: normalizeCatalogIds(order.fillingIds),
    toppingIds: normalizeCatalogIds(order.toppingIds),
    message: normalizeSubmittedText(order.message),
    paymentEmail: normalizeSubmittedText(order.paymentEmail) ?? "",
    summary: order.summary.trim()
  };
}

function buildPendingOrder(data: InquiryInput, summary: string): SubmittedOrder {
  return {
    id: `pending_${Date.now()}`,
    name: data.name,
    email: data.email,
    phone: data.phone,
    eventDate: data.eventDate,
    pickupTime: data.pickupTime,
    productType: "cake",
    cakeSizeId: data.cakeSizeId,
    flavourId: data.flavourId,
    frostingId: data.frostingId,
    fillingIds: data.fillingIds,
    toppingIds: data.toppingIds,
    message: data.message,
    paymentEmail: business.orderEmail,
    summary
  };
}

function availableId<T extends { id: string }>(items: T[], currentId: string) {
  return items.some((item) => item.id === currentId) ? currentId : items[0]?.id ?? currentId;
}

function reconcileFormWithCatalog(form: FormState, catalog: PublicCatalog): FormState {
  return {
    ...form,
    cakeSizeId: availableId(catalog.cakeSizes, form.cakeSizeId),
    flavourId: availableId(catalog.flavours, form.flavourId),
    frostingId: form.frostingId && catalog.frostings.some((item) => item.id === form.frostingId)
      ? form.frostingId
      : "",
    fillingIds: form.fillingIds.filter((id) => catalog.fillings.some((item) => item.id === id)),
    toppingIds: form.toppingIds.filter((id) => catalog.toppings.some((item) => item.id === id))
  };
}

export function OrderForm({ catalog = defaultPublicCatalog }: { catalog?: PublicCatalog }) {
  const router = useRouter();
  const [liveCatalog, setLiveCatalog] = useState(catalog);
  const [form, setForm] = useState<FormState>(() => reconcileFormWithCatalog(initialForm, catalog));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error" | "copied" | "copy-error">("idle");
  const [summary, setSummary] = useState("");
  const [acknowledgementsOpen, setAcknowledgementsOpen] = useState(true);
  const acknowledgementRefs = useRef<Partial<Record<AcknowledgementKey, HTMLInputElement | null>>>({});
  const acknowledgementsAccepted = acknowledgementItems.every(({ key }) => form.acknowledgements[key]);
  const firstUncheckedAcknowledgement = acknowledgementItems.find(
    ({ key }) => !form.acknowledgements[key]
  )?.key;
  const estimate = useMemo(
    () => calculateQuoteEstimate(form, {
      cakeSizes: liveCatalog.cakeSizes,
      flavours: liveCatalog.flavours,
      frostings: liveCatalog.frostings,
      fillings: liveCatalog.fillings,
      toppings: liveCatalog.toppings
    }),
    [form, liveCatalog]
  );
  const minimumDate = getMinimumPickupDate();
  const previewInquiry: InquiryInput = {
    name: form.name || "Not provided",
    email: form.email || "not-provided@example.com",
    phone: form.phone || "Not provided",
    eventDate: form.eventDate || minimumDate,
    pickupTime: (form.pickupTime || pickupTimeOptions[0].value) as InquiryInput["pickupTime"],
    cakeSizeId: form.cakeSizeId,
    flavourId: form.flavourId,
    frostingId: form.frostingId,
    fillingIds: form.fillingIds,
    toppingIds: form.toppingIds,
    message: form.message || "Not provided yet.",
    acknowledgements: {
      notice: true,
      allergens: true,
      address: true,
      certification: true,
      inspiration: true,
      payment: true
    },
    website: ""
  };
  const currentSummary = summary || buildInquirySummary(previewInquiry, liveCatalog);

  useEffect(() => {
    let active = true;

    const cancel = schedulePublicCatalogSync(() => {
      void loadPublicCatalog(catalog).then((result) => {
        if (active) {
          setLiveCatalog(result.catalog);
          setForm((current) => reconcileFormWithCatalog(current, result.catalog));
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

  function toggleChoice(key: "fillingIds" | "toppingIds", id: string) {
    setForm((current) => ({
      ...current,
      [key]: current[key].includes(id)
        ? current[key].filter((item) => item !== id)
        : [...current[key], id]
    }));
    setErrors((current) => ({ ...current, [key]: "" }));
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
    setErrors({});

    const parsed = createInquirySchema().safeParse(form);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors(
        Object.fromEntries(
          Object.entries(fieldErrors).map(([key, value]) => [key, value?.[0] ?? "Please review this field."])
        )
      );
      const acknowledgementIssue = parsed.error.issues.find(
        (issue) => issue.path[0] === "acknowledgements" && typeof issue.path[1] === "string"
      );
      const acknowledgementKey = acknowledgementIssue?.path[1] as AcknowledgementKey | undefined;
      if (acknowledgementKey) {
        setAcknowledgementsOpen(true);
        window.setTimeout(() => acknowledgementRefs.current[acknowledgementKey]?.focus(), 0);
      }
      setStatus("error");
      return;
    }

    const nextSummary = buildInquirySummary(parsed.data, liveCatalog);
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

    const order = isSubmittedOrder(body.order)
      ? normalizeSubmittedOrder(body.order)
      : buildPendingOrder(parsed.data, nextSummary);
    storeSubmittedOrder(order);
    setStatus("sent");
    router.push(`/order/summary?id=${encodeURIComponent(order.id)}`);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
      <form className="surface grid gap-5 p-5 md:p-6" onSubmit={submitInquiry} data-reveal>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Name" error={errors.name}>
            <input className="form-control" value={form.name} onChange={(event) => update("name", event.target.value)} />
          </FormField>
          <FormField label="Email" error={errors.email}>
            <input className="form-control" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} />
          </FormField>
          <FormField label="Phone" error={errors.phone}>
            <input className="form-control" value={form.phone} onChange={(event) => update("phone", event.target.value)} />
          </FormField>
          <FormField label="Pickup date" error={errors.eventDate}>
            <input className="form-control" min={minimumDate} type="date" value={form.eventDate} onChange={(event) => update("eventDate", event.target.value)} />
          </FormField>
          <FormField label="Pickup time" error={errors.pickupTime}>
            <select className="form-control" value={form.pickupTime} onChange={(event) => update("pickupTime", event.target.value)}>
              <option value="">Choose a pickup time</option>
              {pickupTimeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </FormField>
        </div>

        <input aria-hidden="true" className="hidden" tabIndex={-1} value={form.website} onChange={(event) => update("website", event.target.value)} name="website" />

        <fieldset className="grid gap-3">
          <legend className="text-sm font-black">Cake size</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {liveCatalog.cakeSizes.map((size) => (
              <button
                aria-label={`${size.label}, ${startingPriceLabel(size)}`}
                aria-pressed={form.cakeSizeId === size.id}
                className={`choice-card ${form.cakeSizeId === size.id ? "choice-card-selected" : ""}`}
                key={size.id}
                type="button"
                onClick={() => update("cakeSizeId", size.id)}
              >
                <span className="block font-black">{size.label}</span>
                <span className="mt-1 block text-sm font-bold text-[var(--muted)]">{startingPriceLabel(size)}</span>
              </button>
            ))}
          </div>
          {errors.cakeSizeId ? <ErrorText>{errors.cakeSizeId}</ErrorText> : null}
        </fieldset>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Cake Flavour" error={errors.flavourId}>
            <select className="form-control" value={form.flavourId} onChange={(event) => update("flavourId", event.target.value)}>
              {liveCatalog.flavours.map((flavour) => (
                <option key={flavour.id} value={flavour.id}>{flavour.label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Frosting Flavours" error={errors.frostingId}>
            <select className="form-control" value={form.frostingId} onChange={(event) => update("frostingId", event.target.value)}>
              <option value="" disabled>Choose a frosting flavour</option>
              {liveCatalog.frostings.map((frosting) => (
                <option key={frosting.id} value={frosting.id}>
                  {frosting.label} ({optionPriceLabel(frosting)})
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <OptionGroup
          title="Fillings"
          items={liveCatalog.fillings}
          selectedIds={form.fillingIds}
          onToggle={(id) => toggleChoice("fillingIds", id)}
          error={errors.fillingIds}
        />

        <OptionGroup
          title="Toppings"
          items={liveCatalog.toppings}
          selectedIds={form.toppingIds}
          onToggle={(id) => toggleChoice("toppingIds", id)}
          error={errors.toppingIds}
        />

        <FormField label="Design notes" error={errors.message}>
          <textarea
            className="form-control min-h-32"
            value={form.message}
            onChange={(event) => update("message", event.target.value)}
            placeholder="Occasion, colours, inspiration photo details, and allergy notes..."
          />
        </FormField>

        <fieldset
          aria-describedby={errors.acknowledgements ? "acknowledgement-error" : undefined}
          className="acknowledgement-panel"
        >
          <legend className="sr-only">Required acknowledgements</legend>
          <button
            aria-controls="required-acknowledgement-details"
            aria-expanded={acknowledgementsOpen}
            aria-label={acknowledgementsOpen ? "Hide required acknowledgements" : "Show required acknowledgements"}
            className="acknowledgement-toggle"
            type="button"
            onClick={() => setAcknowledgementsOpen((open) => !open)}
          >
            <span>
              <strong>Required acknowledgements</strong>
              <span>{acknowledgementsOpen ? "Hide required acknowledgements" : "Show required acknowledgements"}</span>
            </span>
            <ChevronDown className="acknowledgement-chevron" size={20} aria-hidden="true" />
          </button>
          <div
            aria-hidden={!acknowledgementsOpen}
            className={`acknowledgement-panel-body ${acknowledgementsOpen ? "acknowledgement-panel-open" : ""}`}
            id="required-acknowledgement-details"
            inert={!acknowledgementsOpen}
          >
            <div className="acknowledgement-panel-inner">
              <div className="grid gap-3 p-3 pt-0">
                <button
                  className="btn-secondary acknowledgement-accept-all"
                  disabled={acknowledgementsAccepted}
                  type="button"
                  onClick={() => update("acknowledgements", {
                    notice: true,
                    allergens: true,
                    address: true,
                    certification: true,
                    inspiration: true,
                    payment: true
                  })}
                >
                  {acknowledgementsAccepted ? "All acknowledgements accepted" : "Accept all acknowledgements"}
                </button>
                {acknowledgementItems.map(({ key, label }) => (
                  <label className="acknowledgement" key={key}>
                    <input
                      aria-describedby={
                        errors.acknowledgements && firstUncheckedAcknowledgement === key
                          ? "acknowledgement-error"
                          : undefined
                      }
                      aria-invalid={Boolean(
                        errors.acknowledgements && firstUncheckedAcknowledgement === key
                      )}
                      checked={form.acknowledgements[key]}
                      ref={(node) => {
                        acknowledgementRefs.current[key] = node;
                      }}
                      type="checkbox"
                      onChange={(event) => {
                        update("acknowledgements", {
                          ...form.acknowledgements,
                          [key]: event.target.checked
                        });
                      }}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          {errors.acknowledgements ? (
            <span
              className="px-3 pb-3 text-sm font-bold text-[var(--accent)]"
              id="acknowledgement-error"
              role="alert"
            >
              {errors.acknowledgements}
            </span>
          ) : null}
        </fieldset>

        <button className="btn-primary click-pop" type="submit" disabled={status === "submitting"}>
          <Send size={18} aria-hidden="true" />
          {status === "submitting" ? "Sending..." : "Submit inquiry"}
        </button>
        {status === "error" ? <ErrorText>Please review the highlighted details.</ErrorText> : null}
        {status === "sent" ? <p className="text-sm font-bold text-[var(--muted)]">Inquiry received. Meera will review the details before confirming your order.</p> : null}
      </form>

      <aside className="grid content-start gap-5" data-reveal>
        <div className="surface p-5">
          <p className="eyebrow">Starting price</p>
          <p className="mt-3 text-5xl font-black text-[var(--accent)]">{startingPriceLabel(estimate).replace("Starting at ", "")}</p>
          <p className="mt-2 text-sm font-bold text-[var(--muted)]">Final pricing depends on the confirmed design.</p>
          <div className="mt-5 grid gap-2">
            {estimate.lines.map((line) => (
              <div key={`${line.kind}-${line.label}`} className="flex justify-between gap-3 border-b border-[var(--line)] py-2 text-sm font-bold">
                <span>{line.label}</span>
                <span>{line.kind === "size" ? startingPriceLabel(line) : optionPriceLabel(line)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="surface p-5">
          <p className="eyebrow">Copyable summary</p>
          <pre className="summary-preview">{currentSummary}</pre>
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
          {status === "copy-error" ? <ErrorText>Copy failed. Use the email button or select the summary manually.</ErrorText> : null}
        </div>
      </aside>
    </div>
  );
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-black">
      {label}
      {children}
      {error ? <ErrorText>{error}</ErrorText> : null}
    </label>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <span className="text-sm font-bold text-[var(--accent)]">{children}</span>;
}

function OptionGroup({
  title,
  items,
  selectedIds,
  onToggle,
  error
}: {
  title: string;
  items: AdminOffering[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  error?: string;
}) {
  return (
    <fieldset className="grid gap-3">
      <legend className="text-sm font-black">{title}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <label key={item.id} className="option-row">
            <span className="flex items-center gap-3 font-bold">
              <input
                aria-label={`${item.label}, plus ${quoteRangeLabel(item)}`}
                type="checkbox"
                checked={selectedIds.includes(item.id)}
                onChange={() => onToggle(item.id)}
              />
              {item.label}
            </span>
            <span className="shrink-0 text-sm font-extrabold text-[var(--accent)]">+{quoteRangeLabel(item)}</span>
          </label>
        ))}
      </div>
      {error ? <ErrorText>{error}</ErrorText> : null}
    </fieldset>
  );
}
