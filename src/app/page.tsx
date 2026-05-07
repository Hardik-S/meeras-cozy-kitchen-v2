import Link from "next/link";
import { CalendarDays, Heart, ShieldCheck, Sparkles } from "lucide-react";
import { business } from "@/content/business";
import { customerPolicies } from "@/content/policies";
import { cakeSizes, flavours } from "@/lib/pricing";

export default function HomePage() {
  return (
    <>
      <section className="section-wrap grid min-h-[calc(100vh-8rem)] items-center gap-10 py-12 md:min-h-[calc(100vh-5rem)] md:grid-cols-[1.05fr_0.95fr] md:py-20">
        <div>
          <p className="eyebrow">Custom cakes in Brampton</p>
          <h1 className="page-title">{business.tagline}</h1>
          <p className="lede mt-6 max-w-xl">
            A simple launch menu for buttercream cakes, cupcakes, and celebration dessert boxes from a Brampton home kitchen.
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
        <div className="surface overflow-hidden">
          <div className="aspect-[4/5] bg-[linear-gradient(145deg,#fff1de,#ffe8e2)] p-5">
            <div className="flex h-full flex-col justify-end rounded-[8px] border border-white/70 bg-[url('https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1100&q=80')] bg-cover bg-center p-5 text-white shadow-inner">
              <div className="rounded-[8px] bg-[rgba(40,26,19,0.62)] p-4 backdrop-blur-sm">
                <p className="text-sm font-black">Practice gallery opening soon</p>
                <p className="mt-1 text-sm leading-5 text-white/85">
                  Real cake photos can replace this launch image as Meera builds her first portfolio.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#fffdf8] py-14">
        <div className="section-wrap grid gap-6 md:grid-cols-3">
          {cakeSizes.map((size) => (
            <article key={size.id} className="surface p-5">
              <p className="text-sm font-black text-[var(--sage)]">{size.servings} servings</p>
              <h2 className="mt-2 text-2xl font-black">{size.label}</h2>
              <p className="mt-4 text-sm font-extrabold text-[var(--accent-strong)]">
                ${size.low}-${size.high} launch range
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-wrap grid gap-10 py-16 md:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="eyebrow">What is ready</p>
          <h2 className="mt-2 text-4xl font-black leading-tight md:text-5xl">A narrow launch menu is the feature.</h2>
          <p className="lede mt-5">
            The first offer stays focused so each order can be planned, confirmed, photographed, and improved without pretending the kitchen is already a full bakery.
          </p>
        </div>
        <div className="grid gap-3">
          {flavours.map((flavour) => (
            <div key={flavour.id} className="flex items-center gap-3 border-b border-[var(--line)] py-4">
              <Sparkles className="text-[var(--gold)]" size={20} aria-hidden="true" />
              <span className="text-lg font-black">{flavour.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[var(--surface-warm)] py-14">
        <div className="section-wrap grid gap-5 md:grid-cols-5">
          {customerPolicies.map((policy) => (
            <article key={policy.title} className="rounded-[8px] border border-[var(--line)] bg-white/65 p-4">
              <h2 className="font-black">{policy.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{policy.body}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
