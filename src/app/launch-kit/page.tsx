import type { Metadata } from "next";
import { dmTemplates, doNotOfferYet, launchChecklist, practiceCakePlan, priceIncreasePlan } from "@/content/launchKit";

export const metadata: Metadata = {
  title: "Launch Kit",
  robots: {
    index: false,
    follow: false
  }
};

export default function LaunchKitPage() {
  return (
    <div className="section-wrap py-12 md:py-20">
      <p className="eyebrow">Founder kit</p>
      <h1 className="page-title">Meera&apos;s launch operating notes.</h1>
      <p className="lede mt-6 max-w-3xl">
        This page is noindex and written for the owner. It keeps the first launch practical, compliant, and easier to execute from Instagram or WhatsApp.
      </p>

      <section className="mt-12 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="surface p-5">
          <h2 className="text-3xl font-black">Launch checklist</h2>
          <ol className="mt-5 grid gap-3">
            {launchChecklist.map((item, index) => (
              <li key={item} className="flex gap-3 rounded-[8px] bg-[var(--background)] p-3 text-sm font-bold leading-6 text-[var(--muted)]">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-xs text-[var(--background)]">{index + 1}</span>
                {item}
              </li>
            ))}
          </ol>
        </div>

        <div className="surface p-5">
          <h2 className="text-3xl font-black">Practice cake plan</h2>
          <ul className="mt-5 grid gap-3">
            {practiceCakePlan.map((item) => (
              <li key={item} className="rounded-[8px] bg-[var(--surface-alt)] p-3 text-sm font-bold leading-6 text-[var(--muted)]">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-3xl font-black">DM templates</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {dmTemplates.map((template) => (
            <article key={template.title} className="surface p-5">
              <h3 className="text-xl font-black">{template.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{template.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-14 grid gap-5 md:grid-cols-2">
        <div className="rounded-[8px] bg-[var(--foreground)] p-5 text-[var(--background)]">
          <h2 className="text-3xl font-black">Do not offer yet</h2>
          <ul className="mt-5 grid gap-2 text-sm font-bold text-[var(--background)]">
            {doNotOfferYet.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-[8px] bg-[var(--surface-warm)] p-5">
          <h2 className="text-3xl font-black">Price increase plan</h2>
          <ul className="mt-5 grid gap-3 text-sm font-bold leading-6 text-[var(--muted)]">
            {priceIncreasePlan.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
