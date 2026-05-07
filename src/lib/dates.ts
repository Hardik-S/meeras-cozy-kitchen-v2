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

export function isValidDateInput(dateInput: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateInput);

  if (!match) {
    return false;
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsed = new Date(year, month - 1, day);

  return parsed.getFullYear() === year
    && parsed.getMonth() === month - 1
    && parsed.getDate() === day;
}

export function isAtLeastMinimumNotice(dateInput: string, today = new Date()) {
  if (!isValidDateInput(dateInput)) {
    return false;
  }

  return dateInput >= getMinimumPickupDate(today);
}
