import Image from "next/image";

const photoCards = [
  {
    title: "Raspberry ring cake",
    note: "Front view",
    image: "/portfolio/raspberry-ring-cake-front.jpeg",
    alt: "Front view of a raspberry cake topped with raspberries arranged in a ring"
  },
  {
    title: "Raspberry ring cake",
    note: "Overhead view",
    image: "/portfolio/raspberry-ring-cake-overhead.jpeg",
    alt: "Overhead view of a raspberry cake topped with raspberries arranged in a ring"
  },
  {
    title: "Raspberry ring cake",
    note: "Detail view",
    image: "/portfolio/raspberry-ring-cake-detail.jpeg",
    alt: "Detail view of the piped finish and raspberry ring on a raspberry cake"
  },
  {
    title: "Raspberry dollop cake",
    note: "Front view",
    image: "/portfolio/raspberry-dollop-cake-front.jpeg",
    alt: "Front view of a raspberry cake topped with raspberries and piped dollops"
  },
  {
    title: "Raspberry dollop cake",
    note: "Overhead view",
    image: "/portfolio/raspberry-dollop-cake-overhead.jpeg",
    alt: "Overhead view of a raspberry cake topped with raspberries and piped dollops"
  },
  {
    title: "Raspberry dollop cake",
    note: "Detail view",
    image: "/portfolio/raspberry-dollop-cake-detail.jpeg",
    alt: "Detail view of the piped dollops and raspberries on a raspberry cake"
  }
];

export default function PhotosPage() {
  return (
    <div className="section-wrap py-12 md:py-20">
      <div data-reveal>
        <p className="eyebrow">Photos</p>
        <h1 className="page-title">Meera&apos;s cake portfolio.</h1>
        <p className="lede mt-6 max-w-3xl">
          Explore cakes made by Meera, then share the colours, finishes, and details you would like for your celebration.
        </p>
      </div>

      <section className="mt-12 grid gap-5 sm:grid-cols-2" data-reveal>
        {photoCards.map((card) => (
          <article
            aria-label={`${card.title}, ${card.note}`}
            className="portfolio-card surface overflow-hidden"
            key={card.image}
            tabIndex={0}
          >
            <div className="portfolio-image relative aspect-[3/4] overflow-hidden">
              <Image
                src={card.image}
                alt={card.alt}
                fill
                className="object-cover"
                sizes="(min-width: 640px) 50vw, 100vw"
              />
            </div>
            <div className="p-5">
              <p className="eyebrow">{card.note}</p>
              <h2 className="mt-2 text-2xl font-black">{card.title}</h2>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-14 rounded-[8px] border border-[var(--line)] bg-[var(--surface-alt)] p-6" data-reveal>
        <h2 className="text-3xl font-black">Portfolio inspiration, made for you</h2>
        <p className="mt-3 max-w-3xl leading-7 text-[var(--muted)]">
          Slight adjustments may be made compared to an inspiration photo so the final cake suits the selected size, ingredients, tools, and pickup date.
        </p>
      </section>
    </div>
  );
}
