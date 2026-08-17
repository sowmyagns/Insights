import pytest
from pydantic import ValidationError

from app.schemas.product import ProductCreate, ProductUpdate


def test_product_create_gst_percent_over_100_rejected():
    """gst_percent > 100 (e.g. 150) raises ValidationError."""
    invalid_gst_pcts = [100.1, 150.0, 200.0]
    for gst in invalid_gst_pcts:
        with pytest.raises(ValidationError) as exc_info:
            ProductCreate(tenant_id=1, name="Test Product", gst_percent=gst)
        assert any(err["loc"] == ("gst_percent",) for err in exc_info.value.errors())


def test_product_create_cess_percent_over_100_rejected():
    """cess_percent > 100 (e.g. 200) raises ValidationError."""
    invalid_cess_pcts = [100.1, 150.0, 200.0]
    for cess in invalid_cess_pcts:
        with pytest.raises(ValidationError) as exc_info:
            ProductCreate(tenant_id=1, name="Test Product", cess_percent=cess)
        assert any(err["loc"] == ("cess_percent",) for err in exc_info.value.errors())


def test_product_create_negative_tax_percent_rejected():
    """Negative gst_percent or cess_percent raises ValidationError."""
    invalid_pcts = [-10.0, -1.0, -0.01]
    for p in invalid_pcts:
        with pytest.raises(ValidationError) as exc_info:
            ProductCreate(tenant_id=1, name="Test Product", gst_percent=p)
        assert any(err["loc"] == ("gst_percent",) for err in exc_info.value.errors())

        with pytest.raises(ValidationError) as exc_info:
            ProductCreate(tenant_id=1, name="Test Product", cess_percent=p)
        assert any(err["loc"] == ("cess_percent",) for err in exc_info.value.errors())


def test_product_create_valid_tax_percent():
    """Tax percentage in [0, 100] passes validation."""
    valid_values = [0.0, 5.0, 12.0, 18.0, 28.0, 100.0]
    for val in valid_values:
        prod = ProductCreate(tenant_id=1, name="Test Product", gst_percent=val, cess_percent=val)
        assert prod.gst_percent == val
        assert prod.cess_percent == val


def test_product_update_gst_or_cess_percent_over_100_rejected():
    """ProductUpdate with gst_percent > 100 or cess_percent > 100 raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        ProductUpdate(gst_percent=150.0)
    assert any(err["loc"] == ("gst_percent",) for err in exc_info.value.errors())

    with pytest.raises(ValidationError) as exc_info:
        ProductUpdate(cess_percent=200.0)
    assert any(err["loc"] == ("cess_percent",) for err in exc_info.value.errors())


def test_product_create_negative_price_fields_rejected():
    """unit_cost=-100, unit_price=-50, or wholesale_price=-20 raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        ProductCreate(tenant_id=1, name="Test Product", unit_cost=-100.0)
    assert any(err["loc"] == ("unit_cost",) for err in exc_info.value.errors())

    with pytest.raises(ValidationError) as exc_info:
        ProductCreate(tenant_id=1, name="Test Product", unit_price=-50.0)
    assert any(err["loc"] == ("unit_price",) for err in exc_info.value.errors())

    with pytest.raises(ValidationError) as exc_info:
        ProductCreate(tenant_id=1, name="Test Product", wholesale_price=-20.0)
    assert any(err["loc"] == ("wholesale_price",) for err in exc_info.value.errors())


def test_product_update_negative_price_fields_rejected():
    """ProductUpdate with negative unit_cost, unit_price, or wholesale_price raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        ProductUpdate(unit_cost=-100.0)
    assert any(err["loc"] == ("unit_cost",) for err in exc_info.value.errors())

    with pytest.raises(ValidationError) as exc_info:
        ProductUpdate(unit_price=-50.0)
    assert any(err["loc"] == ("unit_price",) for err in exc_info.value.errors())

    with pytest.raises(ValidationError) as exc_info:
        ProductUpdate(wholesale_price=-20.0)
    assert any(err["loc"] == ("wholesale_price",) for err in exc_info.value.errors())


def test_product_create_valid_price_fields():
    """Zero or positive cost and prices pass validation."""
    prod = ProductCreate(
        tenant_id=1,
        name="Test Product",
        unit_cost=0.0,
        unit_price=50.0,
        wholesale_price=40.0,
    )
    assert prod.unit_cost == 0.0
    assert prod.unit_price == 50.0
    assert prod.wholesale_price == 40.0


def test_product_create_invalid_stock_range_rejected():
    """min_stock=100 and max_stock=50 (max_stock < min_stock) raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        ProductCreate(tenant_id=1, name="Test Product", min_stock=100, max_stock=50)
    assert "max_stock cannot be less than min_stock" in str(exc_info.value)


def test_product_update_invalid_stock_range_rejected():
    """ProductUpdate with min_stock=100 and max_stock=50 raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        ProductUpdate(min_stock=100, max_stock=50)
    assert "max_stock cannot be less than min_stock" in str(exc_info.value)


def test_product_create_valid_stock_range():
    """Valid stock range (max_stock >= min_stock) passes validation."""
    prod1 = ProductCreate(tenant_id=1, name="Test Product", min_stock=50, max_stock=100)
    assert prod1.min_stock == 50
    assert prod1.max_stock == 100

    prod2 = ProductCreate(tenant_id=1, name="Test Product", min_stock=100, max_stock=100)
    assert prod2.min_stock == 100
    assert prod2.max_stock == 100
