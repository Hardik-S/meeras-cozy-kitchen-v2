import { business } from "./business";

export const customerPolicies = [
  {
    title: "Notice",
    body: "Custom cakes need at least 7 days of notice. Rush orders may only be possible depending on Meera's availability."
  },
  {
    title: "Pickup",
    body: "Pickup is coordinated privately after booking. The public site does not provide a home address."
  },
  {
    title: "Allergens",
    body: "Orders are prepared in a home kitchen that may handle wheat, milk, soy, peanuts, tree nuts, and sesame. Meera's Cozy Kitchen is not halal certified."
  },
  {
    title: "Payments",
    body: business.depositPolicy
  }
];
