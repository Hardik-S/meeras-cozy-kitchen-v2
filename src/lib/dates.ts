import { business } from "@/content/business";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getMinimumPickupDate(today = new Date(), noticeDays = business.minimumNoticeDays) {
  const minimum = new Date(today);
  minimum.setHours(0, 0, 0, 0);
  minimum.setTime(minimum.getTime() + noticeDays * MS_PER_DAY);

  return toDateInputValue(minimum);
}

export function isAtLeastMinimumNotice(dateInput: string, today = new Date()) {
  if (!dateInput) {
    return false;
  }

  return dateInput >= getMinimumPickupDate(today);
}
