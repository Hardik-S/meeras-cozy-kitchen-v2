import Link from "next/link";

type PlaceholderPageProps = {
  title: string;
  description: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section className="section-wrap py-16 md:py-24">
      <p className="eyebrow">Coming into focus</p>
      <h1 className="page-title">{title}</h1>
      <p className="lede mt-6 max-w-2xl">{description}</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link className="btn-primary" href="/order">
          Request a quote
        </Link>
        <Link className="btn-secondary" href="/">
          Back home
        </Link>
      </div>
    </section>
  );
}
