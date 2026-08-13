import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--line)] bg-[var(--background)]">
      <div className="section-wrap grid gap-8 py-10 md:grid-cols-[1fr_auto]">
        <div>
          <p className="text-lg font-black">Meera&apos;s Cozy Kitchen</p>
          <p className="mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
            Custom celebration cakes prepared from a Brampton home kitchen. Pickup details are shared after booking.
          </p>
        </div>
        <div className="md:text-right">
          <p className="text-sm font-black text-[var(--foreground)]">Explore</p>
          <div className="mt-3 grid gap-2 text-sm font-bold text-[var(--muted)] md:justify-items-end">
            <Link href="/menu">Menu</Link>
            <Link href="/photos">Photos</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/order">Request a quote</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
