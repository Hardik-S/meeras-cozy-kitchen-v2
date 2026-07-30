"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/photos", label: "Photos" },
  { href: "/faq", label: "FAQ" },
  { href: "/order", label: "Quote", cta: true }
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="site-header sticky top-0 z-10 border-b border-[var(--line)]">
      <div className="section-wrap site-header-inner">
        <Link href="/" className="brand-link" aria-label="Meera's Cozy Kitchen home">
          <Image className="brand-logo" src="/meeras-logo.jpg" alt="" width={44} height={44} priority />
          <span className="leading-tight">
            <span className="block text-base font-black">Meera&apos;s Cozy Kitchen</span>
            <span className="block text-xs font-bold text-[var(--muted)]">Brampton home bakery</span>
          </span>
        </Link>
        <nav className="site-nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`${item.cta ? "nav-quote" : "nav-link"} ${active ? "nav-link-active" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
