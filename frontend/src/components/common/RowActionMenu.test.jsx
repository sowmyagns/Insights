import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import RowActionMenu from "./RowActionMenu";

function ControlledMenuHarness() {
  const [openMenu, setOpenMenu] = useState(null);

  return (
    <RowActionMenu
      rowId={42}
      openMenu={openMenu}
      setOpenMenu={setOpenMenu}
      items={[{ label: "View Profile", onClick: vi.fn() }]}
    />
  );
}

describe("RowActionMenu", () => {
  it("opens the action menu when a parent controls the open state", () => {
    render(<ControlledMenuHarness />);

    fireEvent.mouseDown(screen.getByRole("button", { name: /open actions/i }));
    fireEvent.click(screen.getByRole("button", { name: /open actions/i }));

    expect(screen.getByRole("menuitem", { name: /view profile/i })).toBeInTheDocument();
  });
});
