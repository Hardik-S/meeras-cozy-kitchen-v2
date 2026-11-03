const servingsByOfferingId = {
  "four-inch": "Approx. 3-6 servings",
  "six-inch": "Approx. 8-12 servings",
  "eight-inch": "Approx. 14-20 servings",
  "cake-shooters": "Approx. 12 servings per dozen"
} as const;

export function servingLabel(offeringId: string) {
  return servingsByOfferingId[offeringId as keyof typeof servingsByOfferingId] ?? "";
}
