import Link from "next/link";
import { business } from "@/content/business";
import { faqs } from "@/content/faq";
import { customerPolicies } from "@/content/policies";

export default function FaqPage() {
  return (
    <div className="section-wrap py-12 md:py-20">
      <p className="eyebrow">FAQ</p>
      <h1 className="page-title">Answers before you message.</h1>

      <section className="mt-12 grid gap-4" aria-label="Frequently asked questions">
        {faqs.map((item) => (
          <article key={item.question} className="surface p-5">
            <h2 className="text-xl font-black">{item.question}</h2>
            <p className="mt-3 leading-7 text-[var(--muted)]">{item.answer}</p>
          </article>
        ))}
      </section>

      <section id="food-safety" className="scroll-mt-32 pt-16">
        <p className="eyebrow">Food safety and pickup</p>
        <h2 className="mt-2 text-4xl font-black">Clear details before the cake.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {customerPolicies.map((policy) => (
            <article key={policy.title} className="surface p-5">
              <h3 className="text-xl font-black">{policy.title}</h3>
              <p className="mt-3 leading-7 text-[var(--muted)]">{policy.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="contact" className="mt-16 rounded-[8px] border border-[var(--line)] bg-[var(--surface-alt)] p-6">
        <p className="eyebrow">Contact</p>
        <h2 className="mt-2 text-3xl font-black">How to contact me</h2>
        <p className="mt-3 max-w-2xl leading-7 text-[var(--muted)]">
          The quote form is the best place to share a date, size, flavour, and inspiration. You can also email or message Meera on Instagram.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href="/order" className="btn-primary">Request a quote</Link>
          <a href={`mailto:${business.orderEmail}`} className="btn-secondary">{business.orderEmail}</a>
          <a
            href="https://www.instagram.com/meerascozykitchen/"
            className="btn-secondary"
            target="_blank"
            rel="noreferrer"
          >
            {business.instagramHandle}
          </a>
        </div>
      </section>
    </div>
  );
}
