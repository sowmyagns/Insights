import time
import uuid

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.openapi.docs import get_redoc_html
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import get_settings
from app.core.logging_config import get_logger, setup_logging

from app.api.accounts import router as accounts_router
from app.api.admin import router as admin_router
from app.api.ai_assistant import router as ai_assistant_router
from app.api.alerts import router as alerts_router
from app.api.analytics import router as analytics_router
from app.api.audit_logs import router as audit_logs_router
from app.api.auth import router as auth_router
from app.api.business_documents_api import router as business_documents_router
from app.api.audit_api import router as audit_api_router
from app.api.login_history import router as login_history_router
from app.api.platform_api import router as platform_router
from app.api.rbac_api import router as rbac_api_router
from app.middleware.audit_middleware import AuditMiddleware
from app.api.dispatch import router as dispatch_router
from app.api.dispatch_addresses_api import router as dispatch_addresses_router
from app.api.documents import router as documents_router
from app.api.factory_monitor import router as factory_monitor_router
from app.api.forecasting import router as forecasting_router
from app.api.hr import router as hr_router
from app.api.integration import router as integration_router
from app.api.inventory import router as inventory_router
from app.api.inventory_v2 import router as inventory_v2_router
from app.api.iot import router as iot_router
from app.api.maintenance import router as maintenance_router
from app.api.meetings import google_router as google_calendar_router
from app.api.meetings import router as meetings_router
from app.api.procurement import router as procurement_router
from app.api.production_scheduling import router as production_scheduling_router
from app.api.quality import router as quality_router
from app.api.sales import router as sales_router
from app.api.settings import router as company_settings_router
from app.api.supply_chain import router as supply_chain_router
from app.api.task_management import router as task_management_router
from app.api.warehouse import router as warehouse_router
from app.routers import (
    dashboard_api_router,
    masters_api_router,
    notifications_api_router,
    operator_api_router,
    production_api_router,
    settings_api_router,
)
from app.core.database import engine
from app.models.base import Base

# Import all models so they register with Base.metadata
from app.models import (  # noqa: F401
    accounts,
    ai_conversation,
    alert,
    bom,
    company_settings,
    department,
    document,
    erp_notification,
    hr,
    inventory,
    machine,
    maintenance,
    meeting,
    notification,
    permission,
    platform,
    procurement,
    production,
    product,
    quality,
    role,
    sales,
    security,
    task,
    tenant,
    user,
)

settings = get_settings()
setup_logging("INFO")
logger = get_logger("gns_insights")

# redoc_url=None — default FastAPI template points at redoc@next (404 on jsDelivr)
app = FastAPI(
    title="Insights Iva API",
    version="1.0.0",
    redoc_url=None,
    docs_url=None if settings.is_production else "/docs",
    openapi_url=None if settings.is_production else "/openapi.json",
)


@app.get("/redoc", include_in_schema=False)
async def redoc_ui() -> HTMLResponse:
    """ReDoc with a pinned CDN bundle (redoc@next is unpublished / 404)."""
    if settings.is_production:
        return JSONResponse(status_code=404, content={"detail": "Not found"})
    return get_redoc_html(
        openapi_url=app.openapi_url,
        title=f"{app.title} - ReDoc",
        redoc_js_url="https://cdn.jsdelivr.net/npm/redoc@2.1.5/bundles/redoc.standalone.js",
    )


if settings.is_production:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.allowed_host_list,
    )

app.add_middleware(AuditMiddleware)
_cors_kwargs = {
    "allow_origins": settings.cors_origin_list,
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
if not settings.is_production:
    _cors_kwargs["allow_origin_regex"] = r"https?://(localhost|127\.0\.0\.1)(:\d+)?$"
app.add_middleware(CORSMiddleware, **_cors_kwargs)


@app.middleware("http")
async def https_redirect_middleware(request: Request, call_next):
    """Redirect plain HTTP → HTTPS behind a reverse proxy in production."""
    if settings.is_production:
        proto = (request.headers.get("x-forwarded-proto") or request.url.scheme or "").lower()
        if proto == "http":
            https_url = request.url.replace(scheme="https")
            return RedirectResponse(str(https_url), status_code=301)
    return await call_next(request)


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Permissions-Policy"] = (
        "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
    )
    path = request.url.path or ""
    # Swagger / ReDoc only — ERP API routes keep the strict policy below
    if path.startswith(("/docs", "/redoc", "/openapi.json")):
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; "
            "img-src 'self' data: https://fastapi.tiangolo.com https://cdn.jsdelivr.net; "
            "font-src 'self' data: https://cdn.jsdelivr.net https://fonts.gstatic.com; "
            "connect-src 'self'; "
            "worker-src 'self' blob:; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
    else:
        # Strict CSP for all authenticated ERP / API responses
        response.headers["Content-Security-Policy"] = (
            "default-src 'none'; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains; preload"
        )
    return response


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    """Attach a request id, time the request, and log the outcome."""
    request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:12]
    request.state.request_id = request_id
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        elapsed = (time.perf_counter() - start) * 1000
        logger.exception(
            "request_failed id=%s %s %s (%.1fms)",
            request_id,
            request.method,
            request.url.path,
            elapsed,
        )
        raise
    elapsed = (time.perf_counter() - start) * 1000
    response.headers["X-Request-ID"] = request_id
    logger.info(
        "id=%s %s %s -> %s (%.1fms)",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        elapsed,
    )
    return response


from fastapi.encoders import jsonable_encoder


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    detail = jsonable_encoder(exc.detail)
    if request.url.path.startswith("/api/"):
        from app.utils.api_response import error_response

        return JSONResponse(
            status_code=exc.status_code,
            content=error_response(str(detail), errors=[str(detail)]),
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": detail, "request_id": getattr(request.state, "request_id", None)},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    raw_errors = jsonable_encoder(exc.errors())
    formatted_errors = []
    for e in raw_errors:
        loc_parts = [str(x) for x in e.get("loc", []) if str(x) not in ("body", "query", "path")]
        field = " -> ".join(loc_parts)
        msg = e.get("msg", "Invalid value")
        if field:
            formatted_errors.append(f"{field}: {msg}")
        else:
            formatted_errors.append(msg)

    first_detail = formatted_errors[0] if formatted_errors else "Validation error"

    if request.url.path.startswith("/api/"):
        from app.utils.api_response import error_response

        return JSONResponse(status_code=422, content=error_response(first_detail, errors=formatted_errors))
    return JSONResponse(
        status_code=422,
        content={
            "detail": first_detail,
            "errors": formatted_errors,
            "request_id": getattr(request.state, "request_id", None),
        },
    )


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.exception("database_error id=%s", getattr(request.state, "request_id", None))
    return JSONResponse(
        status_code=500,
        content={
            "detail": "A database error occurred.",
            "request_id": getattr(request.state, "request_id", None),
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("unhandled_error id=%s", getattr(request.state, "request_id", None))
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error.",
            "request_id": getattr(request.state, "request_id", None),
        },
    )


@app.get("/health", tags=["health"])
def health():
    if settings.is_production:
        return {"status": "ok"}
    return {"status": "ok", "environment": settings.environment}


@app.get("/health/db", tags=["health"])
def health_db():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok", "database": "reachable"}
    except SQLAlchemyError:
        return JSONResponse(status_code=503, content={"status": "error", "database": "unreachable"})


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    # Add phone column if missing (for existing DBs)
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(20)"))
    except Exception:
        pass  # Column may already exist
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE employees ADD COLUMN address TEXT"))
    except Exception:
        pass  # Column may already exist
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE gl_accounts ADD COLUMN meta TEXT"))
    except Exception:
        pass
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE products ADD COLUMN unit VARCHAR(32) DEFAULT 'Pcs'"))
    except Exception:
        pass  # Column may already exist
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE warehouses ADD COLUMN used_capacity INTEGER DEFAULT 0"))
    except Exception:
        pass  # Column may already exist
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE departments ADD COLUMN employee_count INTEGER DEFAULT 0"))
            conn.execute(text("ALTER TABLE departments ADD COLUMN machine_count INTEGER DEFAULT 0"))
            conn.execute(text("ALTER TABLE departments ADD COLUMN work_center_count INTEGER DEFAULT 0"))
    except Exception:
        pass  # Column may already exist
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE suppliers ADD COLUMN outstanding NUMERIC(12, 2) DEFAULT 0.0"))
    except Exception:
        pass  # Column may already exist
    _supplier_enterprise_columns = [
        "ALTER TABLE suppliers ADD COLUMN alternate_phone VARCHAR(64)",
        "ALTER TABLE suppliers ADD COLUMN alternate_email VARCHAR(255)",
        "ALTER TABLE suppliers ADD COLUMN business_type VARCHAR(64)",
        "ALTER TABLE suppliers ADD COLUMN gst_registration_type VARCHAR(64)",
        "ALTER TABLE suppliers ADD COLUMN address_line1 VARCHAR(255)",
        "ALTER TABLE suppliers ADD COLUMN address_line2 VARCHAR(255)",
        "ALTER TABLE suppliers ADD COLUMN landmark VARCHAR(255)",
        "ALTER TABLE suppliers ADD COLUMN account_holder_name VARCHAR(255)",
        "ALTER TABLE suppliers ADD COLUMN bank_branch VARCHAR(255)",
        "ALTER TABLE suppliers ADD COLUMN upi_id VARCHAR(128)",
        "ALTER TABLE suppliers ADD COLUMN currency VARCHAR(16) DEFAULT 'INR'",
        "ALTER TABLE suppliers ADD COLUMN credit_limit NUMERIC(14, 2)",
        "ALTER TABLE suppliers ADD COLUMN lead_time_days INTEGER",
        "ALTER TABLE suppliers ADD COLUMN minimum_order_quantity NUMERIC(12, 2)",
        "ALTER TABLE suppliers ADD COLUMN minimum_order_value NUMERIC(14, 2)",
        "ALTER TABLE suppliers ADD COLUMN preferred_vendor BOOLEAN DEFAULT 0",
        "ALTER TABLE suppliers ADD COLUMN on_time_delivery_percentage NUMERIC(5, 2)",
        "ALTER TABLE suppliers ADD COLUMN rejection_percentage NUMERIC(5, 2)",
        "ALTER TABLE suppliers ADD COLUMN onboarding_date DATE",
        "ALTER TABLE suppliers ADD COLUMN created_by VARCHAR(255)",
        "ALTER TABLE suppliers ADD COLUMN updated_by VARCHAR(255)",
        "ALTER TABLE suppliers ADD COLUMN is_deleted BOOLEAN DEFAULT 0",
        "ALTER TABLE suppliers ADD COLUMN deleted_at DATE",
    ]
    for ddl in _supplier_enterprise_columns:
        try:
            with engine.begin() as conn:
                conn.execute(text(ddl))
        except Exception:
            pass
    try:
        with engine.begin() as conn:
            conn.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS vendor_products (
                        id INTEGER NOT NULL PRIMARY KEY,
                        tenant_id INTEGER NOT NULL,
                        vendor_id INTEGER NOT NULL,
                        product_id INTEGER NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                        FOREIGN KEY(tenant_id) REFERENCES tenants (id),
                        FOREIGN KEY(vendor_id) REFERENCES suppliers (id),
                        FOREIGN KEY(product_id) REFERENCES products (id)
                    )
                    """
                )
            )
    except Exception:
        pass
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE inventory_items ADD COLUMN warehouse_name VARCHAR(128)"))
            conn.execute(text("ALTER TABLE inventory_items ADD COLUMN batch_number VARCHAR(128)"))
            conn.execute(text("ALTER TABLE inventory_items ADD COLUMN quantity INTEGER DEFAULT 0"))
            conn.execute(text("ALTER TABLE inventory_items ADD COLUMN reserved INTEGER DEFAULT 0"))
            conn.execute(text("ALTER TABLE inventory_items ADD COLUMN status VARCHAR(64) DEFAULT 'in_stock'"))
            conn.execute(text("ALTER TABLE inventory_items ADD COLUMN customer_name VARCHAR(255)"))
            conn.execute(text("ALTER TABLE inventory_items ADD COLUMN serial_number VARCHAR(128)"))
            conn.execute(text("ALTER TABLE inventory_items ADD COLUMN expiry_date VARCHAR(64)"))
            conn.execute(text("ALTER TABLE inventory_items ADD COLUMN production_date VARCHAR(64)"))
            conn.execute(text("ALTER TABLE inventory_items ADD COLUMN warranty VARCHAR(128)"))
    except Exception:
        pass  # Column may already exist
    try:
        with engine.begin() as conn:
            conn.execute(
                text(
                    "ALTER TABLE roles ADD COLUMN permissions JSON NOT NULL DEFAULT '[]'"
                )
            )
    except Exception:
        pass  # Column may already exist
    try:
        with engine.begin() as conn:
            conn.execute(text("UPDATE users SET email_verified = 1 WHERE email_verified = 0"))
    except Exception:
        pass
    _user_security_columns = [
        "ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT 0",
        "ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE users ADD COLUMN locked_until DATETIME",
        "ALTER TABLE users ADD COLUMN last_activity_at DATETIME",
    ]
    for ddl in _user_security_columns:
        try:
            with engine.begin() as conn:
                conn.execute(text(ddl))
        except Exception:
            pass
    _product_columns = [
        "ALTER TABLE products ADD COLUMN min_stock INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE products ADD COLUMN max_stock INTEGER NOT NULL DEFAULT 100",
        "ALTER TABLE products ADD COLUMN current_stock INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE products ADD COLUMN wholesale_price NUMERIC(12, 2)",
        "ALTER TABLE products ADD COLUMN hsn_code VARCHAR(32)",
        "ALTER TABLE products ADD COLUMN category VARCHAR(128)",
        "ALTER TABLE products ADD COLUMN gst_percent NUMERIC(5, 2) DEFAULT 0",
        "ALTER TABLE products ADD COLUMN cess_percent NUMERIC(5, 2) DEFAULT 0",
    ]
    for ddl in _product_columns:
        try:
            with engine.begin() as conn:
                conn.execute(text(ddl))
        except Exception:
            pass
    _customer_columns = [
        "ALTER TABLE customers ADD COLUMN customer_code VARCHAR(64)",
        "ALTER TABLE customers ADD COLUMN city VARCHAR(128)",
        "ALTER TABLE customers ADD COLUMN pincode VARCHAR(16)",
        "ALTER TABLE customers ADD COLUMN state VARCHAR(128)",
        "ALTER TABLE customers ADD COLUMN state_code VARCHAR(16)",
        "ALTER TABLE customers ADD COLUMN credit_limit NUMERIC(14, 2) DEFAULT 0",
        "ALTER TABLE customers ADD COLUMN outstanding NUMERIC(14, 2) DEFAULT 0",
        "ALTER TABLE customers ADD COLUMN status VARCHAR(32) DEFAULT 'active'",
    ]
    for ddl in _customer_columns:
        try:
            with engine.begin() as conn:
                conn.execute(text(ddl))
        except Exception:
            pass
    _access_log_columns = [
        "ALTER TABLE access_logs ADD COLUMN company_id INTEGER",
        "ALTER TABLE access_logs ADD COLUMN company_name VARCHAR(255)",
        "ALTER TABLE access_logs ADD COLUMN full_name VARCHAR(255)",
        "ALTER TABLE access_logs ADD COLUMN email VARCHAR(255)",
        "ALTER TABLE access_logs ADD COLUMN role VARCHAR(100)",
        "ALTER TABLE access_logs ADD COLUMN module_name VARCHAR(64)",
        "ALTER TABLE access_logs ADD COLUMN login_status VARCHAR(32)",
        "ALTER TABLE access_logs ADD COLUMN browser VARCHAR(128)",
        "ALTER TABLE access_logs ADD COLUMN operating_system VARCHAR(128)",
        "ALTER TABLE access_logs ADD COLUMN device_type VARCHAR(32)",
        "ALTER TABLE access_logs ADD COLUMN session_id VARCHAR(64)",
        "ALTER TABLE access_logs ADD COLUMN login_at DATETIME",
        "ALTER TABLE access_logs ADD COLUMN logout_at DATETIME",
        "ALTER TABLE access_logs ADD COLUMN details TEXT",
    ]
    for ddl in _access_log_columns:
        try:
            with engine.begin() as conn:
                conn.execute(text(ddl))
        except Exception:
            pass
    try:
        with engine.begin() as conn:
            conn.execute(text("UPDATE access_logs SET company_id = tenant_id WHERE company_id IS NULL"))
            conn.execute(
                text(
                    "UPDATE access_logs SET details = 'User logged in successfully.' "
                    "WHERE action = 'login' AND details = 'User logged out successfully.'"
                )
            )
            conn.execute(
                text(
                    "UPDATE access_logs SET login_status = 'Logged Out' "
                    "WHERE action = 'logout' AND (login_status = 'Success' OR login_status IS NULL)"
                )
            )
            conn.execute(
                text(
                    "UPDATE access_logs SET session_id = 'failed-sess-' || id "
                    "WHERE (action = 'login_failed' OR login_status = 'Failed') AND session_id IS NULL"
                )
            )
            conn.execute(
                text(
                    "UPDATE access_logs SET session_id = 'sess-' || id "
                    "WHERE session_id IS NULL"
                )
            )
            conn.execute(
                text(
                    "DELETE FROM access_logs "
                    "WHERE action = 'logout' AND session_id IS NOT NULL AND id NOT IN ("
                    "  SELECT min_id FROM ("
                    "    SELECT MIN(id) AS min_id FROM access_logs "
                    "    WHERE action = 'logout' AND session_id IS NOT NULL "
                    "    GROUP BY session_id"
                    "  ) AS t"
                    ")"
                )
            )
    except Exception:
        pass
    _production_columns = [
        "ALTER TABLE production_orders ADD COLUMN actual_quantity NUMERIC(12, 2)",
        "ALTER TABLE work_orders ADD COLUMN actual_quantity NUMERIC(12, 2)",
    ]
    for ddl in _production_columns:
        try:
            with engine.begin() as conn:
                conn.execute(text(ddl))
        except Exception:
            pass
    _rbac_columns = [
        "ALTER TABLE users ADD COLUMN plant_code VARCHAR(64)",
        "ALTER TABLE users ADD COLUMN department VARCHAR(128)",
        "ALTER TABLE users ADD COLUMN assigned_machine_id INTEGER REFERENCES machines(id)",
        "ALTER TABLE users ADD COLUMN tokens_revoked_at DATETIME",
        "ALTER TABLE work_orders ADD COLUMN assigned_user_id INTEGER REFERENCES users(id)",
        "ALTER TABLE work_orders ADD COLUMN plant_code VARCHAR(64)",
        "ALTER TABLE machines ADD COLUMN plant_code VARCHAR(64)",
        "ALTER TABLE machines ADD COLUMN machine_type VARCHAR(64)",
        "ALTER TABLE machines ADD COLUMN department VARCHAR(128)",
        "ALTER TABLE machines ADD COLUMN production_line VARCHAR(128)",
        "ALTER TABLE machines ADD COLUMN work_center VARCHAR(128)",
        "ALTER TABLE machines ADD COLUMN manufacturer VARCHAR(255)",
        "ALTER TABLE machines ADD COLUMN model_name VARCHAR(128)",
        "ALTER TABLE machines ADD COLUMN serial_number VARCHAR(128)",
        "ALTER TABLE machines ADD COLUMN purchase_date DATE",
        "ALTER TABLE machines ADD COLUMN warranty_until DATE",
        "ALTER TABLE machines ADD COLUMN assigned_operator VARCHAR(255)",
        "ALTER TABLE machines ADD COLUMN current_shift VARCHAR(64)",
        "ALTER TABLE machines ADD COLUMN health_score NUMERIC(5,2)",
        "ALTER TABLE machines ADD COLUMN efficiency_pct NUMERIC(5,2)",
        "ALTER TABLE machines ADD COLUMN oee_pct NUMERIC(5,2)",
        "ALTER TABLE machines ADD COLUMN temperature_c NUMERIC(6,2)",
        "ALTER TABLE machines ADD COLUMN rpm NUMERIC(8,2)",
        "ALTER TABLE machines ADD COLUMN last_maintenance_date DATE",
        "ALTER TABLE machines ADD COLUMN next_maintenance_date DATE",
        "ALTER TABLE machines ADD COLUMN current_work_order VARCHAR(128)",
        "ALTER TABLE machines ADD COLUMN todays_output INTEGER DEFAULT 0",
        "ALTER TABLE daily_production_reports ADD COLUMN created_by_user_id INTEGER REFERENCES users(id)",
    ]
    for ddl in _rbac_columns:
        try:
            with engine.begin() as conn:
                conn.execute(text(ddl))
        except Exception:
            pass
    _production_order_columns = [
        "ALTER TABLE production_orders ADD COLUMN customer_name VARCHAR(255)",
        "ALTER TABLE production_orders ADD COLUMN priority VARCHAR(16) NOT NULL DEFAULT 'medium'",
        "ALTER TABLE production_orders ADD COLUMN bom_version VARCHAR(64)",
        "ALTER TABLE production_orders ADD COLUMN sales_order_number VARCHAR(64)",
        "ALTER TABLE production_orders ADD COLUMN department VARCHAR(128)",
        "ALTER TABLE production_orders ADD COLUMN shift VARCHAR(64)",
        "ALTER TABLE work_orders ADD COLUMN priority VARCHAR(16) NOT NULL DEFAULT 'medium'",
        "ALTER TABLE work_orders ADD COLUMN shift VARCHAR(64)",
        "ALTER TABLE work_orders ADD COLUMN department VARCHAR(128)",
        "ALTER TABLE work_orders ADD COLUMN supervisor VARCHAR(255)",
        "ALTER TABLE work_orders ADD COLUMN materials_issued BOOLEAN NOT NULL DEFAULT 0",
        "ALTER TABLE production_orders ADD COLUMN sales_order_id INTEGER REFERENCES sales_orders(id)",
        "ALTER TABLE purchase_orders ADD COLUMN material_request_id INTEGER REFERENCES material_requests(id)",
        "ALTER TABLE tenants ADD COLUMN email VARCHAR(255)",
        "ALTER TABLE tenants ADD COLUMN phone VARCHAR(50)",
        "ALTER TABLE tenants ADD COLUMN address TEXT",
        "ALTER TABLE tenants ADD COLUMN subscription VARCHAR(50) DEFAULT 'trial'",
        "ALTER TABLE tenants ADD COLUMN trial_status BOOLEAN DEFAULT 1",
        "ALTER TABLE tenants ADD COLUMN company_code VARCHAR(32)",
        "ALTER TABLE tenants ADD COLUMN city VARCHAR(128)",
        "ALTER TABLE tenants ADD COLUMN state VARCHAR(128)",
        "ALTER TABLE tenants ADD COLUMN country VARCHAR(128)",
        "ALTER TABLE tenants ADD COLUMN pin_code VARCHAR(16)",
        "ALTER TABLE tenants ADD COLUMN gst_number VARCHAR(64)",
        "ALTER TABLE tenants ADD COLUMN status VARCHAR(32) DEFAULT 'active'",
        "ALTER TABLE tenants ADD COLUMN trial_days INTEGER DEFAULT 5",
        "ALTER TABLE tenants ADD COLUMN trial_expires_at DATETIME",
        "ALTER TABLE tenants ADD COLUMN license_status VARCHAR(32) DEFAULT 'active'",
        "ALTER TABLE users ADD COLUMN employee_id VARCHAR(64)",
        "ALTER TABLE users ADD COLUMN designation VARCHAR(128)",
        "ALTER TABLE users ADD COLUMN last_login_at DATETIME",
        "ALTER TABLE otp_challenges ADD COLUMN invalidated BOOLEAN DEFAULT 0",
        "ALTER TABLE otp_challenges ADD COLUMN purpose VARCHAR(32) DEFAULT 'super_admin_login'",
        "ALTER TABLE otp_challenges ADD COLUMN last_sent_at DATETIME",
        "ALTER TABLE alerts ADD COLUMN assigned_to VARCHAR(255)",
        "ALTER TABLE alerts ADD COLUMN acknowledged_by VARCHAR(255)",
        "ALTER TABLE alerts ADD COLUMN acknowledged_at DATETIME",
        "ALTER TABLE alerts ADD COLUMN reference_type VARCHAR(64)",
        "ALTER TABLE alerts ADD COLUMN reference_id INTEGER",
        "ALTER TABLE alerts ADD COLUMN module VARCHAR(64)",
        "ALTER TABLE alerts ADD COLUMN link VARCHAR(512)",
        "ALTER TABLE alerts ADD COLUMN target_role VARCHAR(255)",
        "ALTER TABLE alerts ADD COLUMN metadata_json TEXT",
        "ALTER TABLE alerts ADD COLUMN created_by VARCHAR(255)",
        "ALTER TABLE alerts ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT 0",
        "ALTER TABLE production_orders ADD COLUMN face_paper_mill_grade VARCHAR(128)",
        "ALTER TABLE production_orders ADD COLUMN face_paper_paper VARCHAR(128)",
        "ALTER TABLE production_orders ADD COLUMN face_paper_thick_microns VARCHAR(32)",
        "ALTER TABLE production_orders ADD COLUMN face_paper_gsm VARCHAR(32)",
        "ALTER TABLE production_orders ADD COLUMN coating_quality VARCHAR(64)",
        "ALTER TABLE production_orders ADD COLUMN coating_mill_grade VARCHAR(128)",
        "ALTER TABLE production_orders ADD COLUMN coating_cra_pct VARCHAR(32)",
        "ALTER TABLE production_orders ADD COLUMN coating_colour VARCHAR(64)",
        "ALTER TABLE production_orders ADD COLUMN coating_gsm VARCHAR(32)",
        "ALTER TABLE production_orders ADD COLUMN coating_width_mm VARCHAR(32)",
        "ALTER TABLE production_orders ADD COLUMN release_size_nos VARCHAR(32)",
        "ALTER TABLE production_orders ADD COLUMN release_stocks_nos VARCHAR(32)",
        "ALTER TABLE production_orders ADD COLUMN release_gsm_sqmtrs VARCHAR(32)",
    ]
    for ddl in _production_order_columns:
        try:
            with engine.begin() as conn:
                conn.execute(text(ddl))
        except Exception:
            pass
    _document_columns = [
        "ALTER TABLE documents ADD COLUMN file_name VARCHAR(255)",
        "ALTER TABLE documents ADD COLUMN file_size INTEGER DEFAULT 0",
        "ALTER TABLE documents ADD COLUMN reference_type VARCHAR(64)",
        "ALTER TABLE documents ADD COLUMN reference_id INTEGER",
        "ALTER TABLE documents ADD COLUMN department VARCHAR(128) DEFAULT 'Procurement'",
        "ALTER TABLE documents ADD COLUMN version VARCHAR(32) DEFAULT 'v1.0'",
        "ALTER TABLE documents ADD COLUMN description TEXT",
        "ALTER TABLE documents ADD COLUMN uploaded_by VARCHAR(255)",
        "ALTER TABLE production_orders ADD COLUMN machine_id INTEGER",
        "ALTER TABLE work_orders ADD COLUMN operator_name VARCHAR(255)",
    ]
    for ddl in _document_columns:
        try:
            with engine.begin() as conn:
                conn.execute(text(ddl))
        except Exception:
            pass
    _invoice_v2_columns = [
        "ALTER TABLE invoices ADD COLUMN invoice_prefix VARCHAR(32)",
        "ALTER TABLE invoices ADD COLUMN document_type VARCHAR(32) DEFAULT 'tax_invoice'",
        "ALTER TABLE invoices ADD COLUMN invoice_status VARCHAR(32) DEFAULT 'active'",
        "ALTER TABLE invoices ADD COLUMN e_invoice_status VARCHAR(32) DEFAULT 'all'",
        "ALTER TABLE invoices ADD COLUMN e_waybill_status VARCHAR(32) DEFAULT 'all'",
        "ALTER TABLE invoices ADD COLUMN export_invoice_status VARCHAR(32)",
        "ALTER TABLE invoices ADD COLUMN payment_status VARCHAR(32) DEFAULT 'unpaid'",
        "ALTER TABLE invoices ADD COLUMN other_charge NUMERIC(12, 2) DEFAULT 0",
        "ALTER TABLE invoices ADD COLUMN transport_mode VARCHAR(64)",
        "ALTER TABLE invoices ADD COLUMN lr_number VARCHAR(128)",
        "ALTER TABLE invoices ADD COLUMN lr_date DATE",
        "ALTER TABLE invoices ADD COLUMN vehicle_no VARCHAR(64)",
        "ALTER TABLE invoices ADD COLUMN distance_km NUMERIC(12, 2)",
        "ALTER TABLE invoices ADD COLUMN transporter_name VARCHAR(255)",
        "ALTER TABLE invoices ADD COLUMN place_of_supply VARCHAR(128)",
        "ALTER TABLE invoices ADD COLUMN date_of_supply DATE",
        "ALTER TABLE invoices ADD COLUMN supply_type VARCHAR(32)",
        "ALTER TABLE invoices ADD COLUMN po_number VARCHAR(128)",
        "ALTER TABLE invoices ADD COLUMN po_date DATE",
        "ALTER TABLE invoices ADD COLUMN challan_number VARCHAR(128)",
        "ALTER TABLE invoices ADD COLUMN ewaybill_number VARCHAR(128)",
        "ALTER TABLE invoices ADD COLUMN sales_person VARCHAR(255)",
        "ALTER TABLE invoices ADD COLUMN reverse_charge BOOLEAN DEFAULT 0",
        "ALTER TABLE invoices ADD COLUMN terms_and_conditions TEXT",
        "ALTER TABLE invoices ADD COLUMN show_signature BOOLEAN DEFAULT 0",
        "ALTER TABLE invoices ADD COLUMN bank_details_json TEXT",
        "ALTER TABLE invoices ADD COLUMN custom_fields_json TEXT",
        "ALTER TABLE invoices ADD COLUMN notes TEXT",
        "ALTER TABLE invoice_items ADD COLUMN hsn VARCHAR(32)",
        "ALTER TABLE invoice_items ADD COLUMN tax_type VARCHAR(32) DEFAULT 'Exclusive'",
        "ALTER TABLE invoice_items ADD COLUMN discount NUMERIC(12, 2) DEFAULT 0",
        "ALTER TABLE invoice_items ADD COLUMN discount_type VARCHAR(8) DEFAULT '₹'",
        "ALTER TABLE invoice_items ADD COLUMN taxable_value NUMERIC(12, 2) DEFAULT 0",
        "ALTER TABLE invoice_items ADD COLUMN gst_pct NUMERIC(5, 2) DEFAULT 0",
        "ALTER TABLE invoice_items ADD COLUMN gst_amount NUMERIC(12, 2) DEFAULT 0",
    ]
    for ddl in _invoice_v2_columns:
        try:
            with engine.begin() as conn:
                conn.execute(text(ddl))
        except Exception:
            pass
    _task_columns = [
        "ALTER TABLE tasks ADD COLUMN start_date DATE",
        "ALTER TABLE tasks ADD COLUMN assigned_to_name VARCHAR(255)",
        "ALTER TABLE tasks ADD COLUMN module VARCHAR(128)",
    ]
    for ddl in _task_columns:
        try:
            with engine.begin() as conn:
                conn.execute(text(ddl))
        except Exception:
            pass
    _company_settings_columns = [
        "ALTER TABLE company_settings ADD COLUMN landmark VARCHAR(255)",
        "ALTER TABLE company_settings ADD COLUMN country VARCHAR(128)",
        "ALTER TABLE company_settings ADD COLUMN mfa_enabled BOOLEAN DEFAULT 0",
        "ALTER TABLE company_settings ADD COLUMN mfa_email_otp BOOLEAN DEFAULT 1",
        "ALTER TABLE company_settings ADD COLUMN mfa_sms_otp BOOLEAN DEFAULT 0",
        "ALTER TABLE company_settings ADD COLUMN mfa_authenticator BOOLEAN DEFAULT 0",
        "ALTER TABLE company_settings ADD COLUMN logo_url TEXT",
        "ALTER TABLE company_settings ADD COLUMN custom_fields_json TEXT",
        "ALTER TABLE company_settings ADD COLUMN quotation_prefix VARCHAR(16)",
        "ALTER TABLE company_settings ADD COLUMN quotation_next_number INTEGER DEFAULT 1",
        "ALTER TABLE company_settings ADD COLUMN purchase_prefix VARCHAR(16)",
        "ALTER TABLE company_settings ADD COLUMN purchase_next_number INTEGER DEFAULT 1",
        "ALTER TABLE quotations ADD COLUMN meta_json TEXT",
    ]
    for ddl in _company_settings_columns:
        try:
            with engine.begin() as conn:
                conn.execute(text(ddl))
        except Exception:
            pass

    # Phase 3 integrity: unique indexes + stock FK indexes (idempotent)
    _integrity_ddl = [
        # Merge duplicate stock_levels onto highest id, then drop extras
        """
        UPDATE stock_levels
        SET quantity = (
            SELECT SUM(s2.quantity) FROM stock_levels s2
            WHERE s2.warehouse_id = stock_levels.warehouse_id
              AND s2.item_id = stock_levels.item_id
        )
        WHERE id IN (
            SELECT mid FROM (
                SELECT MAX(id) AS mid FROM stock_levels
                GROUP BY warehouse_id, item_id HAVING COUNT(*) > 1
            )
        )
        """,
        """
        DELETE FROM stock_levels
        WHERE id NOT IN (
            SELECT mid FROM (
                SELECT MAX(id) AS mid FROM stock_levels GROUP BY warehouse_id, item_id
            )
        )
        """,
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_levels_warehouse_item ON stock_levels (warehouse_id, item_id)",
        "CREATE INDEX IF NOT EXISTS ix_stock_levels_warehouse_id ON stock_levels (warehouse_id)",
        "CREATE INDEX IF NOT EXISTS ix_stock_levels_item_id ON stock_levels (item_id)",
        "CREATE INDEX IF NOT EXISTS ix_stock_movements_warehouse_id ON stock_movements (warehouse_id)",
        "CREATE INDEX IF NOT EXISTS ix_stock_movements_item_id ON stock_movements (item_id)",
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_tenant_invoice_number ON invoices (tenant_id, invoice_number)",
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_quotations_tenant_quote_number ON quotations (tenant_id, quote_number)",
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_business_documents_tenant_type_number ON business_documents (tenant_id, doc_type, document_number)",
    ]
    for ddl in _integrity_ddl:
        try:
            with engine.begin() as conn:
                conn.execute(text(ddl))
        except Exception:
            pass

    try:
        with engine.begin() as conn:
            conn.execute(text("UPDATE users SET email_verified = 1 WHERE email_verified = 0"))
    except Exception:
        pass
    from app.core.database import SessionLocal
    from app.core.seed_dashboard import seed_dashboard_data
    from app.core.seed_notifications import seed_notifications
    from app.core.seed_products import seed_products
    from app.core.seed_roles import seed_roles
    from app.core.seed_super_admin import seed_super_admin
    from app.core.seed_tenant import seed_tenant
    from app.core.seed_users import seed_admin_user
    from app.core.seed_finance import seed_finance_data

    from app.models.tenant import Tenant as TenantModel

    from sqlalchemy import select as sa_select, func

    db = SessionLocal()
    try:
        seed_tenant(db)  # Ensure tenant 1 exists
        seed_super_admin(db)  # GNS Super Admin from .env
        # Seed default RBAC roles for every tenant (adds new roles like Sales Manager)
        from sqlalchemy import select

        from app.models.tenant import Tenant

        tenant_ids = list(db.scalars(select(Tenant.id)).all()) or [1]
        for tid in tenant_ids:
            seed_roles(db, tenant_id=tid)
        seed_admin_user(db)  # Seeds default demo accounts (Operator, Admin, HR)

        # Seed finance data for every tenant that has no invoices yet
        from app.models.sales import Invoice as InvoiceModel

        all_tenants = db.scalars(sa_select(TenantModel)).all()
        for t in all_tenants:
            inv_count = db.scalar(sa_select(func.count(InvoiceModel.id)).where(InvoiceModel.tenant_id == t.id))
            if not inv_count:
                seed_finance_data(db, tenant_id=t.id)
    except Exception:
        logger.exception("Seed warning during startup")
    finally:
        db.close()


app.include_router(settings_api_router)
app.include_router(notifications_api_router)
app.include_router(operator_api_router)
app.include_router(dashboard_api_router)
app.include_router(masters_api_router)
app.include_router(production_api_router)
app.include_router(ai_assistant_router)
app.include_router(auth_router)
app.include_router(auth_router, prefix="/api")
app.include_router(login_history_router)
app.include_router(login_history_router, prefix="/api")
app.include_router(audit_api_router, prefix="/api")
app.include_router(platform_router)
app.include_router(rbac_api_router)
# /api aliases for auth RBAC catalog (users, roles, permissions, sidebar, profile)
app.include_router(rbac_api_router, prefix="/api")

# ERP domain modules (Sales, Finance, Procurement, Quality, Maintenance, Analytics, HR, Inventory)
app.include_router(sales_router)
app.include_router(business_documents_router)
app.include_router(accounts_router)
app.include_router(procurement_router)
app.include_router(quality_router)
app.include_router(maintenance_router)
app.include_router(analytics_router)
app.include_router(hr_router)
app.include_router(inventory_router)
app.include_router(inventory_v2_router)
app.include_router(alerts_router)
app.include_router(alerts_router, prefix="/api")
app.include_router(admin_router)
app.include_router(company_settings_router)
app.include_router(documents_router)
app.include_router(documents_router, prefix="/api")
app.include_router(dispatch_router)
app.include_router(dispatch_addresses_router)
app.include_router(factory_monitor_router)
app.include_router(forecasting_router)
app.include_router(integration_router)
app.include_router(meetings_router)
app.include_router(google_calendar_router)
app.include_router(iot_router)
app.include_router(production_scheduling_router)
app.include_router(task_management_router)
app.include_router(task_management_router, prefix="/api")
app.include_router(audit_logs_router)
app.include_router(warehouse_router)
app.include_router(supply_chain_router)
from app.api.system_data import router as system_data_router
app.include_router(system_data_router, prefix="/api")