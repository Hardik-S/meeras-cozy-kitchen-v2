import { PortfolioMediaCard, type PortfolioMediaItem } from "@/components/portfolio-media-card";

const photoCards: PortfolioMediaItem[] = [
  {
    caption: "Rainbow sprinkle overload cake",
    src: "/portfolio/rainbow-sprinkle-overload-cake-spinning.mp4",
    alt: "Rainbow sprinkle overload cake spinning on display",
    kind: "video"
  },
  {
    caption: "Death by chocolate cake",
    src: "/portfolio/death-by-chocolate-cake-top-view.jpeg",
    alt: "Top view of a death by chocolate cake with chocolate frosting and piped rosettes",
    kind: "image"
  },
  {
    caption: "Lemon poppyseed cake",
    src: "/portfolio/lemon-poppyseed-cake-close-up.jpeg",
    alt: "Close-up of a lemon poppyseed cake with lemon decorations",
    kind: "image"
  },
  {
    caption: "Custom cake shooters",
    src: "/portfolio/custom-cake-shooters-front-view.jpeg",
    alt: "Custom cake shooters arranged on a serving tray",
    kind: "image"
  },
  {
    caption: "Sunset birthday cake",
    src: "/portfolio/sunset-birthday-cake-front-view.jpeg",
    alt: "Sunset birthday cake with orange frosting, mauve piping, gold pearls, and pink ribbons",
    kind: "image"
  },
  {
    caption: "Lemon raspberry cake",
    src: "/portfolio/lemon-raspberry-cake-spinning.mp4",
    alt: "Lemon raspberry cake spinning on display",
    kind: "video"
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
          <PortfolioMediaCard key={card.src} {...card} />
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
