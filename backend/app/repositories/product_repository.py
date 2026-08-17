"""Product data access."""

import logging

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.exc import OperationalError, SQLAlchemyError

from app.models.product import Product
from app.repositories.base_repository import BaseRepository

logger = logging.getLogger(__name__)

logger = logging.getLogger(__name__)


class ProductRepository(BaseRepository):
    def list_all(self) -> list[Product]:
        try:
            return list(
                self.db.scalars(
                    select(Product)
                    .where(Product.tenant_id == self.tenant_id)
                    .order_by(Product.id.desc())
                ).all()
            )
        except (OperationalError, SQLAlchemyError) as exc:
            logger.exception("Database error listing products for tenant_id=%s: %s", self.tenant_id, exc)
            raise HTTPException(503, "Database connection unavailable") from exc
        except Exception as exc:
            logger.exception("Unexpected error listing products for tenant_id=%s: %s", self.tenant_id, exc)
            raise HTTPException(500, "Database operation failed") from exc

    def get_by_id(self, product_id: int) -> Product | None:
        try:
            return self.db.scalars(
                select(Product).where(
                    Product.id == product_id,
                    Product.tenant_id == self.tenant_id,
                )
            ).first()
        except (OperationalError, SQLAlchemyError) as exc:
            logger.exception("Database error getting product by id %s for tenant_id=%s: %s", product_id, self.tenant_id, exc)
            raise HTTPException(503, "Database connection unavailable") from exc
        except Exception as exc:
            logger.exception("Unexpected error getting product by id %s for tenant_id=%s: %s", product_id, self.tenant_id, exc)
            raise HTTPException(500, "Database operation failed") from exc

    def search(self, query: str, limit: int = 50) -> list[Product]:
        try:
            pattern = f"%{query.strip()}%"
            return list(
                self.db.scalars(
                    select(Product)
                    .where(
                        Product.tenant_id == self.tenant_id,
                        or_(
                            Product.name.ilike(pattern),
                            Product.sku.ilike(pattern),
                            Product.description.ilike(pattern),
                        ),
                    )
                    .limit(limit)
                ).all()
            )
        except (OperationalError, SQLAlchemyError) as exc:
            logger.exception("Database error searching products for tenant_id=%s query=%s: %s", self.tenant_id, query, exc)
            raise HTTPException(503, "Database connection unavailable") from exc
        except (AttributeError, TypeError, ValueError) as exc:
            logger.exception("Data validation error searching products for tenant_id=%s query=%s: %s", self.tenant_id, query, exc)
            raise HTTPException(400, "Invalid product search input") from exc
        except Exception as exc:
            logger.exception("Unexpected error searching products for tenant_id=%s query=%s: %s", self.tenant_id, query, exc)
            raise HTTPException(500, "Database operation failed") from exc
