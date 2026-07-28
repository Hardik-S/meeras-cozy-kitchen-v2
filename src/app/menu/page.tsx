import { MenuContent } from "@/components/menu-content";
import { defaultPublicCatalog } from "@/lib/catalog";

export const dynamic = "force-static";

export default function MenuPage() {
  return (
    <div className="section-wrap py-12 md:py-20">
      <p className="eyebrow">Cake menu</p>
      <h1 className="page-title">Simple choices, clear starting prices.</h1>
      <p className="lede mt-6 max-w-2xl">
        Choose a cake size, flavour, frosting, fillings, and toppings. Final pricing depends on the confirmed design and ingredient needs.
      </p>
      <MenuContent initialCatalog={defaultPublicCatalog} />
    </div>
  );
}
