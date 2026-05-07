import { OrderForm } from "@/components/order-form";
import { defaultPublicCatalog } from "@/lib/catalog";

export const dynamic = "force-static";

export default function OrderPage() {
  return (
    <div className="section-wrap py-12 md:py-20">
      <p className="eyebrow">Order inquiry</p>
      <h1 className="page-title">Build a quote before you message.</h1>
      <p className="lede mt-6 max-w-3xl">
        Choose the closest cake size, flavour, add-ons, and pickup date. This does not collect payment or confirm the order; it creates a clear inquiry for Meera to review.
      </p>
      <div className="mt-10">
        <OrderForm catalog={defaultPublicCatalog} />
      </div>
    </div>
  );
}
