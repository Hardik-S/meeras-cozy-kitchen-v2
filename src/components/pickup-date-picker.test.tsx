import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PickupDatePicker } from "./pickup-date-picker";

const formatDate = (value: string) => new Intl.DateTimeFormat("en-CA", {
  weekday: "short",
  month: "long",
  day: "numeric",
  year: "numeric"
}).format(new Date(`${value}T00:00:00`));

describe("PickupDatePicker", () => {
  it("disables dates before the minimum and returns the selected ISO date", () => {
    const onChange = vi.fn();
    render(<PickupDatePicker aria-label="Pickup date" min="2030-05-15" value="" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Pickup date" }));

    expect(screen.getByRole("gridcell", { name: formatDate("2030-05-14") })).toBeDisabled();
    fireEvent.click(screen.getByRole("gridcell", { name: formatDate("2030-05-16") }));

    expect(onChange).toHaveBeenCalledWith("2030-05-16");
    expect(screen.queryByRole("dialog", { name: "Pickup date calendar" })).not.toBeInTheDocument();
  });

  it("supports month navigation and closes on Escape while returning focus to the trigger", () => {
    render(<PickupDatePicker aria-label="Pickup date" min="2030-05-15" value="" onChange={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: "Pickup date" });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByRole("heading", { name: "June 2030" })).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole("dialog", { name: "Pickup date calendar" }), { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Pickup date calendar" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("moves the active day with arrow keys", () => {
    render(<PickupDatePicker aria-label="Pickup date" min="2030-05-15" value="" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Pickup date" }));
    const firstAvailable = screen.getByRole("gridcell", { name: formatDate("2030-05-15") });
    fireEvent.keyDown(firstAvailable, { key: "ArrowRight" });

    expect(screen.getByRole("gridcell", { name: formatDate("2030-05-16") })).toHaveFocus();
  });
});
