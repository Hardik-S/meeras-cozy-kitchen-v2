import Link from "next/link";
import Image from "next/image";
import { MessageCircle } from "lucide-react";

const navItems = [
  { href: "/menu", label: "Menu" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/food-safety", label: "Food Safety" },
  { href: "/faq", label: "FAQ" }
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-[var(--line)] bg-[rgba(255,248,239,0.9)] backdrop-blur-md">
      <div className="section-wrap flex min-h-16 items-center justify-between gap-4 py-3">
        <Link href="/" className="flex items-center gap-3" aria-label="Meera's Cozy Kitchen home">
          <Image className="brand-logo" src="/logo.png" alt="" width={44} height={44} priority />
          <span className="leading-tight">
            <span className="block text-base font-black">Meera&apos;s Cozy Kitchen</span>
            <span className="block text-xs font-bold text-[var(--muted)]">Brampton home bakery</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-extrabold text-[var(--muted)] md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-[var(--accent-strong)]">
              {item.label}
            </Link>
          ))}
        </nav>
        <Link href="/order" className="btn-primary header-quote !min-h-11 !px-4" aria-label="Request quote">
          <MessageCircle aria-hidden="true" size={18} />
          <span className="header-quote-label">Request quote</span>
        </Link>
      </div>
      <nav className="section-wrap flex gap-2 overflow-x-auto pb-3 text-sm font-extrabold text-[var(--muted)] md:hidden">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className="shrink-0 rounded-full border border-[var(--line)] bg-white/70 px-3 py-2">
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
