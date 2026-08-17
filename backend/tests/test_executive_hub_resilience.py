"""Tests: Executive Hub service-level resilience.

Verifies that get_executive_hub() returns a valid (partial) ExecutiveHubRead
even when individual analytics sub-services throw exceptions, and that the
ai_insights field carries an appropriate warning for unavailable sections.
"""

import pytest
from unittest.mock import MagicMock, patch

from app.schemas.analytics_extended import ExecutiveHubRead
from app.services.analytics_extended_service import get_executive_hub


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_db():
    """Return a minimal mock that satisfies Session usage in the service."""
    return MagicMock()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_executive_hub_all_services_fail():
    """All sub-services failing → hub still returns a valid ExecutiveHubRead."""
    db = _make_db()
    module = "app.services.analytics_extended_service"

    with (
        patch(f"{module}.get_production_analytics", side_effect=RuntimeError("db down")),
        patch(f"{module}.get_inventory_analytics",  side_effect=RuntimeError("db down")),
        patch(f"{module}.get_sales_analytics",      side_effect=RuntimeError("db down")),
        patch(f"{module}.get_finance_analytics",    side_effect=RuntimeError("db down")),
        patch(f"{module}.get_machine_efficiency",   side_effect=RuntimeError("db down")),
    ):
        result = get_executive_hub(db, tenant_id=1, year=2024)

    assert isinstance(result, ExecutiveHubRead)
    # KPIs still built (all zeros)
    assert len(result.kpis) == 9
    # Warning insight should mention all four unavailable sections
    assert len(result.ai_insights) == 1
    warning = result.ai_insights[0]
    assert warning.type == "warning"
    for section in ("production", "inventory", "sales", "finance"):
        assert section in warning.message


def test_executive_hub_only_sales_fails():
    """Only sales failing → hub returns data for all other sections, warns about sales."""
    from app.schemas.analytics_extended import (
        FinanceAnalyticsRead,
        InventoryAnalyticsRead,
        KpiItem,
        ProductionAnalyticsRead,
    )

    def _empty_prod(*_):
        return ProductionAnalyticsRead(
            kpis=[KpiItem(key="actual", label="A", value=100)],
            alerts=[], benchmarks=[],
            monthly_production=[], production_trend=[], daily_output=[],
            shift_wise=[], machine_wise=[], product_wise=[],
            operator_performance=[], downtime_analysis=[],
            worker_score=80.0, last_updated="2024-01-01",
        )

    def _empty_inv(*_):
        return InventoryAnalyticsRead(
            kpis=[KpiItem(key="value", label="V", value=500)],
            alerts=[],
            stock_in_vs_out=[], warehouse_occupancy=[], abc_analysis=[],
            inventory_aging=[], monthly_consumption=[], value_trend=[],
            fast_moving=[], slow_moving=[], dead_stock=[], reorder_alerts=[],
            last_updated="2024-01-01",
        )

    def _empty_fin(*_):
        return FinanceAnalyticsRead(
            kpis=[KpiItem(key="profit", label="P", value=200)],
            alerts=[],
            revenue_vs_expense=[], cash_flow=[], profit_trend=[],
            expense_category=[], receivable_aging=[], monthly_margin=[],
            drill_revenue=[], last_updated="2024-01-01",
        )

    db = _make_db()
    module = "app.services.analytics_extended_service"

    with (
        patch(f"{module}.get_production_analytics", side_effect=_empty_prod),
        patch(f"{module}.get_inventory_analytics",  side_effect=_empty_inv),
        patch(f"{module}.get_sales_analytics",      side_effect=RuntimeError("sales db offline")),
        patch(f"{module}.get_finance_analytics",    side_effect=_empty_fin),
        patch(f"{module}.get_machine_efficiency",   return_value={"overall_percent": 92}),
    ):
        result = get_executive_hub(db, tenant_id=1, year=2024)

    assert isinstance(result, ExecutiveHubRead)
    # Only sales should be listed as unavailable
    assert len(result.ai_insights) == 1
    warning = result.ai_insights[0]
    assert "sales" in warning.message
    assert "production" not in warning.message
    assert "inventory" not in warning.message
    assert "finance" not in warning.message

    # Non-failing KPIs should still carry real values
    prod_kpi = next((k for k in result.kpis if k.key == "production"), None)
    assert prod_kpi is not None
    assert prod_kpi.value == 100


def test_executive_hub_all_services_healthy():
    """When all services succeed no warning insight is injected."""
    from app.schemas.analytics_extended import (
        FinanceAnalyticsRead,
        InventoryAnalyticsRead,
        KpiItem,
        ProductionAnalyticsRead,
        SalesAnalyticsRead,
    )

    def _prod(*_):
        return ProductionAnalyticsRead(
            kpis=[], alerts=[], benchmarks=[],
            monthly_production=[], production_trend=[], daily_output=[],
            shift_wise=[], machine_wise=[], product_wise=[],
            operator_performance=[], downtime_analysis=[],
            worker_score=75.0, last_updated="2024-01-01",
        )

    def _inv(*_):
        return InventoryAnalyticsRead(
            kpis=[], alerts=[],
            stock_in_vs_out=[], warehouse_occupancy=[], abc_analysis=[],
            inventory_aging=[], monthly_consumption=[], value_trend=[],
            fast_moving=[], slow_moving=[], dead_stock=[], reorder_alerts=[],
            last_updated="2024-01-01",
        )

    def _sales(*_):
        return SalesAnalyticsRead(
            kpis=[], alerts=[], monthly_revenue=[],
            top_customers=[], top_products=[], regional_sales=[],
            sales_funnel=[], quotation_conversion=[], order_status=[],
            drill_revenue=[], last_updated="2024-01-01",
        )

    def _fin(*_):
        return FinanceAnalyticsRead(
            kpis=[], alerts=[],
            revenue_vs_expense=[], cash_flow=[], profit_trend=[],
            expense_category=[], receivable_aging=[], monthly_margin=[],
            drill_revenue=[], last_updated="2024-01-01",
        )

    db = _make_db()
    module = "app.services.analytics_extended_service"

    with (
        patch(f"{module}.get_production_analytics", side_effect=_prod),
        patch(f"{module}.get_inventory_analytics",  side_effect=_inv),
        patch(f"{module}.get_sales_analytics",      side_effect=_sales),
        patch(f"{module}.get_finance_analytics",    side_effect=_fin),
        patch(f"{module}.get_machine_efficiency",   return_value={}),
    ):
        result = get_executive_hub(db, tenant_id=1, year=2024)

    assert isinstance(result, ExecutiveHubRead)
    # No warning when everything works
    assert result.ai_insights == []
