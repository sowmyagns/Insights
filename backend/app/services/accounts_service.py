import logging
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.sql_compat import column_matches_year_month
from app.models.accounts import Expense, Income
from app.models.sales import Invoice, Payment
from app.schemas.accounts import ExpenseCreate, IncomeCreate

logger = logging.getLogger(__name__)


def create_income(db: Session, payload: IncomeCreate) -> Income:
    try:
        obj = Income(**payload.model_dump())
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error creating income: %s", exc)
        raise
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to create income: %s", exc)
        raise


def list_incomes(db: Session, tenant_id: int, year: int | None = None) -> list[Income]:
    try:
        stmt = select(Income).where(Income.tenant_id == tenant_id)
        if year:
            stmt = stmt.where(func.extract("year", Income.income_date) == year)
        stmt = stmt.order_by(Income.income_date.desc())
        return list(db.scalars(stmt).all())
    except SQLAlchemyError as exc:
        logger.exception("Database error retrieving incomes: %s", exc)
        return []
    except Exception as exc:
        logger.exception("Failed to retrieve incomes: %s", exc)
        return []


def create_expense(db: Session, payload: ExpenseCreate) -> Expense:
    try:
        obj = Expense(**payload.model_dump())
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error creating expense: %s", exc)
        raise
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to create expense: %s", exc)
        raise


def get_expense(db: Session, tenant_id: int, expense_id: int) -> Expense | None:
    try:
        return db.scalars(
            select(Expense).where(Expense.id == expense_id, Expense.tenant_id == tenant_id)
        ).first()
    except SQLAlchemyError as exc:
        logger.exception("Database error retrieving expense_id=%s: %s", expense_id, exc)
        return None
    except Exception as exc:
        logger.exception("Failed to retrieve expense_id=%s: %s", expense_id, exc)
        return None


def update_expense(db: Session, tenant_id: int, expense_id: int, data: dict) -> Expense | None:
    try:
        obj = get_expense(db, tenant_id, expense_id)
        if not obj:
            return None
        for key, value in data.items():
            if value is not None:
                setattr(obj, key, value)
        db.commit()
        db.refresh(obj)
        return obj
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error updating expense_id=%s: %s", expense_id, exc)
        raise
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to update expense_id=%s: %s", expense_id, exc)
        raise


def delete_expense(db: Session, tenant_id: int, expense_id: int) -> bool:
    try:
        obj = get_expense(db, tenant_id, expense_id)
        if not obj:
            return False
        db.delete(obj)
        db.commit()
        return True
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error deleting expense_id=%s: %s", expense_id, exc)
        return False
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to delete expense_id=%s: %s", expense_id, exc)
        return False


def list_expenses(db: Session, tenant_id: int, year: int | None = None) -> list[Expense]:
    try:
        stmt = select(Expense).where(Expense.tenant_id == tenant_id)
        if year:
            stmt = stmt.where(func.extract("year", Expense.expense_date) == year)
        stmt = stmt.order_by(Expense.expense_date.desc())
        return list(db.scalars(stmt).all())
    except SQLAlchemyError as exc:
        logger.exception("Database error retrieving expenses: %s", exc)
        return []
    except Exception as exc:
        logger.exception("Failed to retrieve expenses: %s", exc)
        return []


def get_profit_loss(
    db: Session,
    tenant_id: int,
    year: int,
    ytd_through_month: int = 12,
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict:
    _default = {
        "year": year,
        "months": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        "revenue": [], "expenses": [], "total_revenue": 0, "total_expenses": 0, "profit": 0,
    }
    try:
        from app.models.sales import Customer
        months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        month_keys = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
        rev_by_cat: dict = {}
        exp_by_cat: dict = {}

        inv_stmt = (
            select(Customer.name, func.extract("month", Invoice.issue_date).label("m"), func.sum(Invoice.grand_total))
            .join(Invoice, Invoice.customer_id == Customer.id)
            .where(Invoice.tenant_id == tenant_id, Invoice.status != "draft")
        )
        if start_date and end_date:
            inv_stmt = inv_stmt.where(Invoice.issue_date >= start_date, Invoice.issue_date <= end_date)
        else:
            inv_stmt = inv_stmt.where(func.extract("year", Invoice.issue_date) == year)
        inv_stmt = inv_stmt.group_by(Customer.name, func.extract("month", Invoice.issue_date))
        for row in db.execute(inv_stmt).all():
            cat = row[0] or "Other"
            m = int(row[1]) if row[1] else 0
            amt = float(row[2] or 0)
            rev_by_cat.setdefault(cat, {i: 0 for i in range(1, 13)})[m] = amt

        inc_stmt = (
            select(Income.category, Income.source, func.extract("month", Income.income_date).label("m"), func.sum(Income.amount))
            .where(Income.tenant_id == tenant_id)
        )
        if start_date and end_date:
            inc_stmt = inc_stmt.where(Income.income_date >= start_date, Income.income_date <= end_date)
        else:
            inc_stmt = inc_stmt.where(func.extract("year", Income.income_date) == year)
        inc_stmt = inc_stmt.group_by(Income.category, Income.source, func.extract("month", Income.income_date))
        for row in db.execute(inc_stmt).all():
            cat = row[0] or "Other"
            src = row[1]
            m = int(row[2]) if row[2] else 0
            amt = float(row[3] or 0)
            key = f"{cat} - {src}" if src else cat
            rev_by_cat.setdefault(key, {i: 0 for i in range(1, 13)})[m] = amt

        exp_stmt = (
            select(Expense.category, Expense.vendor, func.extract("month", Expense.expense_date).label("m"), func.sum(Expense.amount))
            .where(Expense.tenant_id == tenant_id)
        )
        if start_date and end_date:
            exp_stmt = exp_stmt.where(Expense.expense_date >= start_date, Expense.expense_date <= end_date)
        else:
            exp_stmt = exp_stmt.where(func.extract("year", Expense.expense_date) == year)
        exp_stmt = exp_stmt.group_by(Expense.category, Expense.vendor, func.extract("month", Expense.expense_date))
        for row in db.execute(exp_stmt).all():
            cat = row[0] or "Other"
            vend = row[1]
            m = int(row[2]) if row[2] else 0
            amt = float(row[3] or 0)
            key = f"{cat} - {vend}" if vend else cat
            exp_by_cat.setdefault(key, {i: 0 for i in range(1, 13)})[m] = amt

        def build_row(cat, months_data):
            row = {"category": cat, "fy": 0, "ytd": 0}
            for i, m in enumerate(range(1, 13)):
                val = months_data.get(m, 0)
                row[month_keys[i]] = val
                row["fy"] += val
                if m <= ytd_through_month:
                    row["ytd"] += val
            return row

        revenue_rows = [build_row(cat, data) for cat, data in rev_by_cat.items()]
        expense_rows = [build_row(cat, data) for cat, data in exp_by_cat.items()]
        total_rev = sum(r["fy"] for r in revenue_rows)
        total_exp = sum(r["fy"] for r in expense_rows)
        return {
            "year": year, "months": months,
            "revenue": revenue_rows, "expenses": expense_rows,
            "total_revenue": total_rev, "total_expenses": total_exp,
            "profit": total_rev - total_exp,
        }
    except SQLAlchemyError as exc:
        logger.exception("Database error calculating profit/loss: %s", exc)
        return _default
    except Exception as exc:
        logger.exception("Failed to calculate profit/loss: %s", exc)
        return _default


def get_accounts_dashboard(db: Session, tenant_id: int) -> dict:
    _default = {
        "total_settlement": 0, "total_invoice_count": 0,
        "overdue_count": 0, "overdue_amount": 0,
        "overdue_by_days": [], "monthly_settlement": [],
        "paperless_conversion": 0, "paper_invoices": 0,
        "avg_days_to_settle": 0, "disputed_share_pct": 0,
    }
    try:
        inv_row = db.execute(
            select(func.count(Invoice.id), func.coalesce(func.sum(Invoice.grand_total), 0))
            .where(Invoice.tenant_id == tenant_id, Invoice.status != "draft")
        ).first()
        total_invoices = inv_row[0] or 0

        total_settlement = float(db.execute(
            select(func.coalesce(func.sum(Invoice.amount_paid), 0)).where(Invoice.tenant_id == tenant_id)
        ).scalar() or 0)

        today = date.today()
        overdue_row = db.execute(
            select(func.count(Invoice.id), func.coalesce(func.sum(Invoice.grand_total - Invoice.amount_paid), 0))
            .where(Invoice.tenant_id == tenant_id, Invoice.due_date < today, Invoice.amount_paid < Invoice.grand_total)
        ).first()
        overdue_count = overdue_row[0] or 0
        overdue_amount = float(overdue_row[1] or 0)

        overdue_invoices = db.execute(
            select(Invoice.due_date, Invoice.grand_total, Invoice.amount_paid)
            .where(Invoice.tenant_id == tenant_id, Invoice.due_date < today, Invoice.amount_paid < Invoice.grand_total)
        ).all()
        buckets = {i: {"days": i, "count": 0, "amount": 0.0} for i in range(1, 46)}
        for due_dt, grand_total, amount_paid in overdue_invoices:
            if not due_dt:
                continue
            bucket = min(45, max(1, (today - due_dt).days))
            buckets[bucket]["count"] += 1
            buckets[bucket]["amount"] += float((grand_total or 0) - (amount_paid or 0))

        monthly_settlement = []
        for i in range(12):
            month_start = (today.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
            month_key = month_start.strftime("%Y-%m")
            month_paid = db.execute(
                select(func.coalesce(func.sum(Invoice.amount_paid), 0))
                .where(Invoice.tenant_id == tenant_id)
                .where(func.strftime("%Y-%m", Invoice.issue_date) == month_key)
            ).scalar()
            month_count = db.execute(
                select(func.count(Invoice.id))
                .where(Invoice.tenant_id == tenant_id, Invoice.status != "draft")
                .where(func.strftime("%Y-%m", Invoice.issue_date) == month_key)
            ).scalar()
            monthly_settlement.append({"month": month_key, "amount": float(month_paid or 0), "count": int(month_count or 0)})

        paid_invoices = db.execute(
            select(Invoice.issue_date, Invoice.updated_at)
            .where(Invoice.tenant_id == tenant_id, Invoice.amount_paid >= Invoice.grand_total, Invoice.issue_date.isnot(None))
        ).all()
        settle_days = []
        for issue_dt, updated_at in paid_invoices:
            if issue_dt and updated_at:
                end = updated_at.date() if hasattr(updated_at, "date") else updated_at
                settle_days.append(max(0, (end - issue_dt).days))
        avg_days_to_settle = round(sum(settle_days) / len(settle_days)) if settle_days else 0

        return {
            "total_settlement": total_settlement,
            "total_invoice_count": total_invoices,
            "overdue_count": overdue_count,
            "overdue_amount": overdue_amount,
            "overdue_by_days": [buckets[i] for i in range(1, 46)],
            "monthly_settlement": monthly_settlement,
            "paperless_conversion": total_invoices,
            "paper_invoices": 0,
            "avg_days_to_settle": avg_days_to_settle,
            "disputed_share_pct": 0,
        }
    except SQLAlchemyError as exc:
        logger.exception("Database error calculating dashboard metrics: %s", exc)
        return _default
    except Exception as exc:
        logger.exception("Failed to calculate dashboard metrics: %s", exc)
        return _default


def get_tax_report(db: Session, tenant_id: int, year: int) -> dict:
    try:
        row = db.execute(
            select(
                func.sum(Invoice.sgst_amount), func.sum(Invoice.cgst_amount),
                func.sum(Invoice.igst_amount), func.sum(Invoice.grand_total),
            )
            .where(Invoice.tenant_id == tenant_id, Invoice.status != "draft")
            .where(func.extract("year", Invoice.issue_date) == year)
        ).first()
        return {
            "year": year,
            "sgst_collected": float(row[0] or 0),
            "cgst_collected": float(row[1] or 0),
            "igst_collected": float(row[2] or 0),
            "total_taxable_value": float(row[3] or 0),
            "total_tax": float((row[0] or 0) + (row[1] or 0) + (row[2] or 0)),
        }
    except SQLAlchemyError as exc:
        logger.exception("Database error calculating tax report: %s", exc)
        return {"year": year, "sgst_collected": 0, "cgst_collected": 0, "igst_collected": 0, "total_taxable_value": 0, "total_tax": 0}
    except Exception as exc:
        logger.exception("Failed to calculate tax report: %s", exc)
        return {"year": year, "sgst_collected": 0, "cgst_collected": 0, "igst_collected": 0, "total_taxable_value": 0, "total_tax": 0}
