"""Masters API — Products, BOM, Machines (sidebar: Masters section)."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.encoders import jsonable_encoder
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.api.deps import get_db
from app.models.user import User
from app.models.role import Role
from app.routers.operator_deps import deny_delete_for_operator, require_tenant
from app.schemas.machine import MachineCreateExtended, MachineFullUpdate
from app.schemas.product import BomItemCreate, ProductCreate, ProductUpdate
from app.schemas.vendor import VendorBulkImportRequest, VendorCreate, VendorUpdate
from app.schemas.production import MachineCreate, MachineStatusEventCreate, MachineUpdate
from app.services.machine_service import get_machine_summary
from app.services.masters_service import MastersService
from app.services.notification_management_service import NotificationManagementService
from app.services.production_service import (
    create_machine as _create_machine_svc,
    create_machine_status_event,
    list_machine_status_events,
    update_machine_status,
)
from app.utils.api_response import success_response

router = APIRouter(prefix="/api/masters", tags=["Masters API"])


def _svc(db: Session, tenant_id: int) -> MastersService:
    return MastersService(db, tenant_id)


def _dump(obj):
    if hasattr(obj, "model_dump"):
        return obj.model_dump(mode="json")
    if isinstance(obj, list):
        return [_dump(x) for x in obj]
    return jsonable_encoder(obj)


# ── Products ───────────────────────────────────────────────────────────────


@router.get("/products")
def list_products(user_tenant: tuple[User, int] = Depends(require_tenant("products")), db: Session = Depends(get_db)):
    _, tenant_id = user_tenant
    try:
        return success_response("Products retrieved", _svc(db, tenant_id).list_products())
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        logger.exception("Database error listing products for tenant_id=%s: %s", tenant_id, exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        logger.exception("Failed to list products for tenant_id=%s: %s", tenant_id, exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to list products") from exc


@router.get("/products/{product_id}")
def get_product(
    product_id: int,
    user_tenant: tuple[User, int] = Depends(require_tenant("products")),
    db: Session = Depends(get_db),
):
    _, tenant_id = user_tenant
    try:
        data = _svc(db, tenant_id).get_product(product_id)
        if not data:
            raise HTTPException(404, "Product not found")
        return success_response("Product retrieved", data)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        logger.exception("Database error getting product_id=%s for tenant_id=%s: %s", product_id, tenant_id, exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        logger.exception("Failed to get product_id=%s for tenant_id=%s: %s", product_id, tenant_id, exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve product") from exc


@router.post("/products")
def create_product(
    payload: ProductCreate,
    user_tenant: tuple[User, int] = Depends(require_tenant("products")),
    db: Session = Depends(get_db),
):
    _, tenant_id = user_tenant
    try:
        return success_response("Product created", _svc(db, tenant_id).create_product(payload))
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        logger.exception("Database error creating product for tenant_id=%s: %s", tenant_id, exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        logger.exception("Failed to create product for tenant_id=%s: %s", tenant_id, exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create product") from exc


@router.put("/products/{product_id}")
def update_product(
    product_id: int,
    payload: ProductUpdate,
    user_tenant: tuple[User, int] = Depends(require_tenant("products")),
    db: Session = Depends(get_db),
):
    _, tenant_id = user_tenant
    try:
        data = _svc(db, tenant_id).update_product(product_id, payload)
        if not data:
            raise HTTPException(404, "Product not found")
        return success_response("Product updated", data)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        logger.exception("Database error updating product_id=%s for tenant_id=%s: %s", product_id, tenant_id, exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        logger.exception("Failed to update product_id=%s for tenant_id=%s: %s", product_id, tenant_id, exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update product") from exc


@router.delete("/products/{product_id}")
def delete_product(
    product_id: int,
    user_tenant: tuple[User, int] = Depends(require_tenant("products")),
    _no_operator: User = Depends(deny_delete_for_operator),
    db: Session = Depends(get_db),
):
    _, tenant_id = user_tenant
    try:
        if not _svc(db, tenant_id).delete_product(product_id):
            raise HTTPException(404, "Product not found")
        return success_response("Product deleted", {"id": product_id})
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        logger.exception("Database error deleting product_id=%s for tenant_id=%s: %s", product_id, tenant_id, exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        logger.exception("Failed to delete product_id=%s for tenant_id=%s: %s", product_id, tenant_id, exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete product") from exc


# ── BOM ────────────────────────────────────────────────────────────────────


@router.get("/bom")
def list_bom(user_tenant: tuple[User, int] = Depends(require_tenant("bom")), db: Session = Depends(get_db)):
    _, tenant_id = user_tenant
    try:
        return success_response("BOM retrieved", _svc(db, tenant_id).list_all_bom())
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        logger.exception("Database error listing BOM for tenant_id=%s: %s", tenant_id, exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        logger.exception("Failed to list BOM for tenant_id=%s: %s", tenant_id, exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to list BOM") from exc


@router.get("/bom/product/{product_id}")
def bom_for_product(
    product_id: int,
    user_tenant: tuple[User, int] = Depends(require_tenant("bom")),
    db: Session = Depends(get_db),
):
    _, tenant_id = user_tenant
    try:
        return success_response("Product BOM retrieved", _svc(db, tenant_id).list_bom_for_product(product_id))
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        logger.exception("Database error listing BOM for product_id=%s, tenant_id=%s: %s", product_id, tenant_id, exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        logger.exception("Failed to list BOM for product_id=%s, tenant_id=%s: %s", product_id, tenant_id, exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve product BOM") from exc


@router.post("/bom")
def add_bom_line(
    payload: BomItemCreate,
    user_tenant: tuple[User, int] = Depends(require_tenant("bom")),
    db: Session = Depends(get_db),
):
    _, tenant_id = user_tenant
    try:
        return success_response("BOM line added", _svc(db, tenant_id).add_bom_line(payload))
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        logger.exception("Database error adding BOM line for tenant_id=%s: %s", tenant_id, exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        logger.exception("Failed to add BOM line for tenant_id=%s: %s", tenant_id, exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to add BOM line") from exc


@router.delete("/bom/{bom_id}")
def delete_bom_line(
    bom_id: int,
    user_tenant: tuple[User, int] = Depends(require_tenant("bom")),
    db: Session = Depends(get_db),
):
    _, tenant_id = user_tenant
    try:
        if not _svc(db, tenant_id).delete_bom_line(bom_id):
            raise HTTPException(404, "BOM line not found")
        return success_response("BOM line deleted", {"id": bom_id})
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        logger.exception("Database error deleting bom_id=%s for tenant_id=%s: %s", bom_id, tenant_id, exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        logger.exception("Failed to delete bom_id=%s for tenant_id=%s: %s", bom_id, tenant_id, exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete BOM line") from exc


# ── Machines ───────────────────────────────────────────────────────────────


@router.get("/machines")
def list_machines(user_tenant: tuple[User, int] = Depends(require_tenant("machines")), db: Session = Depends(get_db)):
    _, tenant_id = user_tenant
    try:
        return success_response("Machines retrieved", _svc(db, tenant_id).list_machines())
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load machines") from exc


@router.get("/machines/summary")
def machine_summary(user_tenant: tuple[User, int] = Depends(require_tenant("machines")), db: Session = Depends(get_db)):
    user, tenant_id = user_tenant
    try:
        return success_response("Machine summary retrieved", _dump(get_machine_summary(db, tenant_id, user=user)))
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load machine summary") from exc


@router.get("/machines/{machine_id}")
def get_machine(
    machine_id: int,
    user_tenant: tuple[User, int] = Depends(require_tenant("machines")),
    db: Session = Depends(get_db),
):
    _, tenant_id = user_tenant
    try:
        data = _svc(db, tenant_id).get_machine(machine_id)
        if not data:
            raise HTTPException(404, "Machine not found")
        return success_response("Machine retrieved", data)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load machine") from exc


@router.post("/machines")
def create_machine(
    payload: MachineCreateExtended,
    user_tenant: tuple[User, int] = Depends(require_tenant("machines")),
    db: Session = Depends(get_db),
):
    _, tenant_id = user_tenant
    try:
        return success_response("Machine created", _svc(db, tenant_id).create_machine(payload))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create machine") from exc


@router.put("/machines/{machine_id}")
def update_machine(
    machine_id: int,
    payload: MachineFullUpdate,
    user_tenant: tuple[User, int] = Depends(require_tenant("machines")),
    db: Session = Depends(get_db),
):
    _, tenant_id = user_tenant
    try:
        data = _svc(db, tenant_id).update_machine(machine_id, payload)
        if not data:
            raise HTTPException(404, "Machine not found")
        return success_response("Machine updated", data)
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update machine") from exc


@router.post("/machines/simple")
def create_machine_simple(
    payload: MachineCreate,
    user_tenant: tuple[User, int] = Depends(require_tenant("machines")),
    db: Session = Depends(get_db),
):
    _, tenant_id = user_tenant
    try:
        payload.tenant_id = tenant_id
        machine = _create_machine_svc(db, payload)
        return success_response("Machine created", _dump(machine))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create machine") from exc


@router.patch("/machines/{machine_id}/status")
def update_machine_status_endpoint(
    machine_id: int,
    payload: MachineUpdate,
    user_tenant: tuple[User, int] = Depends(require_tenant("machines")),
    db: Session = Depends(get_db),
):
    user, tenant_id = user_tenant
    try:
        machine = update_machine_status(db, machine_id, tenant_id, payload.status, user=user)
        if not machine:
            raise HTTPException(404, "Machine not found")

        # ── Notify Production Managers & Admins when machine is stopped (idle) ──
        idle_reason = payload.idle_reason
        if payload.status in ("idle", "stopped") and idle_reason:
            operator_name = user.full_name or user.email
            machine_name = machine.name or f"Machine #{machine_id}"
            title = f"⚠️ Machine Stopped — {machine_name}"
            message = (
                f"Operator {operator_name} stopped '{machine_name}' and reported:\n"
                f"Reason: {idle_reason}"
            )
            # Find all Production Managers and Admins in the same tenant (case-insensitive)
            from sqlalchemy import or_, func as sql_func
            stmt = (
                select(User)
                .join(User.roles)
                .where(
                    User.tenant_id == tenant_id,
                    User.is_active == True,
                    or_(
                        sql_func.lower(Role.name).contains("admin"),
                        sql_func.lower(Role.name).contains("production manager"),
                        sql_func.lower(Role.name).contains("production_manager"),
                    ),
                )
                .distinct()
            )
            recipients = list(db.scalars(stmt).all())
            for recipient in recipients:
                try:
                    NotificationManagementService.create_for_user(
                        db,
                        tenant_id=tenant_id,
                        user_id=recipient.id,
                        title=title,
                        message=message,
                        type="warning",
                        priority="high",
                        module="production",
                        action_url=f"/production/machines",
                        created_by=operator_name,
                        created_by_user_id=user.id,
                    )
                except Exception:
                    pass  # Never let notification failure block the status update

        return success_response("Machine status updated", _dump(machine))
    except HTTPException:
        raise
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error occurred while updating status for machine_id=%s: %s", machine_id, exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database error updating machine status") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Service error occurred while updating status for machine_id=%s: %s", machine_id, exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update machine status") from exc


# ── Machine Status Events ──────────────────────────────────────────────────


@router.post("/machine-status")
def create_machine_status_event_endpoint(
    payload: MachineStatusEventCreate,
    user_tenant: tuple[User, int] = Depends(require_tenant("machines")),
    db: Session = Depends(get_db),
):
    _, tenant_id = user_tenant
    try:
        payload.tenant_id = tenant_id
        event = create_machine_status_event(db, payload)
        return success_response("Machine status event created", _dump(event))
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        logger.exception("Database error creating machine status event for tenant_id=%s: %s", tenant_id, exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        logger.exception("Failed to create machine status event for tenant_id=%s: %s", tenant_id, exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create machine status event") from exc


@router.get("/machine-status")
def list_machine_status_events_endpoint(
    machine_id: int | None = Query(None),
    user_tenant: tuple[User, int] = Depends(require_tenant("machines")),
    db: Session = Depends(get_db),
):
    _, tenant_id = user_tenant
    try:
        return success_response(
            "Machine status events retrieved",
            _dump(list_machine_status_events(db, tenant_id, machine_id)),
        )
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        logger.exception("Database error listing machine status events for tenant_id=%s: %s", tenant_id, exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        logger.exception("Failed to list machine status events for tenant_id=%s: %s", tenant_id, exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve machine status events") from exc


# ── Vendors (Masters → Vendors page) ───────────────────────────────────────


def _actor_label(user: User) -> str:
    return (user.full_name or user.email or f"user-{user.id}").strip()


@router.get("/vendors")
def list_vendors(
    search: str | None = Query(None),
    user_tenant: tuple[User, int] = Depends(require_tenant("vendors")),
    db: Session = Depends(get_db),
):
    _, tenant_id = user_tenant
    try:
        return success_response("Vendors retrieved", _svc(db, tenant_id).list_vendors(search=search))
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        logger.exception("Database error listing vendors for tenant_id=%s: %s", tenant_id, exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        logger.exception("Failed to list vendors for tenant_id=%s: %s", tenant_id, exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to list vendors") from exc


@router.get("/vendors/{vendor_id}")
def get_vendor(
    vendor_id: int,
    user_tenant: tuple[User, int] = Depends(require_tenant("vendors")),
    db: Session = Depends(get_db),
):
    _, tenant_id = user_tenant
    try:
        data = _svc(db, tenant_id).get_vendor(vendor_id)
        if not data:
            raise HTTPException(404, "Vendor not found")
        return success_response("Vendor retrieved", data)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        logger.exception("Database error getting vendor_id=%s for tenant_id=%s: %s", vendor_id, tenant_id, exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        logger.exception("Failed to get vendor_id=%s for tenant_id=%s: %s", vendor_id, tenant_id, exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve vendor") from exc


@router.post("/vendors")
def create_vendor(
    payload: VendorCreate,
    user_tenant: tuple[User, int] = Depends(require_tenant("vendors")),
    db: Session = Depends(get_db),
):
    user, tenant_id = user_tenant
    try:
        if not payload.contact:
            payload.contact = payload.name
        data = _svc(db, tenant_id).create_vendor(payload, actor=_actor_label(user))
        return success_response("Vendor created", data)
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc) or "Failed to create vendor") from exc
    except SQLAlchemyError as exc:
        logger.exception("Database error creating vendor for tenant_id=%s: %s", tenant_id, exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        logger.exception("Failed to create vendor for tenant_id=%s: %s", tenant_id, exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create vendor") from exc


@router.put("/vendors/{vendor_id}")
def update_vendor(
    vendor_id: int,
    payload: VendorUpdate,
    user_tenant: tuple[User, int] = Depends(require_tenant("vendors")),
    db: Session = Depends(get_db),
):
    user, tenant_id = user_tenant
    try:
        data = _svc(db, tenant_id).update_vendor(
            vendor_id, payload, actor=_actor_label(user)
        )
        if not data:
            raise HTTPException(404, "Vendor not found")
        return success_response("Vendor updated", data)
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc) or "Failed to update vendor") from exc
    except SQLAlchemyError as exc:
        logger.exception("Database error updating vendor_id=%s for tenant_id=%s: %s", vendor_id, tenant_id, exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        logger.exception("Failed to update vendor_id=%s for tenant_id=%s: %s", vendor_id, tenant_id, exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update vendor") from exc


@router.delete("/vendors/{vendor_id}")
def delete_vendor(
    vendor_id: int,
    user_tenant: tuple[User, int] = Depends(require_tenant("vendors")),
    _no_operator: User = Depends(deny_delete_for_operator),
    db: Session = Depends(get_db),
):
    user, tenant_id = user_tenant
    try:
        if not _svc(db, tenant_id).delete_vendor(vendor_id, actor=_actor_label(user)):
            raise HTTPException(404, "Vendor not found")
        return success_response("Vendor deleted", {"id": vendor_id})
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        logger.exception("Database error deleting vendor_id=%s for tenant_id=%s: %s", vendor_id, tenant_id, exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        logger.exception("Failed to delete vendor_id=%s for tenant_id=%s: %s", vendor_id, tenant_id, exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete vendor") from exc


@router.post("/vendors/bulk-import")
def bulk_import_vendors(
    payload: VendorBulkImportRequest,
    user_tenant: tuple[User, int] = Depends(require_tenant("vendors")),
    db: Session = Depends(get_db),
):
    user, tenant_id = user_tenant
    try:
        result = _svc(db, tenant_id).bulk_import_vendors(
            payload.rows, actor=_actor_label(user)
        )
        return success_response("Vendor bulk import completed", result)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        logger.exception("Database error bulk importing vendors for tenant_id=%s: %s", tenant_id, exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        logger.exception("Failed to bulk import vendors for tenant_id=%s: %s", tenant_id, exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to import vendors") from exc
