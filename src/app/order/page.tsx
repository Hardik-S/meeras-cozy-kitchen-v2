import { OrderForm } from "@/components/order-form";
import { defaultPublicCatalog } from "@/lib/catalog";

export const dynamic = "force-static";

export default function OrderPage() {
  return (
    <div className="section-wrap py-12 md:py-20">
      <p className="eyebrow">Order inquiry</p>
      <h1 className="page-title">Build your cake quote.</h1>
      <p className="lede mt-6 max-w-3xl">
        Choose a cake size, flavour, optional frosting, fillings, toppings, and pickup window. This creates an inquiry for Meera to review; it does not confirm the order or collect payment.
      </p>
      <div className="mt-10">
        <OrderForm catalog={defaultPublicCatalog} />
      </div>
    </div>
  );
}
