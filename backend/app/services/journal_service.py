"""Shared journal posting for invoice/payment and manual JVs."""

from __future__ import annotations

import logging
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

logger = logging.getLogger("gns_insights.journal_service")

from app.models.accounts import JournalEntry, JournalLeg


def post_journal_entry(
    db: Session,
    tenant_id: int,
    *,
    entry_date: date,
    reference: str | None,
    description: str | None,
    legs: list[dict],
    status: str = "Posted",
    branch: str = "Head Office",
    commit: bool = False,
) -> JournalEntry:
    """
    Create a balanced journal entry.
    Each leg: {"account": str, "debit": float, "credit": float}
    """
    try:
        total_debit = sum(float(l.get("debit") or 0) for l in legs)
        total_credit = sum(float(l.get("credit") or 0) for l in legs)
        if round(total_debit, 2) != round(total_credit, 2):
            raise ValueError(
                f"Unbalanced journal: debit={total_debit} credit={total_credit}"
            )
        if total_debit <= 0:
            raise ValueError("Journal must have positive amounts")

        count = (
            db.scalar(
                select(func.count(JournalEntry.id)).where(
                    JournalEntry.tenant_id == tenant_id
                )
            )
            or 0
        )
        entry_number = f"JV-{entry_date.year}-{count + 1:04d}"

        entry = JournalEntry(
            tenant_id=tenant_id,
            entry_number=entry_number,
            entry_date=entry_date,
            reference=reference,
            description=description,
            status=status,
            branch=branch,
        )
        db.add(entry)
        db.flush()
        for leg in legs:
            db.add(
                JournalLeg(
                    entry_id=entry.id,
                    account=str(leg.get("account") or "General"),
                    debit=float(leg.get("debit") or 0),
                    credit=float(leg.get("credit") or 0),
                )
            )
        if commit:
            db.commit()
            db.refresh(entry)
        return entry
    except ValueError:
        db.rollback()
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error while posting journal for tenant=%s", tenant_id)
        raise RuntimeError("Journal posting failed: Database error") from exc
    except Exception:
        db.rollback()
        raise


def get_journal_entry(
    db: Session, tenant_id: int, entry_id: int
) -> JournalEntry | None:
    from sqlalchemy.orm import joinedload

    return db.scalar(
        select(JournalEntry)
        .where(JournalEntry.id == entry_id, JournalEntry.tenant_id == tenant_id)
        .options(joinedload(JournalEntry.legs))
    )


def update_journal_entry(
    db: Session,
    tenant_id: int,
    entry_id: int,
    *,
    entry_date: date | None = None,
    reference: str | None = None,
    description: str | None = None,
    status: str | None = None,
    branch: str | None = None,
    legs: list[dict] | None = None,
) -> JournalEntry | None:
    try:
        entry = db.scalar(
            select(JournalEntry).where(
                JournalEntry.id == entry_id, JournalEntry.tenant_id == tenant_id
            )
        )
        if not entry:
            return None
        if entry_date is not None:
            entry.entry_date = entry_date
        if reference is not None:
            entry.reference = reference
        if description is not None:
            entry.description = description
        if status is not None:
            entry.status = status
        if branch is not None:
            entry.branch = branch
        if legs is not None:
            total_debit = sum(float(l.get("debit") or 0) for l in legs)
            total_credit = sum(float(l.get("credit") or 0) for l in legs)
            if round(total_debit, 2) != round(total_credit, 2):
                raise ValueError(
                    f"Unbalanced journal: debit={total_debit} credit={total_credit}"
                )
            if total_debit <= 0:
                raise ValueError("Journal must have positive amounts")
            for existing in list(entry.legs or []):
                db.delete(existing)
            db.flush()
            for leg in legs:
                db.add(
                    JournalLeg(
                        entry_id=entry.id,
                        account=str(leg.get("account") or "General"),
                        debit=float(leg.get("debit") or 0),
                        credit=float(leg.get("credit") or 0),
                    )
                )
        db.commit()
        db.refresh(entry)
        return entry
    except ValueError:
        db.rollback()
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error while updating journal entry=%s", entry_id)
        raise RuntimeError("Journal update failed: Database error") from exc
    except Exception:
        db.rollback()
        raise


def delete_journal_entry(db: Session, tenant_id: int, entry_id: int) -> bool:
    try:
        entry = db.scalar(
            select(JournalEntry).where(
                JournalEntry.id == entry_id, JournalEntry.tenant_id == tenant_id
            )
        )
        if not entry:
            return False
        db.delete(entry)
        db.commit()
        return True
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error while deleting journal entry=%s", entry_id)
        raise RuntimeError("Journal deletion failed: Database error") from exc
    except Exception:
        db.rollback()
        raise


def post_sales_invoice_journal(
    db: Session,
    tenant_id: int,
    *,
    invoice_number: str,
    issue_date: date,
    subtotal: float,
    discount: float,
    sgst: float,
    cgst: float,
    igst: float,
    round_off: float,
    grand_total: float,
) -> JournalEntry | None:
    """Dr AR / Cr Sales + GST outputs for a tax invoice."""
    net_sales = round(float(subtotal or 0) - float(discount or 0), 2)
    legs: list[dict] = [
        {"account": "Accounts Receivable", "debit": float(grand_total), "credit": 0},
        {"account": "Sales Revenue", "debit": 0, "credit": net_sales},
    ]
    if float(sgst or 0) > 0:
        legs.append({"account": "Output SGST", "debit": 0, "credit": float(sgst)})
    if float(cgst or 0) > 0:
        legs.append({"account": "Output CGST", "debit": 0, "credit": float(cgst)})
    if float(igst or 0) > 0:
        legs.append({"account": "Output IGST", "debit": 0, "credit": float(igst)})
    if float(round_off or 0) != 0:
        if float(round_off) > 0:
            legs.append({"account": "Round Off", "debit": 0, "credit": float(round_off)})
        else:
            legs.append(
                {"account": "Round Off", "debit": abs(float(round_off)), "credit": 0}
            )

    debit = sum(float(l["debit"]) for l in legs)
    credit = sum(float(l["credit"]) for l in legs)
    diff = round(abs(debit - credit), 2)
    if diff >= 0.01:
        raise ValueError(
            f"Invalid invoice journal totals for invoice {invoice_number}: "
            f"total debit ({debit:.2f}) does not match total credit ({credit:.2f})"
        )

    try:
        return post_journal_entry(
            db,
            tenant_id,
            entry_date=issue_date,
            reference=invoice_number,
            description=f"Sales invoice {invoice_number}",
            legs=legs,
            commit=False,
        )
    except ValueError:
        db.rollback()
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error posting sales invoice journal invoice=%s", invoice_number)
        raise RuntimeError("Sales invoice journal posting failed: Database error") from exc
    except Exception:
        db.rollback()
        raise


def post_sales_payment_journal(
    db: Session,
    tenant_id: int,
    *,
    invoice_number: str,
    payment_date: date,
    amount: float,
    method: str = "cash",
) -> JournalEntry | None:
    """Dr Cash/Bank / Cr AR for customer payment."""
    val = float(amount or 0)
    if val <= 0:
        raise ValueError("Payment amount must be greater than zero")

    cash_account = "Bank" if (method or "").lower() in ("bank", "upi", "neft", "rtgs", "card") else "Cash"
    legs = [
        {"account": cash_account, "debit": val, "credit": 0},
        {"account": "Accounts Receivable", "debit": 0, "credit": val},
    ]
    try:
        return post_journal_entry(
            db,
            tenant_id,
            entry_date=payment_date,
            reference=invoice_number,
            description=f"Payment against invoice {invoice_number}",
            legs=legs,
            commit=False,
        )
    except ValueError:
        db.rollback()
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error posting payment journal invoice=%s", invoice_number)
        raise RuntimeError("Payment journal posting failed: Database error") from exc
    except Exception:
        db.rollback()
        raise
