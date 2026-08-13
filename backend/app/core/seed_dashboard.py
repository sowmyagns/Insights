"""Seed base infrastructure (warehouses, machines) only — no fake operational data."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.tenant import Tenant
from app.models.machine import Machine
from app.models.inventory import Warehouse


def seed_dashboard_data(db: Session, tenant_id: int = 1):
    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        return

    warehouses_data = [
        {"code": "WH-MAIN", "name": "Main Store", "is_primary": True},
        {"code": "WH-PROD", "name": "Production Store", "is_primary": False},
        {"code": "WH-FG", "name": "FG Warehouse", "is_primary": False},
        {"code": "WH-OTH", "name": "Others Warehouse", "is_primary": False},
    ]
    for w_info in warehouses_data:
        exists = db.scalars(
            select(Warehouse).where(Warehouse.tenant_id == tenant_id, Warehouse.code == w_info["code"])
        ).first()
        if not exists:
            db.add(Warehouse(
                tenant_id=tenant_id,
                code=w_info["code"],
                name=w_info["name"],
                is_primary=w_info["is_primary"],
                status="active",
            ))

    # Real shop-floor machines only (idempotent by code or name per tenant).
    # Does not delete existing DB records; only inserts when missing.
    machines_data = [
        {
            "code": "JANDU-01",
            "name": "Jandu 1",
            "machine_type": "CNC",
            "department": "Machining",
            "production_line": "Line A",
            "work_center": "WC-01",
            "location": "Plant 1",
        },
        {
            "code": "JANDU-02",
            "name": "Jandu 2",
            "machine_type": "CNC",
            "department": "Machining",
            "production_line": "Line A",
            "work_center": "WC-01",
            "location": "Plant 1",
        },
        {
            "code": "JANDU-03",
            "name": "Jandu 3",
            "machine_type": "CNC",
            "department": "Machining",
            "production_line": "Line A",
            "work_center": "WC-01",
            "location": "Plant 1",
        },
        {
            "code": "JUNDU-04",
            "name": "Jundu 4",
            "machine_type": "CNC",
            "department": "Machining",
            "production_line": "Line A",
            "work_center": "WC-01",
            "location": "Plant 1",
        },
    ]
    for m_info in machines_data:
        exists = db.scalars(
            select(Machine).where(
                Machine.tenant_id == tenant_id,
                (Machine.code == m_info["code"]) | (Machine.name == m_info["name"]),
            )
        ).first()
        if not exists:
            db.add(
                Machine(
                    tenant_id=tenant_id,
                    code=m_info["code"],
                    name=m_info["name"],
                    status="idle",
                    is_active=True,
                    plant_code="plant-1",
                    machine_type=m_info.get("machine_type"),
                    department=m_info.get("department"),
                    production_line=m_info.get("production_line"),
                    work_center=m_info.get("work_center"),
                    location=m_info.get("location"),
                    health_score=85,
                    efficiency_pct=0,
                )
            )

    db.commit()


if __name__ == "__main__":
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        seed_dashboard_data(db)
    finally:
        db.close()
