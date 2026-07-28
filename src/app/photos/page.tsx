const photoCards = [
  {
    title: "Floral buttercream cake",
    note: "Cake photo inspiration",
    image: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Chocolate celebration cake",
    note: "Cake photo inspiration",
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Simple birthday cake",
    note: "Cake photo inspiration",
    image: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Fruit-topped cake",
    note: "Cake photo inspiration",
    image: "https://images.unsplash.com/photo-1535141192574-5d4897c12636?auto=format&fit=crop&w=900&q=80"
  }
];

export default function PhotosPage() {
  return (
    <div className="section-wrap py-12 md:py-20">
      <p className="eyebrow">Photos</p>
      <h1 className="page-title">Cake ideas for your celebration.</h1>
      <p className="lede mt-6 max-w-3xl">
        Use these cake images as inspiration. Meera will adapt colours, finishes, and details to the selected size and available ingredients.
      </p>

      <section className="mt-12 grid gap-5 sm:grid-cols-2">
        {photoCards.map((card) => (
          <article key={card.title} className="surface overflow-hidden">
            <div
              className="aspect-[4/3] bg-cover bg-center"
              style={{ backgroundImage: `url(${card.image})` }}
              role="img"
              aria-label={card.title}
            />
            <div className="p-5">
              <p className="eyebrow">{card.note}</p>
              <h2 className="mt-2 text-2xl font-black">{card.title}</h2>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-14 rounded-[8px] border border-[var(--line)] bg-[var(--surface-alt)] p-6">
        <h2 className="text-3xl font-black">Inspiration, not an exact copy</h2>
        <p className="mt-3 max-w-3xl leading-7 text-[var(--muted)]">
          Slight adjustments may be made compared to an inspiration photo so the final cake suits the selected size, ingredients, tools, and pickup date.
        </p>
      </section>
    </div>
  );
}
