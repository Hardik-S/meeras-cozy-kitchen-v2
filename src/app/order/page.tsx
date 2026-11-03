import { OrderForm } from "@/components/order-form";
import { defaultPublicCatalog } from "@/lib/catalog";

export const dynamic = "force-static";

export default function OrderPage() {
  return (
    <div className="section-wrap py-12 md:py-20">
      <div data-reveal>
        <p className="eyebrow">Order inquiry</p>
        <h1 className="page-title">Build your custom quote.</h1>
        <p className="lede mt-6 max-w-3xl">
          Add custom cakes or cake shooters by the dozen, configure each item, and choose a pickup window. This creates an inquiry for Meera to review; it does not confirm the order or collect payment.
        </p>
      </div>
      <div className="mt-10">
        <OrderForm catalog={defaultPublicCatalog} />
      </div>
    </div>
  );
}
