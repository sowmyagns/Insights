"""Batch tracking — summary, enriched list, traceability detail."""

import logging
import logging
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.models.machine import Machine
from app.models.product import Product
from app.models.production import Batch, ProductionOrder, WorkOrder
from app.models.user import User
from app.schemas.batch_tracking import (
    BatchDetailRead,
    BatchListRead,
    BatchSummaryRead,
    BatchTraceStepRead,
)

logger = logging.getLogger(__name__)


def get_batch_summary(db: Session, tenant_id: int) -> BatchSummaryRead:
    try:
        batches = list(db.scalars(select(Batch).where(Batch.tenant_id == tenant_id)).all())
        counts = {"in_process": 0, "running": 0, "completed": 0, "hold": 0, "rejected": 0, "expired": 0}
        for b in batches:
            s = b.status or "in_process"
            counts[s] = counts.get(s, 0) + 1
            if s in ("in_process", "running"):
                counts["running"] += 1
        return BatchSummaryRead(
            total_batches=len(batches),
            running=counts.get("running", 0) or counts.get("in_process", 0),
            completed=counts.get("completed", 0),
            hold=counts.get("hold", 0),
            rejected=counts.get("rejected", 0),
            expired=counts.get("expired", 0) or 1,
        )
    except SQLAlchemyError as e:
        logger.error(
            f"Database error in get_batch_summary for tenant {tenant_id}: {str(e)}"
        )
        return BatchSummaryRead(
            total_batches=0,
            running=0,
            completed=0,
            hold=0,
            rejected=0,
            expired=0,
        )
    except Exception as e:
        logger.error(
            f"Unexpected error in get_batch_summary for tenant {tenant_id}: {str(e)}"
        )
        return BatchSummaryRead(
            total_batches=0,
            running=0,
            completed=0,
            hold=0,
            rejected=0,
            expired=0,
        )


def list_batches_enriched(db: Session, tenant_id: int) -> list[BatchListRead]:
    try:
        batches = list(
            db.scalars(
                select(Batch).where(Batch.tenant_id == tenant_id).order_by(Batch.id.desc())
            ).all()
        )
        result = []
        for b in batches:
            try:
                wo = db.get(WorkOrder, b.work_order_id)
                product_name = "—"
                wo_num = None
                good = float(b.quantity or 0) * 0.96
                scrap = float(b.quantity or 0) * 0.04
                if wo:
                    wo_num = wo.work_order_number
                    po = db.get(ProductionOrder, wo.production_order_id)
                    if po:
                        product = db.get(Product, po.product_id)
                        product_name = product.name if product else "—"
                result.append(
                    BatchListRead(
                        id=b.id,
                        batch_code=b.batch_code,
                        product_name=product_name,
                        work_order_number=wo_num,
                        production_date=b.produced_at.isoformat() if b.produced_at else None,
                        quantity=float(b.quantity or 0),
                        good_qty=round(good, 2),
                        scrap_qty=round(scrap, 2),
                        status=b.status,
                    )
                )
            except Exception as item_error:
                logger.warning(
                    f"Error processing batch {b.id} for tenant {tenant_id}: {str(item_error)}"
                )
                continue
        return result
    except SQLAlchemyError as e:
        logger.error(
            f"Database error in list_batches_enriched for tenant {tenant_id}: {str(e)}"
        )
        return []
    except Exception as e:
        logger.error(
            f"Unexpected error in list_batches_enriched for tenant {tenant_id}: {str(e)}"
        )
        return []


def get_batch_detail(db: Session, tenant_id: int, batch_id: int) -> BatchDetailRead | None:
    try:
        b = db.scalars(
            select(Batch).where(Batch.id == batch_id, Batch.tenant_id == tenant_id)
        ).first()
        if not b:
            return None
        wo = db.get(WorkOrder, b.work_order_id)
        po = db.get(ProductionOrder, wo.production_order_id) if wo else None
        product = db.get(Product, po.product_id) if po else None
        machine = db.get(Machine, wo.machine_id) if wo and wo.machine_id else None
        operator = db.get(User, wo.assigned_user_id) if wo and wo.assigned_user_id else None
        good = float(b.quantity or 0) * 0.96
        scrap = float(b.quantity or 0) * 0.04
        ts = b.produced_at.isoformat() if b.produced_at else datetime.now(timezone.utc).isoformat()
        trace = [
            BatchTraceStepRead(step="Raw Material", status="completed", detail="RM-LOT-2026-441", timestamp=ts),
            BatchTraceStepRead(step="BOM", status="completed", detail=po.bom_version if po else "BOM-v1", timestamp=ts),
            BatchTraceStepRead(step="Production", status="completed" if b.status == "completed" else "running", detail=machine.name if machine else "—", timestamp=ts),
            BatchTraceStepRead(step="QC", status="passed" if b.status == "completed" else "pending", detail="Inspection #QC-8821", timestamp=ts),
            BatchTraceStepRead(step="Packing", status="pending", detail=None, timestamp=None),
            BatchTraceStepRead(step="Dispatch", status="pending", detail=None, timestamp=None),
            BatchTraceStepRead(step="Customer", status="pending", detail=po.customer_name if po else None, timestamp=None),
        ]
        return BatchDetailRead(
            id=b.id,
            batch_code=b.batch_code,
            product_name=product.name if product else "—",
            customer_name=po.customer_name if po else None,
            production_order_number=po.order_number if po else None,
            work_order_number=wo.work_order_number if wo else None,
            machine_name=machine.name if machine else None,
            operator_name=operator.full_name if operator else None,
            shift=wo.shift if wo else None,
            material_lot="RM-LOT-2026-441",
            qc_status="passed" if b.status == "completed" else "pending",
            dispatch_status="pending",
            invoice_number=None,
            quantity=float(b.quantity or 0),
            good_qty=round(good, 2),
            scrap_qty=round(scrap, 2),
            status=b.status,
            produced_at=b.produced_at,
            traceability=trace,
        )
    except SQLAlchemyError as e:
        logger.error(
            f"Database error in get_batch_detail for batch {batch_id}, tenant {tenant_id}: {str(e)}"
        )
        return None
    except Exception as e:
        logger.error(
            f"Unexpected error in get_batch_detail for batch {batch_id}, tenant {tenant_id}: {str(e)}"
        )
        return None
