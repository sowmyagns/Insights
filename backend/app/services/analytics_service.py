import logging
import logging
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.models.inventory import InventoryItem, StockLevel, StockMovement
from app.models.machine import Machine
from app.models.production import DailyProductionReport
from app.models.user import User


def get_monthly_production_trend(
    db: Session, tenant_id: int, year: int, user: User | None = None
) -> list[dict]:
    """Monthly production volumes (sum of produced_quantity)."""
    try:
        from app.core.permissions import get_role_names, user_is_admin

        months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        stmt = (
            select(
                func.extract("month", DailyProductionReport.report_date).label("m"),
                func.coalesce(func.sum(DailyProductionReport.produced_quantity), 0),
            )
            .where(DailyProductionReport.tenant_id == tenant_id)
            .where(func.extract("year", DailyProductionReport.report_date) == year)
        )
        if user and not user_is_admin(user) and "Operator" in get_role_names(user):
            stmt = stmt.where(DailyProductionReport.created_by_user_id == user.id)

        stmt = stmt.group_by(func.extract("month", DailyProductionReport.report_date))
        rows = {int(r[0]): float(r[1] or 0) for r in db.execute(stmt).all()}
        return [
            {"month": months[i], "value": rows.get(i + 1, 0), "monthNum": i + 1}
            for i in range(12)
        ]
    except SQLAlchemyError as e:
        logger.error(
            f"Database error in get_monthly_production_trend for tenant {tenant_id}, year {year}: {str(e)}"
        )
        return []
    except Exception as e:
        logger.error(
            f"Unexpected error in get_monthly_production_trend for tenant {tenant_id}, year {year}: {str(e)}"
        )
        return []


def get_machine_efficiency(db: Session, tenant_id: int) -> dict:
    """Machine efficiency: running/(total) * 100, plus per-machine from daily reports."""
    try:
        machines = list(
            db.scalars(
                select(Machine).where(
                    Machine.tenant_id == tenant_id, Machine.is_active == True
                )
            ).all()
        )
        total = len(machines)
        running = sum(1 for m in machines if m.status == "running")
        idle = sum(1 for m in machines if m.status == "idle")
        down = sum(1 for m in machines if m.status == "down")
    try:
        machines = list(
            db.scalars(
                select(Machine).where(
                    Machine.tenant_id == tenant_id, Machine.is_active == True
                )
            ).all()
        )
        total = len(machines)
        running = sum(1 for m in machines if m.status == "running")
        idle = sum(1 for m in machines if m.status == "idle")
        down = sum(1 for m in machines if m.status == "down")

        # Per-machine efficiency from daily reports (produced/planned when planned > 0)
        stmt = (
            select(
                DailyProductionReport.machine_id,
                func.coalesce(func.sum(DailyProductionReport.produced_quantity), 0),
                func.coalesce(func.sum(DailyProductionReport.planned_quantity), 0),
                func.coalesce(func.sum(DailyProductionReport.downtime_minutes), 0),
            )
            .where(DailyProductionReport.tenant_id == tenant_id)
            .where(DailyProductionReport.machine_id.isnot(None))
            .where(
                DailyProductionReport.report_date
                >= date.today() - timedelta(days=30)
            )
            .group_by(DailyProductionReport.machine_id)
        )
        machine_eff = []
        for row in db.execute(stmt).all():
            mid, produced, planned, downtime = row
            if planned and float(planned) > 0:
                eff = min(100, round(float(produced) / float(planned) * 100, 1))
            else:
                # Use downtime: assume 8h/day = 480 min, efficiency = 100 - (downtime/480)*100
                eff = max(0, 100 - round(float(downtime or 0) / 480 * 100, 1))
            machine_eff.append({"machine_id": mid, "efficiency": eff})
        # Per-machine efficiency from daily reports (produced/planned when planned > 0)
        stmt = (
            select(
                DailyProductionReport.machine_id,
                func.coalesce(func.sum(DailyProductionReport.produced_quantity), 0),
                func.coalesce(func.sum(DailyProductionReport.planned_quantity), 0),
                func.coalesce(func.sum(DailyProductionReport.downtime_minutes), 0),
            )
            .where(DailyProductionReport.tenant_id == tenant_id)
            .where(DailyProductionReport.machine_id.isnot(None))
            .where(
                DailyProductionReport.report_date
                >= date.today() - timedelta(days=30)
            )
            .group_by(DailyProductionReport.machine_id)
        )
        machine_eff = []
        for row in db.execute(stmt).all():
            mid, produced, planned, downtime = row
            if planned and float(planned) > 0:
                eff = min(100, round(float(produced) / float(planned) * 100, 1))
            else:
                # Use downtime: assume 8h/day = 480 min, efficiency = 100 - (downtime/480)*100
                eff = max(0, 100 - round(float(downtime or 0) / 480 * 100, 1))
            machine_eff.append({"machine_id": mid, "efficiency": eff})

        overall_pct = round(running / total * 100, 1) if total else 0
        # Blend: availability from status + output efficiency
        if machine_eff:
            avg_eff = sum(m["efficiency"] for m in machine_eff) / len(machine_eff)
            overall_pct = round((overall_pct + avg_eff) / 2, 1)
        overall_pct = round(running / total * 100, 1) if total else 0
        # Blend: availability from status + output efficiency
        if machine_eff:
            avg_eff = sum(m["efficiency"] for m in machine_eff) / len(machine_eff)
            overall_pct = round((overall_pct + avg_eff) / 2, 1)

        return {
            "overall_percent": overall_pct,
            "total_machines": total,
            "running": running,
            "idle": idle,
            "down": down,
            "by_machine": machine_eff,
        }
    except SQLAlchemyError as e:
        logger.error(
            f"Database error in get_machine_efficiency for tenant {tenant_id}: {str(e)}"
        )
        return {
            "overall_percent": 0,
            "total_machines": 0,
            "running": 0,
            "idle": 0,
            "down": 0,
            "by_machine": [],
        }
    except Exception as e:
        logger.error(
            f"Unexpected error in get_machine_efficiency for tenant {tenant_id}: {str(e)}"
        )
        return {
            "overall_percent": 0,
            "total_machines": 0,
            "running": 0,
            "idle": 0,
            "down": 0,
            "by_machine": [],
        }


def get_inventory_turnover_rate(db: Session, tenant_id: int) -> dict:
    """Inventory turnover: (out movements / avg stock) over last 12 months."""
    try:
        cutoff = date.today() - timedelta(days=365)
    try:
        cutoff = date.today() - timedelta(days=365)

        # Total "out" movements - join via item to filter by tenant
        out_stmt = (
            select(func.coalesce(func.sum(StockMovement.quantity), 0))
            .join(InventoryItem, StockMovement.item_id == InventoryItem.id)
            .where(InventoryItem.tenant_id == tenant_id)
            .where(StockMovement.movement_type == "out")
        )
        total_out = float(db.execute(out_stmt).scalar() or 0)

        # Average inventory: sum of stock_levels.quantity for tenant's items
        avg_stmt = (
            select(
                func.coalesce(func.sum(StockLevel.quantity), 0),
                func.count(StockLevel.id),
            )
            .join(InventoryItem, StockLevel.item_id == InventoryItem.id)
            .where(InventoryItem.tenant_id == tenant_id)
        )
        avg_row = db.execute(avg_stmt).first()
        total_stock = float(avg_row[0] or 0)
        count = avg_row[1] or 1
        avg_inv = total_stock / count if count else 0
        # Average inventory: sum of stock_levels.quantity for tenant's items
        avg_stmt = (
            select(
                func.coalesce(func.sum(StockLevel.quantity), 0),
                func.count(StockLevel.id),
            )
            .join(InventoryItem, StockLevel.item_id == InventoryItem.id)
            .where(InventoryItem.tenant_id == tenant_id)
        )
        avg_row = db.execute(avg_stmt).first()
        total_stock = float(avg_row[0] or 0)
        count = avg_row[1] or 1
        avg_inv = total_stock / count if count else 0

        # Turnover = COGS/AvgInv or simplified: out / avg_inv
        if avg_inv > 0:
            rate = round(total_out / avg_inv, 1)
        else:
            rate = 0.0  # no stock data — return 0 so frontend shows empty state
        # Turnover = COGS/AvgInv or simplified: out / avg_inv
        if avg_inv > 0:
            rate = round(total_out / avg_inv, 1)
        else:
            rate = 0.0  # no stock data — return 0 so frontend shows empty state

        return {
            "rate": rate,
            "total_out_movements": total_out,
            "average_inventory": round(avg_inv, 2),
        }
    except SQLAlchemyError as e:
        logger.error(
            f"Database error in get_inventory_turnover_rate for tenant {tenant_id}: {str(e)}"
        )
        return {
            "rate": 0.0,
            "total_out_movements": 0,
            "average_inventory": 0.0,
        }
    except Exception as e:
        logger.error(
            f"Unexpected error in get_inventory_turnover_rate for tenant {tenant_id}: {str(e)}"
        )
        return {
            "rate": 0.0,
            "total_out_movements": 0,
            "average_inventory": 0.0,
        }


def get_worker_performance_score(db: Session, tenant_id: int) -> dict:
    """Worker performance metrics (employee module removed)."""
    return {
        "average_score": 0.0,
        "reviews_count": 0,
        "top_performer_ids": [],
        "active_employees": 0,
    }


def get_profit_analysis(db: Session, tenant_id: int, year: int) -> dict:
    """Profit analysis: revenue vs cost, margins by month."""
    try:
        from app.services.accounts_service import get_profit_loss

        pl = get_profit_loss(db, tenant_id, year)
        months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        month_keys = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
        monthly_rev = [0.0] * 12
        monthly_exp = [0.0] * 12
        for r in pl.get("revenue", []):
            for i, k in enumerate(month_keys):
                monthly_rev[i] += r.get(k, 0) or 0
        for r in pl.get("expenses", []):
            for i, k in enumerate(month_keys):
                monthly_exp[i] += r.get(k, 0) or 0
        monthly = []
        total_revenue = 0.0
        total_expense = 0.0
        for i in range(12):
            rev = monthly_rev[i]
            exp = monthly_exp[i]
            profit = rev - exp
            margin = (profit / rev * 100) if rev else 0
            monthly.append({
                "month": months[i],
                "monthNum": i + 1,
                "revenue": round(rev, 2),
                "expense": round(exp, 2),
                "profit": round(profit, 2),
                "margin_percent": round(margin, 1),
            })
            total_revenue += rev
            total_expense += exp
        total_profit = total_revenue - total_expense
        overall_margin = (total_profit / total_revenue * 100) if total_revenue else 0
        return {
            "year": year,
            "monthly": monthly,
            "total_revenue": round(total_revenue, 2),
            "total_expense": round(total_expense, 2),
            "total_profit": round(total_profit, 2),
            "overall_margin_percent": round(overall_margin, 1),
        }
    except SQLAlchemyError as e:
        logger.error(
            f"Database error in get_profit_analysis for tenant {tenant_id}, year {year}: {str(e)}"
        )
        return {
            "year": year,
            "monthly": [],
            "total_revenue": 0.0,
            "total_expense": 0.0,
            "total_profit": 0.0,
            "overall_margin_percent": 0.0,
        }
    except Exception as e:
        logger.error(
            f"Unexpected error in get_profit_analysis for tenant {tenant_id}, year {year}: {str(e)}"
        )
        return {
            "year": year,
            "monthly": [],
            "total_revenue": 0.0,
            "total_expense": 0.0,
            "total_profit": 0.0,
            "overall_margin_percent": 0.0,
        }
