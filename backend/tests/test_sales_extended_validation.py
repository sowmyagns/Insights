"""Tests for sales_extended.py: independent list instances (no mutable defaults)."""

import pytest
from pydantic import ValidationError

from app.schemas.sales_extended import (
    SOListRead,
    SOLineItemRead,
    DeliveryChallanRead,
    SalesHubRead,
    QuotationListRead,
    InvoiceListEnrichedRead,
    LeadListRead,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_so_list_read(**kwargs):
    defaults = dict(id=1, order_number="SO-001", order_date="2024-01-01")
    defaults.update(kwargs)
    return SOListRead(**defaults)


def _make_delivery_challan_read(**kwargs):
    defaults = dict(
        challan_number="DC-001",
        dispatch_number="DISP-001",
        sales_order_id=1,
    )
    defaults.update(kwargs)
    return DeliveryChallanRead(**defaults)


# ---------------------------------------------------------------------------
# SOListRead.line_items — must be independent across instances
# ---------------------------------------------------------------------------


class TestSOListReadLineItemsIndependence:
    """line_items must use Field(default_factory=list), not a shared mutable default."""

    def test_two_instances_have_independent_line_items(self):
        a = _make_so_list_read()
        b = _make_so_list_read()
        a.line_items.append({"item_description": "Widget", "quantity": 5})
        assert b.line_items == [], (
            "Modifying line_items on one SOListRead should not affect another instance"
        )

    def test_default_line_items_is_empty_list(self):
        obj = _make_so_list_read()
        assert obj.line_items == []

    def test_line_items_accepts_provided_value(self):
        from app.schemas.sales_extended import SOLineItemRead
        item = SOLineItemRead(item_description="Bolt", quantity=10, unit="pcs", unit_price=1.5, line_total=15.0)
        obj = _make_so_list_read(line_items=[item])
        assert len(obj.line_items) == 1
        assert obj.line_items[0].item_description == "Bolt"


# ---------------------------------------------------------------------------
# DeliveryChallanRead.lines — must be independent across instances
# ---------------------------------------------------------------------------


class TestDeliveryChallanReadLinesIndependence:
    """lines must use Field(default_factory=list), not a shared mutable default."""

    def test_two_instances_have_independent_lines(self):
        a = _make_delivery_challan_read()
        b = _make_delivery_challan_read()
        a.lines.append({"product": "Widget", "qty": 5})
        assert b.lines == [], (
            "Modifying lines on one DeliveryChallanRead should not affect another instance"
        )

    def test_default_lines_is_empty_list(self):
        obj = _make_delivery_challan_read()
        assert obj.lines == []


# ---------------------------------------------------------------------------
# SalesHubRead — top_customers, sales_executive_performance, alerts independent
# ---------------------------------------------------------------------------


class TestSalesHubReadListsIndependence:
    """All three list fields must use Field(default_factory=list)."""

    def test_top_customers_independent_across_instances(self):
        a = SalesHubRead()
        b = SalesHubRead()
        a.top_customers.append({"name": "Acme", "revenue": 50000})
        assert b.top_customers == []

    def test_sales_executive_performance_independent_across_instances(self):
        a = SalesHubRead()
        b = SalesHubRead()
        a.sales_executive_performance.append({"exec": "Alice", "sales": 10})
        assert b.sales_executive_performance == []

    def test_alerts_independent_across_instances(self):
        a = SalesHubRead()
        b = SalesHubRead()
        a.alerts.append({"type": "overdue", "count": 3})
        assert b.alerts == []

    def test_defaults_are_empty_lists(self):
        obj = SalesHubRead()
        assert obj.top_customers == []
        assert obj.sales_executive_performance == []
        assert obj.alerts == []


# ---------------------------------------------------------------------------
# SOLineItemRead — quantity, unit_price, line_total must be >= 0
# ---------------------------------------------------------------------------


class TestSOLineItemReadNonNegative:
    """quantity, unit_price, and line_total must not be negative."""

    @pytest.mark.parametrize("field,value", [
        ("quantity", -5),
        ("quantity", -0.01),
        ("unit_price", -100),
        ("unit_price", -0.001),
        ("line_total", -500),
        ("line_total", -1),
    ])
    def test_negative_value_rejected(self, field, value):
        with pytest.raises(ValidationError, match="cannot be negative"):
            SOLineItemRead(**{field: value})

    @pytest.mark.parametrize("field,value", [
        ("quantity", 0),
        ("quantity", 10.5),
        ("unit_price", 0.0),
        ("unit_price", 99.99),
        ("line_total", 0),
        ("line_total", 1049.50),
    ])
    def test_zero_and_positive_accepted(self, field, value):
        obj = SOLineItemRead(**{field: value})
        assert getattr(obj, field) == value

    def test_all_fields_valid(self):
        obj = SOLineItemRead(
            item_description="Widget",
            quantity=5.0,
            unit="pcs",
            unit_price=20.0,
            line_total=100.0,
        )
        assert obj.quantity == 5.0
        assert obj.unit_price == 20.0
        assert obj.line_total == 100.0

    def test_defaults_are_zero(self):
        obj = SOLineItemRead()
        assert obj.quantity == 0.0
        assert obj.unit_price == 0.0
        assert obj.line_total == 0.0


# ---------------------------------------------------------------------------
# Monetary float fields — must be >= 0 across all sales read schemas
# ---------------------------------------------------------------------------


class TestQuotationListReadAmountNonNegative:
    """QuotationListRead.amount must not be negative."""

    def test_negative_amount_rejected(self):
        with pytest.raises(ValidationError, match="cannot be negative"):
            QuotationListRead(id=1, quote_number="Q-001", amount=-1000)

    def test_zero_amount_accepted(self):
        obj = QuotationListRead(id=1, quote_number="Q-001", amount=0)
        assert obj.amount == 0.0

    def test_positive_amount_accepted(self):
        obj = QuotationListRead(id=1, quote_number="Q-001", amount=5000.50)
        assert obj.amount == 5000.50


class TestSOListReadAmountsNonNegative:
    """SOListRead.amount and total_amount must not be negative."""

    @pytest.mark.parametrize("field,value", [
        ("amount", -1),
        ("amount", -0.01),
        ("total_amount", -500),
        ("total_amount", -0.001),
    ])
    def test_negative_value_rejected(self, field, value):
        with pytest.raises(ValidationError, match="cannot be negative"):
            SOListRead(id=1, order_number="SO-001", order_date="2024-01-01", **{field: value})

    def test_valid_amounts_accepted(self):
        obj = SOListRead(id=1, order_number="SO-001", order_date="2024-01-01", amount=100.0, total_amount=110.0)
        assert obj.amount == 100.0
        assert obj.total_amount == 110.0


class TestDeliveryChallanReadTotalAmountNonNegative:
    """DeliveryChallanRead.total_amount must not be negative."""

    def test_negative_total_amount_rejected(self):
        with pytest.raises(ValidationError, match="cannot be negative"):
            DeliveryChallanRead(
                challan_number="DC-001",
                dispatch_number="DISP-001",
                sales_order_id=1,
                total_amount=-250,
            )

    def test_zero_total_amount_accepted(self):
        obj = DeliveryChallanRead(
            challan_number="DC-001", dispatch_number="DISP-001", sales_order_id=1, total_amount=0
        )
        assert obj.total_amount == 0.0


class TestInvoiceListEnrichedReadNonNegative:
    """InvoiceListEnrichedRead monetary fields must not be negative."""

    @pytest.mark.parametrize("field,value", [
        ("amount", -100),
        ("gst_amount", -18),
        ("amount_paid", -50),
    ])
    def test_negative_value_rejected(self, field, value):
        with pytest.raises(ValidationError, match="cannot be negative"):
            InvoiceListEnrichedRead(id=1, invoice_number="INV-001", **{field: value})

    def test_valid_invoice_amounts_accepted(self):
        obj = InvoiceListEnrichedRead(
            id=1, invoice_number="INV-001", amount=1000.0, gst_amount=180.0, amount_paid=500.0
        )
        assert obj.amount == 1000.0
        assert obj.gst_amount == 180.0
        assert obj.amount_paid == 500.0


class TestSalesHubReadMonetaryNonNegative:
    """SalesHubRead.monthly_revenue and outstanding_payments must not be negative."""

    @pytest.mark.parametrize("field,value", [
        ("monthly_revenue", -1000),
        ("outstanding_payments", -500),
    ])
    def test_negative_value_rejected(self, field, value):
        with pytest.raises(ValidationError, match="cannot be negative"):
            SalesHubRead(**{field: value})

    def test_valid_monetary_values_accepted(self):
        obj = SalesHubRead(monthly_revenue=50000.0, outstanding_payments=12000.0)
        assert obj.monthly_revenue == 50000.0
        assert obj.outstanding_payments == 12000.0


# ---------------------------------------------------------------------------
# LeadListRead.opportunity_value — must be >= 0 or None
# ---------------------------------------------------------------------------


class TestLeadListReadOpportunityValueNonNegative:
    """opportunity_value must be None or a non-negative float."""

    _BASE = dict(id=1, lead_id="L-001", customer_name="Acme Corp")

    @pytest.mark.parametrize("value", [-50000, -0.01, -1])
    def test_negative_opportunity_value_rejected(self, value):
        with pytest.raises(ValidationError, match="cannot be negative"):
            LeadListRead(**self._BASE, opportunity_value=value)

    def test_none_opportunity_value_accepted(self):
        obj = LeadListRead(**self._BASE, opportunity_value=None)
        assert obj.opportunity_value is None

    def test_zero_opportunity_value_accepted(self):
        obj = LeadListRead(**self._BASE, opportunity_value=0)
        assert obj.opportunity_value == 0.0

    def test_positive_opportunity_value_accepted(self):
        obj = LeadListRead(**self._BASE, opportunity_value=50000.0)
        assert obj.opportunity_value == 50000.0
