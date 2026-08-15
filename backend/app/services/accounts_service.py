from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.accounts import Expense, Income
from app.models.sales import Invoice, Payment
from app.schemas.accounts import ExpenseCreate, IncomeCreate


def create_income(db: Session, payload: IncomeCreate) -> Income:
    obj = Income(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def list_incomes(db: Session, tenant_id: int, year: int | None = None) -> list[Income]:
    stmt = select(Income).where(Income.tenant_id == tenant_id)
    if year:
        stmt = stmt.where(func.extract("year", Income.income_date) == year)
    stmt = stmt.order_by(Income.income_date.desc())
    return list(db.scalars(stmt).all())


def create_expense(db: Session, payload: ExpenseCreate) -> Expense:
    obj = Expense(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_expense(db: Session, tenant_id: int, expense_id: int) -> Expense | None:
    return db.scalars(
        select(Expense).where(Expense.id == expense_id, Expense.tenant_id == tenant_id)
    ).first()


def update_expense(
    db: Session, tenant_id: int, expense_id: int, data: dict
) -> Expense | None:
    obj = get_expense(db, tenant_id, expense_id)
    if not obj:
        return None
    for key, value in data.items():
        if value is not None:
            setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


def delete_expense(db: Session, tenant_id: int, expense_id: int) -> bool:
    obj = get_expense(db, tenant_id, expense_id)
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True


def list_expenses(db: Session, tenant_id: int, year: int | None = None) -> list[Expense]:
    stmt = select(Expense).where(Expense.tenant_id == tenant_id)
    if year:
        stmt = stmt.where(func.extract("year", Expense.expense_date) == year)
    stmt = stmt.order_by(Expense.expense_date.desc())
    return list(db.scalars(stmt).all())


def get_profit_loss(db: Session, tenant_id: int, year: int, ytd_through_month: int = 12, start_date: date | None = None, end_date: date | None = None) -> dict:
    """P&L: Revenue (invoices + income) vs Cost/Expense by month."""
    from datetime import date
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    rev_by_cat = {}
    exp_by_cat = {}

    from app.models.sales import Customer

    # Revenue from invoices (by customer name)
    inv_stmt = (
        select(Customer.name, func.extract("month", Invoice.issue_date).label("m"), func.sum(Invoice.grand_total))
        .join(Invoice, Invoice.customer_id == Customer.id)
        .where(Invoice.tenant_id == tenant_id)
        .where(Invoice.status != "draft")
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
        if cat not in rev_by_cat:
            rev_by_cat[cat] = {i: 0 for i in range(1, 13)}
        rev_by_cat[cat][m] = amt

    # Revenue from income table (by category/source)
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
        if key not in rev_by_cat:
            rev_by_cat[key] = {i: 0 for i in range(1, 13)}
        rev_by_cat[key][m] = amt

    # Expenses by category/vendor
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
        if key not in exp_by_cat:
            exp_by_cat[key] = {i: 0 for i in range(1, 13)}
        exp_by_cat[key][m] = amt

    month_keys = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]

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
    profit = total_rev - total_exp

    return {
        "year": year,
        "months": months,
        "revenue": revenue_rows,
        "expenses": expense_rows,
        "total_revenue": total_rev,
        "total_expenses": total_exp,
        "profit": profit,
    }


def get_accounts_dashboard(db: Session, tenant_id: int) -> dict:
    """Dashboard metrics: settlement, invoice count, overdue, paperless, etc."""
    inv_stmt = select(func.count(Invoice.id), func.coalesce(func.sum(Invoice.grand_total), 0)).where(Invoice.tenant_id == tenant_id).where(Invoice.status != "draft")
    inv_row = db.execute(inv_stmt).first()
    total_invoices = inv_row[0] or 0
    total_amount = float(inv_row[1] or 0)

    paid_stmt = select(func.coalesce(func.sum(Invoice.amount_paid), 0)).where(Invoice.tenant_id == tenant_id)
    paid_row = db.execute(paid_stmt).first()
    total_settlement = float(paid_row[0] or 0)

    # Overdue (simplified: due_date < today and not fully paid)
    from datetime import date as d
    today = d.today()
    overdue_stmt = (
        select(func.count(Invoice.id), func.coalesce(func.sum(Invoice.grand_total - Invoice.amount_paid), 0))
        .where(Invoice.tenant_id == tenant_id)
        .where(Invoice.due_date < today)
        .where(Invoice.amount_paid < Invoice.grand_total)
    )
    overdue_row = db.execute(overdue_stmt).first()
    overdue_count = overdue_row[0] or 0
    overdue_amount = float(overdue_row[1] or 0)

    # Overdue aging buckets from actual overdue invoices
    overdue_invoices = db.execute(
        select(Invoice.due_date, Invoice.grand_total, Invoice.amount_paid)
        .where(Invoice.tenant_id == tenant_id)
        .where(Invoice.due_date < today)
        .where(Invoice.amount_paid < Invoice.grand_total)
    ).all()
    buckets = {i: {"days": i, "count": 0, "amount": 0.0} for i in range(1, 46)}
    for due_date, grand_total, amount_paid in overdue_invoices:
        if not due_date:
            continue
        days_over = max(1, (today - due_date).days)
        bucket = min(45, days_over)
        buckets[bucket]["count"] += 1
        buckets[bucket]["amount"] += float((grand_total or 0) - (amount_paid or 0))
    overdue_by_days = [buckets[i] for i in range(1, 46)]

    # Monthly settlement from invoices (last 12 months)
    from datetime import timedelta
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
            .where(Invoice.tenant_id == tenant_id)
            .where(func.strftime("%Y-%m", Invoice.issue_date) == month_key)
            .where(Invoice.status != "draft")
        ).scalar()
        monthly_settlement.append({
            "month": month_key,
            "amount": float(month_paid or 0),
            "count": int(month_count or 0),
        })

    paid_invoices = db.execute(
        select(Invoice.issue_date, Invoice.updated_at)
        .where(Invoice.tenant_id == tenant_id)
        .where(Invoice.amount_paid >= Invoice.grand_total)
        .where(Invoice.issue_date.isnot(None))
    ).all()
    settle_days = []
    for issue_date, updated_at in paid_invoices:
        if issue_date and updated_at:
            end = updated_at.date() if hasattr(updated_at, "date") else updated_at
            settle_days.append(max(0, (end - issue_date).days))
    avg_days_to_settle = round(sum(settle_days) / len(settle_days)) if settle_days else 0

    return {
        "total_settlement": total_settlement,
        "total_invoice_count": total_invoices,
        "overdue_count": overdue_count,
        "overdue_amount": overdue_amount,
        "overdue_by_days": overdue_by_days,
        "monthly_settlement": monthly_settlement,
        "paperless_conversion": total_invoices,
        "paper_invoices": 0,
        "avg_days_to_settle": avg_days_to_settle,
        "disputed_share_pct": 0,
    }


def get_tax_report(db: Session, tenant_id: int, year: int) -> dict:
    """GST/Tax summary for the year."""
    stmt = (
        select(
            func.sum(Invoice.sgst_amount),
            func.sum(Invoice.cgst_amount),
            func.sum(Invoice.igst_amount),
            func.sum(Invoice.grand_total),
        )
        .where(Invoice.tenant_id == tenant_id)
        .where(func.extract("year", Invoice.issue_date) == year)
        .where(Invoice.status != "draft")
    )
    row = db.execute(stmt).first()
    return {
        "year": year,
        "sgst_collected": float(row[0] or 0),
        "cgst_collected": float(row[1] or 0),
        "igst_collected": float(row[2] or 0),
        "total_taxable_value": float(row[3] or 0),
        "total_tax": float((row[0] or 0) + (row[1] or 0) + (row[2] or 0)),
    }
