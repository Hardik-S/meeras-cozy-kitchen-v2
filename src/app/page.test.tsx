import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  it("guides customers through the quote request and shows serving estimates", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { name: "How to order" })).toBeInTheDocument();
    expect(screen.getByText("Choose between cake shooters or any size cake.")).toBeInTheDocument();
    expect(screen.getByText("Choose your favourite flavour combination.")).toBeInTheDocument();
    expect(screen.getByText("Add a filling or topping (if you're feeling fancy).")).toBeInTheDocument();
    expect(screen.getByText("Describe any design elements you have in mind.")).toBeInTheDocument();
    expect(screen.getByText("Add your contact information and select your pickup window.")).toBeInTheDocument();
    expect(screen.getByText("Send your inquiry!")).toBeInTheDocument();
    expect(screen.getByText("You can expect a response within 24 hours.")).toBeInTheDocument();
    expect(screen.getByText("Approx. 3-6 servings")).toBeInTheDocument();
    expect(screen.getByText("Approx. 8-12 servings")).toBeInTheDocument();
    expect(screen.getByText("Approx. 14-20 servings")).toBeInTheDocument();
    expect(screen.getByText("Approx. 12 servings per dozen")).toBeInTheDocument();
  });
});
