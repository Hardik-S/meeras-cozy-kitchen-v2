const portfolioCards = [
  {
    title: "6 inch floral buttercream",
    note: "Practice cake photo slot",
    image: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Birthday cupcakes",
    note: "Practice cupcake dozen slot",
    image: "https://images.unsplash.com/photo-1486427944299-d1955d23e34d?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Simple celebration cake",
    note: "Real customer photo slot after permission",
    image: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Dessert box styling",
    note: "Launch sample photo slot",
    image: "https://images.unsplash.com/photo-1519915028121-7d3463d20b13?auto=format&fit=crop&w=900&q=80"
  }
];

export default function PortfolioPage() {
  return (
    <div className="section-wrap py-12 md:py-20">
      <p className="eyebrow">Portfolio</p>
      <h1 className="page-title">Photo slots for the first real cakes.</h1>
      <p className="lede mt-6 max-w-3xl">
        These launch cards are placeholders and should be replaced with Meera&apos;s own practice or customer-approved photos before promotion.
      </p>

      <section className="mt-12 grid gap-5 sm:grid-cols-2">
        {portfolioCards.map((card) => (
          <article key={card.title} className="surface overflow-hidden">
            <div className="aspect-[4/3] bg-cover bg-center" style={{ backgroundImage: `url(${card.image})` }} />
            <div className="p-5">
              <p className="text-sm font-black text-[var(--sage)]">{card.note}</p>
              <h2 className="mt-2 text-2xl font-black">{card.title}</h2>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-14 rounded-[8px] bg-[var(--surface-warm)] p-6">
        <h2 className="text-3xl font-black">Replacement rule</h2>
        <p className="mt-3 max-w-3xl leading-7 text-[var(--muted)]">
          Use bright, uncropped photos that show the actual cake, clean packaging, or a slice. Do not use fake customer testimonials or imply these are completed customer orders until they are real and approved for public use.
        </p>
      </section>
    </div>
  );
}
