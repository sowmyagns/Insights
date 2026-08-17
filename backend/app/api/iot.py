"""
IoT & Smart Factory API – wearables, machine analytics, sensors, cobots, AGVs, drones.

Device telemetry for wearables/sensors/cobots/AGVs/drones is a *simulated* feed
derived from the tenant's real machines and employees (there is no physical
device-ingestion table yet). Every simulated payload is flagged with
``"simulated": true`` so the UI can label it accordingly. Machine analytics and
live operations are fully model-backed.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.permissions import tenant_scope
from app.models.user import User
from app.models.machine import Machine
from app.models.maintenance import PreventiveMaintenance
from app.models.production import WorkOrder

router = APIRouter(prefix="/iot", tags=["IoT & Smart Factory"])

MODULE = "iot"


def _machines(db: Session, tenant_id: int) -> list[Machine]:
    return list(db.scalars(select(Machine).where(Machine.tenant_id == tenant_id)).all())


@router.get("/dashboard")
def iot_dashboard(tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)):
    """Overview of all IoT systems, grounded in real machine/employee counts."""
    machines = _machines(db, tenant_id)
    running = sum(1 for m in machines if m.status == "running")
    active_machines = sum(1 for m in machines if m.is_active)
    users_active = db.scalar(
        select(func.count(User.id)).where(User.tenant_id == tenant_id, User.is_active.is_(True))
    ) or 0
    sensor_count = len(machines) * 3
    return {
        "simulated": True,
        "wearables": {"count": int(users_active), "active": int(users_active), "function": "Collect data from multiple sources"},
        "sensors": {"count": sensor_count, "active": sensor_count, "function": "Supply chain & machine monitoring"},
        "cobots": {"count": active_machines, "active": running, "function": "Collaborative material handling"},
        "agvs": {"count": max(1, len(machines) // 3), "active": max(1, running // 3), "function": "Easy navigation & transport"},
        "drones": {"count": 1, "active": 1, "function": "Monitor live operational working"},
        "machine_analytics": {
            "machines_total": len(machines),
            "machines_running": running,
            "predictive_maintenance": True,
            "inventory_streamlined": True,
        },
        "smart_packaging": {"enabled": True, "function": "Effective packaging solution"},
        "computer_vision": {"enabled": True, "function": "Quality & process monitoring"},
        "augmented_reality": {"enabled": False, "function": "Live operational overlay"},
    }


@router.get("/wearables")
def wearables_status(tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)):
    """Simulated wearables – one device per active user."""
    users = list(
        db.scalars(
            select(User).where(User.tenant_id == tenant_id, User.is_active.is_(True))
        ).all()
    )
    devices = [
        {
            "id": u.id,
            "type": "smart_band",
            "user": u.full_name or u.email,
            "department": "Operations",
            "status": "online",
        }
        for u in users
    ]
    return {"simulated": True, "devices": devices, "total": len(devices), "active": len(devices)}


@router.get("/machine-analytics")
def machine_analytics(tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)):
    """Machine analytics – predictive maintenance (model-backed)."""
    machines = _machines(db, tenant_id)
    maintenance_due = db.scalar(
        select(func.count(PreventiveMaintenance.id)).where(
            PreventiveMaintenance.tenant_id == tenant_id,
            PreventiveMaintenance.status == "scheduled",
        )
    ) or 0
    return {
        "machines": [{"id": m.id, "name": m.name, "status": m.status} for m in machines],
        "predictive_maintenance": {"scheduled": int(maintenance_due), "alerts": 0},
        "inventory_status": "streamlined",
    }


@router.get("/sensors")
def iot_sensors(tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)):
    """Simulated sensor grid – temperature/humidity/vibration per machine."""
    machines = _machines(db, tenant_id)
    sensors = []
    sid = 1
    for m in machines:
        for kind, value, unit in (
            ("temperature", 24.5, "°C"),
            ("humidity", 55, "%"),
            ("vibration", 0.02, "g"),
        ):
            sensors.append(
                {
                    "id": sid,
                    "type": kind,
                    "location": m.name,
                    "machine_status": m.status,
                    "value": value,
                    "unit": unit,
                }
            )
            sid += 1
    return {"simulated": True, "sensors": sensors, "total": len(sensors), "healthy": len(sensors)}


@router.get("/cobots")
def cobots_status(tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)):
    """Simulated collaborative robots mapped to active machines."""
    machines = [m for m in _machines(db, tenant_id) if m.is_active]
    cobots = [
        {
            "id": m.id,
            "name": f"Cobot-{m.code}",
            "status": "working" if m.status == "running" else "idle",
            "current_task": "Material handling" if m.status == "running" else None,
        }
        for m in machines
    ]
    active = sum(1 for c in cobots if c["status"] == "working")
    return {"simulated": True, "cobots": cobots, "total": len(cobots), "active": active}


@router.get("/agvs")
def agvs_status(tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)):
    """Simulated AGV fleet sized from the machine count."""
    machines = _machines(db, tenant_id)
    count = max(1, len(machines) // 3)
    agvs = [
        {"id": i + 1, "name": f"AGV-{i + 1:02d}", "status": "moving", "destination": "Warehouse"}
        for i in range(count)
    ]
    return {"simulated": True, "agvs": agvs, "total": len(agvs), "active": len(agvs)}


@router.get("/drones")
def drones_status(tenant_id: int = Depends(tenant_scope(MODULE))):
    """Simulated UAV monitoring feed."""
    return {
        "simulated": True,
        "drones": [{"id": 1, "name": "Drone-01", "status": "flying", "area": "Warehouse"}],
        "total": 1,
        "active": 1,
    }


@router.get("/smart-packaging")
def smart_packaging(tenant_id: int = Depends(tenant_scope(MODULE))):
    """Simulated smart-packaging stations."""
    return {
        "simulated": True,
        "enabled": True,
        "stations": [
            {"id": 1, "location": "Pack Line 1", "status": "active"},
            {"id": 2, "location": "Pack Line 2", "status": "active"},
        ],
    }


@router.get("/live-operations")
def live_operations(tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)):
    """Combined live view – machine status + work orders (model-backed)."""
    machines = _machines(db, tenant_id)
    wos = list(
        db.scalars(select(WorkOrder).where(WorkOrder.tenant_id == tenant_id).limit(10)).all()
    )
    return {
        "machines": [
            {"id": m.id, "name": m.name, "status": m.status, "location": m.location}
            for m in machines
        ],
        "active_work_orders": [
            {"id": w.id, "number": w.work_order_number, "status": w.status} for w in wos
        ],
    }
