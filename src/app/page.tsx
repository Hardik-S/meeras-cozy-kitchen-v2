import Link from "next/link";
import Image from "next/image";
import { CalendarDays, Heart, ShieldCheck, Sparkles } from "lucide-react";
import { business } from "@/content/business";
import { customerPolicies } from "@/content/policies";
import { cakeSizes, flavours, productBasePrices } from "@/lib/pricing";
import { servingLabel } from "@/lib/servings";

export default function HomePage() {
  return (
    <>
      <section className="section-wrap grid min-h-[calc(100vh-8rem)] items-center gap-10 py-12 md:min-h-[calc(100vh-5rem)] md:grid-cols-[1.05fr_0.95fr] md:py-20">
        <div data-reveal>
          <p className="eyebrow">Custom cakes in Brampton</p>
          <h1 className="page-title">{business.tagline}</h1>
          <p className="lede mt-6 max-w-xl">
            Custom celebration cakes and cake shooters by the dozen, with clear starting prices, flavours, fillings, frostings, and toppings from a Brampton home kitchen.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link className="btn-primary" href="/order">
              Start a quote
            </Link>
            <Link className="btn-secondary" href="/menu">
              View menu
            </Link>
          </div>
          <div className="mt-8 grid gap-3 text-sm font-bold text-[var(--muted)] sm:grid-cols-3">
            <span className="flex items-center gap-2">
              <CalendarDays size={18} aria-hidden="true" /> 7-day notice
            </span>
            <span className="flex items-center gap-2">
              <Heart size={18} aria-hidden="true" /> Small-batch
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck size={18} aria-hidden="true" /> Clear policies
            </span>
          </div>
        </div>
        <div className="surface overflow-hidden" data-reveal>
          <div className="aspect-[4/5] bg-[var(--surface-alt)] p-5">
            <div className="portfolio-image relative flex h-full flex-col justify-end overflow-hidden rounded-[8px] border border-[var(--line)] p-5 text-[var(--background)]">
              <Image
                alt="Raspberry ring cake photographed from the front"
                className="object-cover"
                fill
                priority
                sizes="(max-width: 767px) calc(100vw - 64px), 42vw"
                src="/portfolio/raspberry-ring-cake-front.jpeg"
              />
              <Link
                aria-label="Explore Meera's cake portfolio"
                className="portfolio-card relative rounded-[8px] bg-[var(--foreground)] p-4"
                href="/photos"
              >
                <p className="text-sm font-black">Meera&apos;s cake portfolio</p>
                <p className="mt-1 text-sm leading-5 text-[var(--background)]">
                  Explore finished cakes, then share the details you would like Meera to adapt.
                </p>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--surface-alt)] py-14">
        <div className="product-display section-wrap" data-reveal>
          {cakeSizes.map((size) => (
            <article key={size.id} className="surface p-5">
              <p className="eyebrow">Cake size</p>
              <h2 className="mt-2 text-2xl font-black">{size.label}</h2>
              <p className="mt-4 text-sm font-extrabold text-[var(--accent)]">
                Starting at ${size.low}
              </p>
              <p className="mt-1 text-sm font-bold text-[var(--muted)]">{servingLabel(size.id)}</p>
            </article>
          ))}
          <article className="surface p-5">
            <p className="eyebrow">Cake shooters</p>
            <h2 className="mt-2 text-2xl font-black">One dozen shooters</h2>
            <p className="mt-4 text-sm font-extrabold text-[var(--accent)]">Starting at ${productBasePrices["cake-shooters"].low}</p>
            <p className="mt-1 text-sm font-bold text-[var(--muted)]">{servingLabel("cake-shooters")}</p>
          </article>
        </div>
      </section>

      <section className="section-wrap grid gap-10 py-16 md:grid-cols-[0.9fr_1.1fr]" data-reveal>
        <div>
          <p className="eyebrow">Cake flavours</p>
          <h2 className="mt-2 text-4xl font-black leading-tight md:text-5xl">Simple choices for a cake that feels personal.</h2>
          <p className="lede mt-5">
            Choose the cake size and flavour first, then add the frosting, fillings, and toppings that fit your celebration.
          </p>
        </div>
        <div className="grid gap-3">
          {flavours.map((flavour) => (
            <div key={flavour.id} className="flex items-center gap-3 border-b border-[var(--line)] py-4">
              <Sparkles className="text-[var(--accent)]" size={20} aria-hidden="true" />
              <span className="text-lg font-black">{flavour.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section-wrap py-16" data-reveal>
        <p className="eyebrow">Ordering</p>
        <h2 className="mt-2 text-4xl font-black leading-tight md:text-5xl">How to order</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            "Choose between cake shooters or any size cake.",
            "Choose your favourite flavour combination.",
            "Add a filling or topping (if you're feeling fancy).",
            "Describe any design elements you have in mind.",
            "Add your contact information and select your pickup window.",
            "Send your inquiry!"
          ].map((step, index) => (
            <li key={step} className="surface flex gap-4 p-5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-black text-[var(--background)]">
                {index + 1}
              </span>
              <p className="font-bold leading-6 text-[var(--muted)]">{step}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 font-bold text-[var(--muted)]">You can expect a response within 24 hours.</p>
      </section>

      <section className="bg-[var(--surface-warm)] py-14">
        <div className="section-wrap grid gap-5 md:grid-cols-2 lg:grid-cols-[repeat(4,230px)] lg:justify-center" data-reveal>
          {customerPolicies.map((policy) => (
            <article key={policy.title} className="rounded-[8px] border border-[var(--line)] bg-[var(--background)] p-4">
              <h2 className="font-black">{policy.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{policy.body}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
