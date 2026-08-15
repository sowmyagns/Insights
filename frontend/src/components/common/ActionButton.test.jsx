import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ActionButton from "./ActionButton";

describe("ActionButton (alias of Button)", () => {
  it("renders the provided label and variant styles", () => {
    render(<ActionButton variant="primary">Create</ActionButton>);
    const btn = screen.getByRole("button", { name: /create/i });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain("ui-btn--primary");
  });
});
