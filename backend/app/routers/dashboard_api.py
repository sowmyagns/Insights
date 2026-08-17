"""Main ERP Dashboard API — sidebar Dashboard item."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.user import User
from app.routers.operator_deps import require_tenant
from app.services.dashboard_service import get_erp_dashboard
from app.utils.api_response import success_response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/erp", tags=["ERP Dashboard API"])


@router.get("/dashboard")
def erp_dashboard(
    user_tenant: tuple[User, int] = Depends(require_tenant("dashboard")),
    db: Session = Depends(get_db),
):
    user, tenant_id = user_tenant
    try:
        return success_response("ERP dashboard retrieved", get_erp_dashboard(db, tenant_id, user=user))
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error retrieving ERP dashboard for user_id=%s, tenant_id=%s: %s", user.id, tenant_id, exc)
        raise HTTPException(status_code=503, detail="Database connection unavailable") from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to retrieve ERP dashboard for user_id=%s, tenant_id=%s: %s", user.id, tenant_id, exc)
        raise HTTPException(status_code=500, detail="Failed to retrieve ERP dashboard") from exc
