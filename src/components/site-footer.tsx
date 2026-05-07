import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--line)] bg-[#fffdf8]">
      <div className="section-wrap grid gap-8 py-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="text-lg font-black">Meera&apos;s Cozy Kitchen</p>
          <p className="mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
            Custom celebration cakes and sweets prepared from a Brampton home kitchen. Pickup details are shared after booking.
          </p>
        </div>
        <div>
          <p className="text-sm font-black text-[var(--foreground)]">Explore</p>
          <div className="mt-3 grid gap-2 text-sm font-bold text-[var(--muted)]">
            <Link href="/menu">Menu</Link>
            <Link href="/order">Order</Link>
            <Link href="/portfolio">Portfolio</Link>
            <Link href="/launch-kit">Launch kit</Link>
          </div>
        </div>
        <div>
          <p className="text-sm font-black text-[var(--foreground)]">Notes</p>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Not halal certified. No alcohol or pork-derived ingredients are intentionally used.
          </p>
        </div>
      </div>
    </footer>
  );
}
