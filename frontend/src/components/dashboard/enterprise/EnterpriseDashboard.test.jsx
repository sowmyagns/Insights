import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetErpDashboard = vi.fn();

vi.mock("../../../api/dashboardApi", () => ({
  getErpDashboard: mockGetErpDashboard,
}));

vi.mock("../../../hooks/useAuth", () => ({
  default: () => ({ user: { name: "Test User" } }),
}));

import EnterpriseDashboard from "./EnterpriseDashboard";

describe("EnterpriseDashboard", () => {
  beforeEach(() => {
    mockGetErpDashboard.mockResolvedValue({
      data: {
        kpi_cards: [
          {
            id: "total-orders",
            title: "Total Orders",
            value: "12",
            trend: "10%",
            trendUp: true,
            trendLabel: "vs last 7 days",
          },
        ],
        production_overview: [{ date: "01 Jul", planned: 100, actual: 90 }],
        production_overview_weekly: [],
        production_overview_monthly: [],
        production_overview_yearly: [],
        shop_floor_status: [{ name: "Running", value: 2, color: "#22C55E" }],
        top_machines: [{ id: "M1", name: "Machine 1", utilization: 95 }],
        orders_overview: { total: 12, inProgress: 3, completed: 7, onHold: 2, progress: 58 },
        alerts_feed: [],
        recent_work_orders: [],
        inventory_summary: {
          raw_materials_count: 5,
          wip_items_count: 2,
          finished_goods_count: 3,
          low_stock_count: 1,
          warehouse_locations: [],
        },
        todays_summary: [{ label: "Man Power", value: "3", icon: "users" }],
        shop_floor: { oee_pct: 81 },
      },
    });
  });

  it("renders KPI values from the live ERP dashboard payload", async () => {
    render(
      <MemoryRouter>
        <EnterpriseDashboard />
      </MemoryRouter>
    );
    expect(await screen.findByText("Insights Iva Command Center")).toBeInTheDocument();
  });
});
