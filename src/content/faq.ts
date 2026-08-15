export type FaqItem = {
  question: string;
  answer: string;
};

export const faqs: FaqItem[] = [
  {
    question: "How much notice do you need?",
    answer:
      "Please send custom cake inquiries at least 7 days before pickup. Shorter timelines may only be possible depending on Meera's availability."
  },
  {
    question: "Do you deliver?",
    answer:
      "No, pickup is only available at the moment. Pickup details are shared after the order is confirmed."
  },
  {
    question: "Are the cakes halal certified?",
    answer:
      "No, certain ingredients like extracts and flavourings may contain small amounts of alcohol."
  },
  {
    question: "Can you handle allergies?",
    answer:
      "Allergen needs should be discussed before booking. Orders are prepared in a home kitchen that may handle common allergens."
  },
  {
    question: "Can I send design inspiration?",
    answer:
      "Yes. Inspiration photos are welcome, with slight adjustments where needed for available ingredients, tools, and timing."
  }
];
