import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AddNewPartyModal from "./AddNewPartyModal";

vi.mock("../../hooks/useTenantId", () => ({
  default: () => 1,
}));

vi.mock("../../context/ToastContext", () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock("../../api/salesApi", () => ({
  getCustomers: vi.fn(() => Promise.resolve({ data: [] })),
  createCustomer: vi.fn(() => Promise.resolve({ data: {} })),
  updateCustomer: vi.fn(() => Promise.resolve({ data: {} })),
}));

vi.mock("../../api/mastersVendorsApi", () => ({
  listMastersVendors: vi.fn(() => Promise.resolve({ data: [] })),
  createMastersVendor: vi.fn(() => Promise.resolve({ data: {} })),
  updateMastersVendor: vi.fn(() => Promise.resolve({ data: {} })),
}));

describe("AddNewPartyModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a + add billing address button and opens the billing address modal", async () => {
    render(<AddNewPartyModal open onClose={vi.fn()} onSaved={vi.fn()} />);

    const addButton = screen.getByRole("button", { name: /\+ add billing address/i });
    fireEvent.click(addButton);

    expect(await screen.findByRole("heading", { name: /add billing address/i })).toBeInTheDocument();
  });
});
