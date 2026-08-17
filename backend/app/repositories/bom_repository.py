"""BOM data access."""

import logging
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.models.bom import BillOfMaterial
from app.models.product import Product
from app.repositories.base_repository import BaseRepository

logger = logging.getLogger(__name__)


class BomRepository(BaseRepository):
    def list_all(self) -> list[BillOfMaterial]:
        try:
            return list(
                self.db.scalars(
                    select(BillOfMaterial)
                    .where(BillOfMaterial.tenant_id == self.tenant_id)
                    .order_by(BillOfMaterial.id)
                ).all()
            )
        except SQLAlchemyError as exc:
            self.db.rollback()
            logger.exception("Database error fetching all BOMs for tenant_id=%s: %s", self.tenant_id, exc)
            raise HTTPException(503, "Database connection unavailable") from exc
        except Exception as exc:
            self.db.rollback()
            logger.exception("Unexpected error fetching all BOMs for tenant_id=%s: %s", self.tenant_id, exc)
            raise HTTPException(500, "Database operation failed") from exc

    def get_by_id(self, bom_id: int) -> BillOfMaterial | None:
        try:
            return self.db.scalars(
                select(BillOfMaterial).where(
                    BillOfMaterial.id == bom_id,
                    BillOfMaterial.tenant_id == self.tenant_id,
                )
            ).first()
        except SQLAlchemyError as exc:
            self.db.rollback()
            logger.exception("Database error fetching BOM bom_id=%s for tenant_id=%s: %s", bom_id, self.tenant_id, exc)
            raise HTTPException(503, "Database connection unavailable") from exc
        except Exception as exc:
            self.db.rollback()
            logger.exception("Unexpected error fetching BOM bom_id=%s for tenant_id=%s: %s", bom_id, self.tenant_id, exc)
            raise HTTPException(500, "Database operation failed") from exc

    def list_by_product(self, product_id: int) -> list[BillOfMaterial]:
        try:
            return list(
                self.db.scalars(
                    select(BillOfMaterial).where(
                        BillOfMaterial.tenant_id == self.tenant_id,
                        BillOfMaterial.product_id == product_id,
                    )
                ).all()
            )
        except SQLAlchemyError as exc:
            self.db.rollback()
            logger.exception("Database error fetching BOMs for product_id=%s, tenant_id=%s: %s", product_id, self.tenant_id, exc)
            raise HTTPException(503, "Database connection unavailable") from exc
        except Exception as exc:
            self.db.rollback()
            logger.exception("Unexpected error fetching BOMs for product_id=%s, tenant_id=%s: %s", product_id, self.tenant_id, exc)
            raise HTTPException(500, "Database operation failed") from exc

    def enrich_item(self, item: BillOfMaterial) -> dict:
        try:
            product = self.db.get(Product, item.product_id)
            component = self.db.get(Product, item.component_product_id)
            product_name = product.name if product else None
            product_sku = product.sku if product else None
            component_name = component.name if component else None
            component_sku = component.sku if component else None
            qty = float(item.quantity)
            unit_cost = float(component.unit_cost or 0) if component else 0.0
            return {
                "id": item.id,
                "product_id": item.product_id,
                "product_name": product_name,
                "product": product_name,
                "product_sku": product_sku,
                "component_product_id": item.component_product_id,
                "component_name": component_name,
                "component": component_name,
                "component_sku": component_sku,
                "quantity": qty,
                "unit": item.unit,
                "unit_cost": unit_cost,
                "total_cost": round(qty * unit_cost, 2),
            }
        except SQLAlchemyError as exc:
            self.db.rollback()
            logger.exception("Database error enriching BOM item_id=%s: %s", item.id, exc)
            raise HTTPException(503, "Database connection unavailable") from exc
        except (ValueError, TypeError) as exc:
            logger.exception("Data conversion error enriching BOM item_id=%s: %s", item.id, exc)
            raise HTTPException(400, "Invalid BOM item data") from exc
        except Exception as exc:
            logger.exception("Unexpected error enriching BOM item_id=%s: %s", item.id, exc)
            raise HTTPException(500, "Database operation failed") from exc
