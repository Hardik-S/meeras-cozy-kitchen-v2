"use client";

import { useEffect, useState } from "react";
import type { AdminOffering, PublicCatalog } from "@/lib/catalog";
import { loadPublicCatalog, schedulePublicCatalogSync } from "@/lib/public-catalog-sync";
import { optionPriceLabel, startingPriceLabel } from "@/lib/pricing";

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
        {source === "live" ? "Live menu refreshed." : source === "cached" ? "Showing recently refreshed menu." : "Showing saved cake menu."}
      </p>

      <section className="mt-12 grid gap-5 md:grid-cols-3" aria-label="Cake sizes" data-reveal>
        {catalog.cakeSizes.map((size) => (
          <article key={size.id} className="surface p-5">
            <p className="eyebrow">Cake size</p>
            <h2 className="mt-2 text-2xl font-black">{size.label}</h2>
            <p className="mt-5 text-xl font-black text-[var(--accent)]">{startingPriceLabel(size)}</p>
          </article>
        ))}
      </section>

      <section className="menu-groups mt-14" data-reveal>
        <MenuGroup title="Cake Flavours" items={catalog.flavours} />
        <MenuGroup title="Frosting Flavours" items={catalog.frostings} />
        <MenuGroup title="Fillings" items={catalog.fillings} />
        <MenuGroup title="Toppings" items={catalog.toppings} />
      </section>

      <p className="mt-12 max-w-3xl rounded-[8px] border border-[var(--line)] bg-[var(--surface-alt)] p-5 font-bold leading-7 text-[var(--muted)]" data-reveal>
        Starting prices include the selected cake size and any frosting marked Included. Paid frosting upgrades, fillings, toppings, and design complexity are added before Meera confirms the final quote.
      </p>
    </>
  );
}

function MenuGroup({ title, items }: { title: string; items: AdminOffering[] }) {
  return (
    <section className="surface p-5">
      <h2 className="text-3xl font-black">{title}</h2>
      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <div key={item.id} className="menu-row">
            <p className="font-black">{item.label}</p>
            <p className="shrink-0 text-sm font-extrabold text-[var(--accent)]">
              {optionPriceLabel(item)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
