import pytest
from pydantic import ValidationError
from app.schemas.store_workflow import PurchaseRequisitionFromLowStock


class TestPurchaseRequisitionFromLowStockValidation:
    """recommended_qty must be None or an integer > 0."""

    @pytest.mark.parametrize("qty", [0, -1, -10, -500])
    def test_zero_and_negative_recommended_qty_rejected(self, qty):
        with pytest.raises(ValidationError, match="greater than zero"):
            PurchaseRequisitionFromLowStock(item_id=1, recommended_qty=qty)

    def test_none_recommended_qty_accepted(self):
        req = PurchaseRequisitionFromLowStock(item_id=1, recommended_qty=None)
        assert req.recommended_qty is None

    @pytest.mark.parametrize("qty", [1, 10, 100, 5000])
    def test_positive_recommended_qty_accepted(self, qty):
        req = PurchaseRequisitionFromLowStock(item_id=1, recommended_qty=qty)
        assert req.recommended_qty == qty

    def test_invalid_type_recommended_qty_rejected(self):
        with pytest.raises(ValidationError, match="must be an integer value"):
            PurchaseRequisitionFromLowStock(item_id=1, recommended_qty="invalid")
