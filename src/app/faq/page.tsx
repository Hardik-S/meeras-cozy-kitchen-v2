import Link from "next/link";
import { faqs } from "@/content/faq";

export default function FaqPage() {
  return (
    <div className="section-wrap py-12 md:py-20">
      <p className="eyebrow">FAQ</p>
      <h1 className="page-title">Answers before you message.</h1>
      <div className="mt-12 grid gap-4">
        {faqs.map((item) => (
          <article key={item.question} className="surface p-5">
            <h2 className="text-xl font-black">{item.question}</h2>
            <p className="mt-3 leading-7 text-[var(--muted)]">{item.answer}</p>
          </article>
        ))}
      </div>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link href="/order" className="btn-primary">
          Start a quote
        </Link>
        <Link href="/food-safety" className="btn-secondary">
          Read food safety notes
        </Link>
      </div>
    </div>
  );
}
