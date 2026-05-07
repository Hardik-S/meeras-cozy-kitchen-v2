"use client";

import { useEffect, useState } from "react";
import type { PublicCatalog } from "@/lib/catalog";
import { loadPublicCatalog, schedulePublicCatalogSync } from "@/lib/public-catalog-sync";
import { holdForLaterItems } from "@/lib/pricing";

export function MenuContent({ initialCatalog }: { initialCatalog: PublicCatalog }) {
  const [catalog, setCatalog] = useState(initialCatalog);
  const [source, setSource] = useState<"default" | "cached" | "live" | "fallback">("default");

  useEffect(() => {
    let active = true;

    const cancel = schedulePublicCatalogSync(() => {
      void loadPublicCatalog(initialCatalog).then((result) => {
        if (active) {
          setCatalog(result.catalog);
          setSource(result.source);
        }
      });
    });

    return () => {
      active = false;
      cancel();
    };
  }, [initialCatalog]);

  return (
    <>
      <p className="mt-3 text-sm font-bold text-[var(--muted)]" aria-live="polite">
        {source === "live" ? "Live menu refreshed." : source === "cached" ? "Showing recently refreshed menu." : "Showing saved launch menu."}
      </p>

      <section className="mt-12 grid gap-5 md:grid-cols-3" aria-label="Cake sizes">
        {catalog.cakeSizes.map((size) => (
          <article key={size.id} className="surface p-5">
            <p className="text-sm font-black text-[var(--sage)]">{size.servings} servings</p>
            <h2 className="mt-2 text-2xl font-black">{size.label}</h2>
            <p className="mt-5 text-2xl font-black text-[var(--accent-strong)]">
              ${size.low}-${size.high}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-14 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="text-3xl font-black">Other launch items</h2>
          <div className="mt-5 grid gap-3">
            {catalog.products.filter((product) => product.id !== "cake").map((product) => (
              <div key={product.id} className="rounded-[8px] border border-[var(--line)] bg-white/75 p-4">
                <p className="font-black">{product.label}</p>
                <p className="mt-1 text-sm font-bold text-[var(--muted)]">
                  ${product.low}-${product.high}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-black">Flavours</h2>
          <ul className="mt-5 grid gap-3">
            {catalog.flavours.map((flavour) => (
              <li key={flavour.id} className="rounded-[8px] bg-[var(--surface-rose)] px-4 py-3 font-extrabold">
                {flavour.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-14 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="text-3xl font-black">Add-ons</h2>
          <div className="mt-5 grid gap-3">
            {catalog.addOns.map((addOn) => (
              <div key={addOn.id} className="flex items-center justify-between gap-4 rounded-[8px] border border-[var(--line)] bg-white/75 p-4">
                <p className="font-black">{addOn.label}</p>
                <p className="shrink-0 text-sm font-extrabold text-[var(--accent-strong)]">
                  ${addOn.low}-${addOn.high}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[8px] bg-[var(--foreground)] p-5 text-white">
          <h2 className="text-3xl font-black">Not offered yet</h2>
          <p className="mt-3 text-sm leading-6 text-white/75">
            These items stay off the launch menu until the process, equipment, and compliance path are clearer.
          </p>
          <ul className="mt-5 grid gap-2 text-sm font-bold text-white/90">
            {holdForLaterItems.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
