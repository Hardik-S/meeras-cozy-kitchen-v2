import { business } from "@/content/business";
import { customerPolicies, restrictedClaims } from "@/content/policies";
import { sourceLinks } from "@/content/sources";

export default function FoodSafetyPage() {
  return (
    <div className="section-wrap py-12 md:py-20">
      <p className="eyebrow">Food safety</p>
      <h1 className="page-title">Clear boundaries before the cake.</h1>
      <p className="lede mt-6 max-w-3xl">
        {business.name} is launching carefully from a Brampton home kitchen. Customers should confirm ingredient needs before booking, and the public site avoids claims that have not been verified.
      </p>

      <section className="mt-12 grid gap-5 md:grid-cols-2">
        {customerPolicies.map((policy) => (
          <article key={policy.title} className="surface p-5">
            <h2 className="text-2xl font-black">{policy.title}</h2>
            <p className="mt-3 leading-7 text-[var(--muted)]">{policy.body}</p>
          </article>
        ))}
      </section>

      <section className="mt-14 rounded-[8px] bg-[var(--foreground)] p-6 text-white">
        <h2 className="text-3xl font-black">Claims this site avoids</h2>
        <div className="mt-5 flex flex-wrap gap-2">
          {restrictedClaims.map((claim) => (
            <span key={claim} className="rounded-full border border-white/20 px-3 py-2 text-sm font-bold text-white/85">
              {claim}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-3xl font-black">Source links</h2>
        <div className="mt-5 grid gap-3">
          {sourceLinks.slice(0, 5).map((source) => (
            <a key={source.url} href={source.url} className="rounded-[8px] border border-[var(--line)] bg-white/75 p-4 hover:border-[var(--accent)]">
              <span className="block font-black">{source.title}</span>
              <span className="mt-1 block text-sm leading-6 text-[var(--muted)]">{source.note}</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
