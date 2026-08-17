"""Machine allocation — assign work orders to machines, operators, shifts."""

import logging
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.models.machine import Machine
from app.models.product import Product
from app.models.production import ProductionOrder, WorkOrder
from app.models.user import User
from app.schemas.allocation import (
    AllocationAssignRequest,
    AllocationRowRead,
    AllocationSummaryRead,
    MachineAvailabilityRead,
)

logger = logging.getLogger(__name__)

ALLOCATED_STATUSES = ("planned", "released", "material_ready", "machine_ready", "running", "in_progress")


def get_allocation_summary(db: Session, tenant_id: int) -> AllocationSummaryRead:
    """Retrieve allocation summary (total, allocated, free, maintenance machines).
    
    Returns safe defaults on database error.
    """
    try:
        machines = list(db.scalars(select(Machine).where(Machine.tenant_id == tenant_id)).all())
        total = len(machines)
        maintenance = sum(1 for m in machines if m.status in ("maintenance", "breakdown"))
        allocated_ids = set()
        for m in machines:
            has = db.scalar(
                select(func.count(WorkOrder.id)).where(
                    WorkOrder.machine_id == m.id,
                    WorkOrder.tenant_id == tenant_id,
                    WorkOrder.status.in_(ALLOCATED_STATUSES),
                )
            )
            if has:
                allocated_ids.add(m.id)
        allocated = len(allocated_ids)
        free = total - allocated - maintenance
        util = round(allocated / total * 100, 1) if total else 0
        return AllocationSummaryRead(
            total_machines=total,
            allocated=allocated,
            free_machines=max(free, 0),
            under_maintenance=maintenance,
            utilization_pct=util,
        )
    except SQLAlchemyError as e:
        logger.error(f"Database error retrieving allocation summary for tenant {tenant_id}: {str(e)}")
        return AllocationSummaryRead(
            total_machines=0,
            allocated=0,
            free_machines=0,
            under_maintenance=0,
            utilization_pct=0,
        )
    except Exception as e:
        logger.error(f"Unexpected error retrieving allocation summary for tenant {tenant_id}: {str(e)}")
        return AllocationSummaryRead(
            total_machines=0,
            allocated=0,
            free_machines=0,
            under_maintenance=0,
            utilization_pct=0,
        )


def get_allocation_list(db: Session, tenant_id: int) -> list[AllocationRowRead]:
    """Retrieve allocation list with work orders and related machine/product data.
    
    Wraps database operations in try-except. Returns empty list on failure.
    """
    try:
        wos = list(
            db.scalars(
                select(WorkOrder)
                .where(WorkOrder.tenant_id == tenant_id)
                .order_by(WorkOrder.id.desc())
                .limit(30)
            ).all()
        )
        rows = []
        for wo in wos:
            try:
                po = db.get(ProductionOrder, wo.production_order_id)
                product = db.get(Product, po.product_id) if po else None
                machine = db.get(Machine, wo.machine_id) if wo.machine_id else None
                user = db.get(User, wo.assigned_user_id) if wo.assigned_user_id else None
                op_name = wo.operator_name or (user.full_name if user else None) or (machine.assigned_operator if machine else None)
                shift_name = wo.shift or (machine.current_shift if machine else None)
                planned = float(wo.planned_quantity or 0)
                actual = float(wo.actual_quantity or 0)
                cap = round(actual / planned * 100, 1) if planned else 0
                status = "unassigned" if not wo.machine_id else wo.status
                rows.append(
                    AllocationRowRead(
                        work_order_id=wo.id,
                        work_order_number=wo.work_order_number,
                        product_name=product.name if product else "—",
                        machine_id=wo.machine_id,
                        machine_name=machine.name if machine else None,
                        operator_name=op_name,
                        shift=shift_name,
                        supervisor=wo.supervisor,
                        capacity_pct=cap,
                        status=status,
                        priority=wo.priority or "medium",
                    )
                )
            except Exception as e:
                logger.error(f"Error processing work order {wo.id} for allocation list: {str(e)}")
                continue
        return rows
    except SQLAlchemyError as e:
        logger.error(f"Database error retrieving allocation list for tenant {tenant_id}: {str(e)}")
        return []
    except Exception as e:
        logger.error(f"Unexpected error retrieving allocation list for tenant {tenant_id}: {str(e)}")
        return []


def get_machine_availability(db: Session, tenant_id: int) -> list[MachineAvailabilityRead]:
    """Retrieve machine availability and current job assignments.
    
    Wraps database operations in try-except. Returns empty list on failure.
    """
    try:
        machines = list(
            db.scalars(select(Machine).where(Machine.tenant_id == tenant_id).order_by(Machine.code)).all()
        )
        result = []
        for m in machines:
            try:
                wo = db.scalars(
                    select(WorkOrder)
                    .where(WorkOrder.machine_id == m.id, WorkOrder.tenant_id == tenant_id)
                    .order_by(WorkOrder.id.desc())
                ).first()
                util = 90 if m.status == "running" else 60 if wo else 20 if m.status == "idle" else 0
                result.append(
                    MachineAvailabilityRead(
                        machine_id=m.id,
                        machine_name=m.name,
                        status=m.status,
                        free_time="14:00" if m.status == "idle" else None,
                        current_job=wo.work_order_number if wo else None,
                        utilization_pct=util,
                    )
                )
            except Exception as e:
                logger.error(f"Error processing machine {m.id} for availability: {str(e)}")
                continue
        return result
    except SQLAlchemyError as e:
        logger.error(f"Database error retrieving machine availability for tenant {tenant_id}: {str(e)}")
        return []
    except Exception as e:
        logger.error(f"Unexpected error retrieving machine availability for tenant {tenant_id}: {str(e)}")
        return []


def assign_allocation(db: Session, tenant_id: int, payload: AllocationAssignRequest) -> dict:
    """Assign a work order to a machine with operator and shift details.
    
    Returns {"success": False, "message": "error message"} on failure.
    Wraps database queries and commit in try-except with rollback support.
    """
    try:
        wo = db.scalars(
            select(WorkOrder).where(WorkOrder.id == payload.work_order_id, WorkOrder.tenant_id == tenant_id)
        ).first()
        if not wo:
            return {"success": False, "message": "Work order not found"}
        machine = db.scalars(
            select(Machine).where(Machine.id == payload.machine_id, Machine.tenant_id == tenant_id)
        ).first()
        if not machine:
            return {"success": False, "message": "Machine not found"}
        if machine.status in ("maintenance", "breakdown"):
            return {"success": False, "message": "Machine under maintenance"}
        
        try:
            wo.machine_id = payload.machine_id
            if payload.operator_name:
                wo.operator_name = payload.operator_name
                machine.assigned_operator = payload.operator_name
            if payload.shift:
                wo.shift = payload.shift
                machine.current_shift = payload.shift
            if payload.supervisor:
                wo.supervisor = payload.supervisor
            if wo.status == "released":
                wo.status = "machine_ready"
            db.commit()
        except SQLAlchemyError as e:
            logger.error(f"Database error updating work order {payload.work_order_id} and machine {payload.machine_id}: {str(e)}")
            db.rollback()
            return {"success": False, "message": "Database error occurred during allocation"}
        except Exception as e:
            logger.error(f"Unexpected error updating work order {payload.work_order_id}: {str(e)}")
            db.rollback()
            return {"success": False, "message": "Unexpected error during allocation"}
        
        return {
            "success": True,
            "message": f"Assigned to {machine.name}",
            "work_order_id": wo.id,
            "machine_name": machine.name,
        }
    except SQLAlchemyError as e:
        logger.error(f"Database error in assign_allocation for tenant {tenant_id}: {str(e)}")
        db.rollback()
        return {"success": False, "message": "Database error occurred"}
    except Exception as e:
        logger.error(f"Unexpected error in assign_allocation for tenant {tenant_id}: {str(e)}")
        db.rollback()
        return {"success": False, "message": "Unexpected error occurred"}
