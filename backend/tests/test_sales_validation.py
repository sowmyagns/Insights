"""Tests for sales.py: mutable list defaults replaced with Field(default_factory=list)."""

from datetime import date

import pytest

from app.schemas.sales import (
    SalesOrderCreate,
    SalesOrderLineCreate,
    InvoiceCreate,
    InvoiceListRead,
    InvoiceItemCreate,
    PaymentCreate,
    PaymentUpdate,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_SO_BASE = dict(
    tenant_id=1,
    customer_id=1,
    order_number="SO-001",
    order_date=date(2024, 1, 1),
)

_INV_BASE = dict(
    tenant_id=1,
    customer_id=1,
    invoice_number="INV-001",
    issue_date=date(2024, 1, 1),
)

_INV_READ_BASE = dict(
    **_INV_BASE,
    id=1,
)


# ---------------------------------------------------------------------------
# SalesOrderCreate.line_items — independent across instances
# ---------------------------------------------------------------------------


class TestSalesOrderCreateLineItemsIndependence:
    """line_items must use Field(default_factory=list), not a shared mutable default."""

    def test_two_instances_have_independent_line_items(self):
        a = SalesOrderCreate(**_SO_BASE)
        b = SalesOrderCreate(**_SO_BASE)
        a.line_items.append({"item_description": "Widget", "quantity": 5})
        assert b.line_items == [], (
            "Modifying line_items on one SalesOrderCreate should not affect another instance"
        )

    def test_default_line_items_is_empty_list(self):
        obj = SalesOrderCreate(**_SO_BASE)
        assert obj.line_items == []

    def test_line_items_accepts_provided_value(self):
        from app.schemas.sales import SalesOrderLineCreate
        item = SalesOrderLineCreate(item_description="Bolt", quantity=10)
        obj = SalesOrderCreate(**_SO_BASE, line_items=[item])
        assert len(obj.line_items) == 1
        assert obj.line_items[0].item_description == "Bolt"


# ---------------------------------------------------------------------------
# InvoiceCreate.items — independent across instances
# ---------------------------------------------------------------------------


class TestInvoiceCreateItemsIndependence:
    """items must use Field(default_factory=list), not a shared mutable default."""

    def test_two_instances_have_independent_items(self):
        a = InvoiceCreate(**_INV_BASE)
        b = InvoiceCreate(**_INV_BASE)
        a.items.append({"description": "Service fee", "qty": 1})
        assert b.items == [], (
            "Modifying items on one InvoiceCreate should not affect another instance"
        )

    def test_default_items_is_empty_list(self):
        obj = InvoiceCreate(**_INV_BASE)
        assert obj.items == []


# ---------------------------------------------------------------------------
# InvoiceListRead.items — independent across instances
# ---------------------------------------------------------------------------


class TestInvoiceListReadItemsIndependence:
    """items must use Field(default_factory=list), not a shared mutable default."""

    def test_two_instances_have_independent_items(self):
        a = InvoiceListRead(**_INV_READ_BASE)
        b = InvoiceListRead(**_INV_READ_BASE)
        a.items.append({"description": "Consulting", "qty": 2})
        assert b.items == [], (
            "Modifying items on one InvoiceListRead should not affect another instance"
        )

    def test_default_items_is_empty_list(self):
        obj = InvoiceListRead(**_INV_READ_BASE)
        assert obj.items == []


# ---------------------------------------------------------------------------
# InvoiceItemBase (via InvoiceItemCreate) — qty > 0, rate >= 0
# ---------------------------------------------------------------------------


class TestInvoiceItemBaseNonNegative:
    """qty must be > 0 and rate must be >= 0 on InvoiceItemBase / InvoiceItemCreate."""

    from pydantic import ValidationError as _VE

    @pytest.mark.parametrize("value", [-5, -0.01, -1, 0])
    def test_negative_or_zero_qty_rejected(self, value):
        from pydantic import ValidationError
        with pytest.raises(ValidationError, match="[Qq]uantity|qty|greater than"):
            InvoiceItemCreate(item_description="Widget", qty=value)

    @pytest.mark.parametrize("value", [-100, -0.01, -1])
    def test_negative_rate_rejected(self, value):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            InvoiceItemCreate(item_description="Widget", qty=1, rate=value)

    def test_valid_qty_and_rate_accepted(self):
        obj = InvoiceItemCreate(item_description="Widget", qty=5.0, rate=20.0, amount=100.0)
        assert obj.qty == 5.0
        assert obj.rate == 20.0
        assert obj.amount == 100.0

    def test_zero_rate_accepted(self):
        obj = InvoiceItemCreate(item_description="Free item", qty=1, rate=0.0)
        assert obj.rate == 0.0

    def test_fractional_qty_accepted(self):
        obj = InvoiceItemCreate(item_description="Half unit", qty=0.5, rate=10.0)
        assert obj.qty == 0.5


# ---------------------------------------------------------------------------
# SalesOrderLineBase (via SalesOrderLineCreate) — quantity, unit_price, line_total >= 0
# ---------------------------------------------------------------------------


class TestSalesOrderLineBaseNonNegative:
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
        from pydantic import ValidationError
        kwargs = {"item_description": "Widget", "quantity": 1, field: value}
        with pytest.raises(ValidationError, match="cannot be negative"):
            SalesOrderLineCreate(**kwargs)

    @pytest.mark.parametrize("field,value", [
        ("quantity", 0),
        ("quantity", 10.5),
        ("unit_price", 0.0),
        ("unit_price", 99.99),
        ("line_total", 0),
        ("line_total", 1049.50),
    ])
    def test_zero_and_positive_accepted(self, field, value):
        base = {"item_description": "Widget"}
        if field != "quantity":
            base["quantity"] = 1
        base[field] = value
        obj = SalesOrderLineCreate(**base)
        assert getattr(obj, field) == value


    def test_all_valid_fields_accepted(self):
        obj = SalesOrderLineCreate(
            item_description="Steel Bolt",
            quantity=100.0,
            unit="pcs",
            unit_price=5.50,
            line_total=550.0,
        )
        assert obj.quantity == 100.0
        assert obj.unit_price == 5.50
        assert obj.line_total == 550.0

    def test_defaults_are_zero_for_price_fields(self):
        obj = SalesOrderLineCreate(item_description="Widget", quantity=1)
        assert obj.unit_price == 0.0
        assert obj.line_total == 0.0


# ---------------------------------------------------------------------------
# PaymentBase / PaymentCreate / PaymentUpdate — amount must be > 0
# ---------------------------------------------------------------------------

_PAY_BASE = dict(tenant_id=1, invoice_id=1, payment_date=date(2024, 1, 1))


class TestPaymentBaseAmountPositive:
    """PaymentCreate.amount must be > 0 (zero and negative rejected)."""

    @pytest.mark.parametrize("value", [0, -1, -1000, -0.01])
    def test_zero_or_negative_amount_rejected_in_payment_create(self, value):
        from pydantic import ValidationError
        with pytest.raises(ValidationError, match="greater than zero"):
            PaymentCreate(**_PAY_BASE, amount=value)

    def test_positive_amount_accepted_in_payment_create(self):
        obj = PaymentCreate(**_PAY_BASE, amount=500.0)
        assert obj.amount == 500.0

    def test_fractional_positive_amount_accepted(self):
        obj = PaymentCreate(**_PAY_BASE, amount=0.01)
        assert obj.amount == 0.01


class TestPaymentUpdateAmountPositive:
    """PaymentUpdate.amount must be > 0 when supplied; None is accepted."""

    @pytest.mark.parametrize("value", [0, -500, -0.01])
    def test_zero_or_negative_amount_rejected_in_payment_update(self, value):
        from pydantic import ValidationError
        with pytest.raises(ValidationError, match="greater than zero"):
            PaymentUpdate(amount=value)

    def test_none_amount_accepted_in_payment_update(self):
        obj = PaymentUpdate(amount=None)
        assert obj.amount is None

    def test_positive_amount_accepted_in_payment_update(self):
        obj = PaymentUpdate(amount=250.0)
        assert obj.amount == 250.0


# ---------------------------------------------------------------------------
# InvoiceBase / InvoiceCreate — subtotal, grand_total, amount_paid, etc. >= 0
# ---------------------------------------------------------------------------


class TestInvoiceBaseNonNegative:
    """subtotal, grand_total, amount_paid, and tax amounts must not be negative."""

    @pytest.mark.parametrize("field,value", [
        ("subtotal", -100),
        ("subtotal", -0.01),
        ("grand_total", -500),
        ("grand_total", -1),
        ("amount_paid", -200),
        ("amount_paid", -0.5),
        ("discount", -10),
        ("sgst_amount", -5),
        ("cgst_amount", -5),
        ("igst_amount", -10),
    ])
    def test_negative_monetary_values_rejected(self, field, value):
        from pydantic import ValidationError
        kwargs = dict(**_INV_BASE, **{field: value})
        with pytest.raises(ValidationError, match="cannot be negative"):
            InvoiceCreate(**kwargs)

    @pytest.mark.parametrize("field,value", [
        ("subtotal", 0.0),
        ("subtotal", 1000.50),
        ("grand_total", 0.0),
        ("grand_total", 1180.0),
        ("amount_paid", 0.0),
        ("amount_paid", 500.0),
        ("discount", 0.0),
        ("discount", 50.0),
    ])
    def test_valid_monetary_values_accepted(self, field, value):
        kwargs = dict(**_INV_BASE, **{field: value})
        obj = InvoiceCreate(**kwargs)
        assert getattr(obj, field) == value


# ---------------------------------------------------------------------------
# LeadBase / LeadCreate — opportunity_value >= 0 or None
# ---------------------------------------------------------------------------


class TestLeadBaseOpportunityValueNonNegative:
    """opportunity_value must be None or a non-negative float."""

    @pytest.mark.parametrize("value", [-50000, -50000.0, -0.01, -1])
    def test_negative_opportunity_value_rejected(self, value):
        from pydantic import ValidationError
        from app.schemas.sales import LeadBase, LeadCreate
        with pytest.raises(ValidationError, match="cannot be negative"):
            LeadBase(name="Test Lead", opportunity_value=value)
        with pytest.raises(ValidationError, match="cannot be negative"):
            LeadCreate(name="Test Lead", opportunity_value=value)

    def test_none_opportunity_value_accepted(self):
        from app.schemas.sales import LeadBase, LeadCreate
        b = LeadBase(name="Test Lead", opportunity_value=None)
        c = LeadCreate(name="Test Lead", opportunity_value=None)
        assert b.opportunity_value is None
        assert c.opportunity_value is None

    def test_zero_opportunity_value_accepted(self):
        from app.schemas.sales import LeadBase, LeadCreate
        b = LeadBase(name="Test Lead", opportunity_value=0)
        c = LeadCreate(name="Test Lead", opportunity_value=0)
        assert b.opportunity_value == 0.0
        assert c.opportunity_value == 0.0

    def test_positive_opportunity_value_accepted(self):
        from app.schemas.sales import LeadBase, LeadCreate
        b = LeadBase(name="Test Lead", opportunity_value=50000.0)
        c = LeadCreate(name="Test Lead", opportunity_value=50000.0)
        assert b.opportunity_value == 50000.0
        assert c.opportunity_value == 50000.0


# ---------------------------------------------------------------------------
# QuotationCreate / QuotationUpdate / QuotationBase — total_amount & discount >= 0
# ---------------------------------------------------------------------------


class TestQuotationAmountAndDiscountNonNegative:
    """total_amount and discount must not be negative."""

    @pytest.mark.parametrize("value", [-1000, -1000.0, -0.01, -1])
    def test_negative_total_amount_rejected_on_create(self, value):
        from pydantic import ValidationError
        from app.schemas.sales import QuotationCreate
        with pytest.raises(ValidationError, match="cannot be negative"):
            QuotationCreate(total_amount=value)

    @pytest.mark.parametrize("value", [-10, -10.0, -0.01, -1])
    def test_negative_discount_rejected_on_create(self, value):
        from pydantic import ValidationError
        from app.schemas.sales import QuotationCreate
        with pytest.raises(ValidationError, match="cannot be negative"):
            QuotationCreate(discount=value)

    @pytest.mark.parametrize("value", [-1000, -0.01])
    def test_negative_total_amount_rejected_on_update(self, value):
        from pydantic import ValidationError
        from app.schemas.sales import QuotationUpdate
        with pytest.raises(ValidationError, match="cannot be negative"):
            QuotationUpdate(total_amount=value)

    @pytest.mark.parametrize("value", [-10, -0.01])
    def test_negative_discount_rejected_on_update(self, value):
        from pydantic import ValidationError
        from app.schemas.sales import QuotationUpdate
        with pytest.raises(ValidationError, match="cannot be negative"):
            QuotationUpdate(discount=value)

    @pytest.mark.parametrize("value", [-1000, -0.01])
    def test_negative_total_amount_rejected_on_base(self, value):
        from datetime import date
        from pydantic import ValidationError
        from app.schemas.sales import QuotationBase
        with pytest.raises(ValidationError, match="cannot be negative"):
            QuotationBase(
                tenant_id=1,
                quote_number="Q-001",
                quote_date=date(2024, 1, 1),
                total_amount=value,
            )

    def test_valid_total_amount_and_discount_accepted(self):
        from app.schemas.sales import QuotationCreate, QuotationUpdate
        c = QuotationCreate(total_amount=15000.0, discount=500.0)
        assert c.total_amount == 15000.0
        assert c.discount == 500.0

        c_zero = QuotationCreate(total_amount=0.0, discount=0.0)
        assert c_zero.total_amount == 0.0
        assert c_zero.discount == 0.0

        u = QuotationUpdate(total_amount=20000.0, discount=100.0)
        assert u.total_amount == 20000.0
        assert u.discount == 100.0


# ---------------------------------------------------------------------------
# QuotationConvertRequest — quantity & unit_price >= 0 or None
# ---------------------------------------------------------------------------


class TestQuotationConvertRequestValidation:
    """quantity and unit_price must be >= 0 or None."""

    @pytest.mark.parametrize("value", [-5, -5.0, -0.01, -1])
    def test_negative_quantity_rejected(self, value):
        from pydantic import ValidationError
        from app.schemas.sales import QuotationConvertRequest
        with pytest.raises(ValidationError, match="cannot be negative"):
            QuotationConvertRequest(quantity=value)

    @pytest.mark.parametrize("value", [-100, -100.0, -0.01, -1])
    def test_negative_unit_price_rejected(self, value):
        from pydantic import ValidationError
        from app.schemas.sales import QuotationConvertRequest
        with pytest.raises(ValidationError, match="cannot be negative"):
            QuotationConvertRequest(unit_price=value)

    def test_valid_quantity_and_unit_price_accepted(self):
        from app.schemas.sales import QuotationConvertRequest
        req = QuotationConvertRequest(
            product_id=1,
            item_description="Widget",
            quantity=5.0,
            unit="pcs",
            unit_price=100.0,
        )
        assert req.quantity == 5.0
        assert req.unit_price == 100.0

    def test_none_and_zero_values_accepted(self):
        from app.schemas.sales import QuotationConvertRequest
        req_none = QuotationConvertRequest(quantity=None, unit_price=None)
        assert req_none.quantity is None
        assert req_none.unit_price is None

        req_zero = QuotationConvertRequest(quantity=0.0, unit_price=0.0)
        assert req_zero.quantity == 0.0
        assert req_zero.unit_price == 0.0




