from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.permissions import require_permission, tenant_scope
from app.models.user import User
from app.schemas.maintenance import (
    BreakdownReportCreate,
    BreakdownReportRead,
    MaintenanceRecordCreate,
    MaintenanceRecordRead,
    MaintenanceScheduleCreate,
    MaintenanceScheduleRead,
    PreventiveMaintenanceCreate,
    PreventiveMaintenanceRead,
)
from app.services.maintenance_service import (
    create_breakdown_report,
    create_maintenance_record,
    create_maintenance_schedule,
    create_preventive_maintenance,
    list_breakdown_reports,
    list_maintenance_records,
    list_maintenance_schedules,
    list_preventive_maintenance,
    update_breakdown_status,
)
from app.services.maintenance_extended_service import (
    get_breakdown_summary,
    get_maintenance_hub,
    get_preventive_summary,
    list_breakdowns_enriched,
    list_machine_history,
    list_preventive_enriched,
)

router = APIRouter(prefix="/maintenance", tags=["maintenance"])

MODULE = "maintenance"


@router.post("/records", response_model=MaintenanceRecordRead)
def create_maintenance_record_endpoint(
    payload: MaintenanceRecordCreate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
) -> MaintenanceRecordRead:
    payload.tenant_id = user.tenant_id
    try:
        return create_maintenance_record(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create maintenance record") from exc


@router.get("/records", response_model=list[MaintenanceRecordRead])
def list_maintenance_records_endpoint(
    tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)
) -> list[MaintenanceRecordRead]:
    try:
        return list_maintenance_records(db, tenant_id)
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load maintenance records") from exc


@router.post("/preventive", response_model=PreventiveMaintenanceRead)
def create_preventive_endpoint(
    payload: PreventiveMaintenanceCreate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
) -> PreventiveMaintenanceRead:
    payload.tenant_id = user.tenant_id
    try:
        return create_preventive_maintenance(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create preventive maintenance") from exc


@router.get("/preventive", response_model=list[PreventiveMaintenanceRead])
def list_preventive_endpoint(
    tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)
) -> list[PreventiveMaintenanceRead]:
    try:
        return list_preventive_maintenance(db, tenant_id)
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load preventive maintenance") from exc


@router.post("/breakdowns", response_model=BreakdownReportRead)
def create_breakdown_endpoint(
    payload: BreakdownReportCreate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
) -> BreakdownReportRead:
    payload.tenant_id = user.tenant_id
    try:
        return create_breakdown_report(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create breakdown report") from exc


@router.get("/breakdowns", response_model=list[BreakdownReportRead])
def list_breakdowns_endpoint(
    tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)
) -> list[BreakdownReportRead]:
    try:
        return list_breakdown_reports(db, tenant_id)
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load breakdown reports") from exc


@router.patch("/breakdowns/{breakdown_id}/status", response_model=BreakdownReportRead)
def update_breakdown_status_endpoint(
    breakdown_id: int,
    new_status: str = Query(..., alias="status", description="e.g. reported, in_progress, resolved"),
    tenant_id: int = Depends(tenant_scope(MODULE)),
    db: Session = Depends(get_db),
) -> BreakdownReportRead:
    try:
        br = update_breakdown_status(db, tenant_id, breakdown_id, new_status)
        if not br:
            raise HTTPException(404, "Breakdown report not found")
        return br
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update breakdown status") from exc


@router.post("/schedule", response_model=MaintenanceScheduleRead)
def create_schedule_endpoint(
    payload: MaintenanceScheduleCreate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
) -> MaintenanceScheduleRead:
    payload.tenant_id = user.tenant_id
    try:
        return create_maintenance_schedule(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create maintenance schedule") from exc


@router.get("/schedule", response_model=list[MaintenanceScheduleRead])
def list_schedule_endpoint(
    tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)
) -> list[MaintenanceScheduleRead]:
    try:
        return list_maintenance_schedules(db, tenant_id)
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unavailable") from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load maintenance schedules") from exc


@router.get("/hub")
def maintenance_hub_endpoint(
    tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)
):
    return get_maintenance_hub(db, tenant_id)


@router.get("/preventive/summary")
def preventive_summary_endpoint(
    tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)
):
    return get_preventive_summary(db, tenant_id)


@router.get("/preventive/enriched")
def preventive_enriched_endpoint(
    tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)
):
    return list_preventive_enriched(db, tenant_id)


@router.get("/breakdowns/summary")
def breakdown_summary_endpoint(
    tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)
):
    return get_breakdown_summary(db, tenant_id)


@router.get("/breakdowns/enriched")
def breakdowns_enriched_endpoint(
    tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)
):
    return list_breakdowns_enriched(db, tenant_id)


@router.get("/history")
def machine_history_endpoint(
    tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)
):
    return list_machine_history(db, tenant_id)
