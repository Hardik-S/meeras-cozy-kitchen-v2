"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

type PickupDatePickerProps = {
  min: string;
  value: string;
  onChange: (value: string) => void;
  "aria-label": string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(parseDate(value));
}

export function PickupDatePicker({ min, value, onChange, ...aria }: PickupDatePickerProps) {
  const minimumDate = useMemo(() => parseDate(min), [min]);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(minimumDate));
  const [focusDate, setFocusDate] = useState<string | null>(null);
  const selectedDate = value ? parseDate(value) : null;
  const calendarId = "pickup-date-calendar";

  useEffect(() => {
    if (!open || !focusDate) return;
    calendarRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focusDate}"]`)?.focus();
    setFocusDate(null);
  }, [focusDate, open, visibleMonth]);

  const openCalendar = () => {
    const initialDate = selectedDate && selectedDate >= minimumDate ? selectedDate : minimumDate;
    setVisibleMonth(monthStart(initialDate));
    setFocusDate(dateValue(initialDate));
    setOpen(true);
  };

  const closeCalendar = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  const chooseDate = (date: Date) => {
    if (date < minimumDate) return;
    onChange(dateValue(date));
    closeCalendar(false);
  };

  const moveFocus = (date: Date, amount: number) => {
    const next = addDays(date, amount);
    if (next < minimumDate) return;
    setVisibleMonth(monthStart(next));
    setFocusDate(dateValue(next));
  };

  const firstDay = visibleMonth.getDay();
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const monthLabel = new Intl.DateTimeFormat("en-CA", { month: "long", year: "numeric" }).format(visibleMonth);
  const previousMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
  const previousMonthDisabled = previousMonth.getFullYear() < minimumDate.getFullYear()
    || (previousMonth.getFullYear() === minimumDate.getFullYear() && previousMonth.getMonth() < minimumDate.getMonth());

  return (
    <div className="pickup-date-picker">
      <button
        {...aria}
        aria-controls={calendarId}
        aria-expanded={open}
        className="form-control pickup-date-trigger"
        ref={triggerRef}
        type="button"
        onClick={() => (open ? closeCalendar() : openCalendar())}
      >
        <span>{value ? formatDate(value) : "Choose a pickup date"}</span>
        <CalendarDays aria-hidden="true" size={18} />
      </button>
      {open ? (
        <div
          aria-label="Pickup date calendar"
          className="pickup-date-popover"
          id={calendarId}
          ref={calendarRef}
          role="dialog"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              closeCalendar();
            }
          }}
        >
          <div className="pickup-date-calendar-header">
            <button
              aria-label="Previous month"
              className="pickup-date-month-button"
              disabled={previousMonthDisabled}
              type="button"
              onClick={() => setVisibleMonth(previousMonth)}
            >
              <ChevronLeft aria-hidden="true" size={18} />
            </button>
            <h2>{monthLabel}</h2>
            <button
              aria-label="Next month"
              className="pickup-date-month-button"
              type="button"
              onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
            >
              <ChevronRight aria-hidden="true" size={18} />
            </button>
          </div>
          <div aria-label={monthLabel} className="pickup-date-grid" role="grid">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <span className="pickup-date-weekday" key={day}>{day}</span>
            ))}
            {Array.from({ length: firstDay }, (_, index) => <span aria-hidden="true" key={`blank-${index}`} />)}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const date = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), index + 1);
              const dateString = dateValue(date);
              const disabled = date < minimumDate;
              const selected = value === dateString;

              return (
                <button
                  aria-label={formatDate(dateString)}
                  aria-selected={selected}
                  className={`pickup-date-day${selected ? " pickup-date-day-selected" : ""}`}
                  data-date={dateString}
                  disabled={disabled}
                  key={dateString}
                  role="gridcell"
                  type="button"
                  onClick={() => chooseDate(date)}
                  onKeyDown={(event) => {
                    const keyOffsets: Record<string, number> = {
                      ArrowDown: 7,
                      ArrowLeft: -1,
                      ArrowRight: 1,
                      ArrowUp: -7
                    };
                    if (event.key in keyOffsets) {
                      event.preventDefault();
                      moveFocus(date, keyOffsets[event.key]);
                    }
                  }}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          <p aria-live="polite" className="pickup-date-selection">
            {value ? `Selected pickup date: ${formatDate(value)}` : `Choose a date on or after ${formatDate(min)}.`}
          </p>
        </div>
      ) : null}
    </div>
  );
}
