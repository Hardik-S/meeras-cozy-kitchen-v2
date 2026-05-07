export type FaqItem = {
  question: string;
  answer: string;
};

export const faqs: FaqItem[] = [
  {
    question: "How much notice do you need?",
    answer:
      "Please send custom cake inquiries at least 7 days before pickup. Shorter timelines may not be possible during launch."
  },
  {
    question: "Do you deliver?",
    answer:
      "The launch offer is pickup-first in Brampton. Pickup details are shared after the order is confirmed."
  },
  {
    question: "Are the cakes halal certified?",
    answer:
      "No. No alcohol or pork-derived ingredients are intentionally used, but the business is not halal certified."
  },
  {
    question: "Can you handle allergies?",
    answer:
      "Allergen needs should be discussed before booking. Orders are prepared in a home kitchen that may handle common allergens."
  },
  {
    question: "Can I send design inspiration?",
    answer:
      "Yes. Inspiration photos are welcome, but final designs are adapted to the available ingredients, tools, and timeline."
  }
];
