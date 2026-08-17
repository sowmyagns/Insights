"""Indian bank IFSC / account validation helpers."""

from __future__ import annotations

import logging
import re

import httpx
from fastapi import HTTPException, status

from app.utils.gst import validate_ifsc

logger = logging.getLogger(__name__)

_IFSC_API = "https://ifsc.razorpay.com/{ifsc}"
_ACCOUNT_RE = re.compile(r"^[0-9]{9,18}$")
_PLACEHOLDER_BRANCH = frozenset({"", "BRANCH", "NA", "N/A", "-", "NULL", "NONE"})


def normalize_account_number(value: str | None) -> str:
    digits = re.sub(r"\D", "", value or "")
    if not _ACCOUNT_RE.match(digits):
        raise ValueError("Account number must be 9–18 digits")
    return digits


def _clean_branch(*candidates: str | None) -> str:
    """Pick the best branch label; ignore placeholder values like 'BRANCH'."""
    for raw in candidates:
        value = (raw or "").strip()
        if not value:
            continue
        if value.upper() in _PLACEHOLDER_BRANCH:
            continue
        return value
    return ""


def lookup_bank_details(ifsc: str, account_number: str | None = None) -> dict:
    """
    Validate account number format + IFSC, then resolve bank/branch from IFSC registry.
    Returns bank_name, branch, bank_branch, ifsc, account_number (normalized).
    """
    try:
        try:
            code = validate_ifsc(ifsc, required=True)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid IFSC code",
            ) from exc

        account = None
        if account_number is not None and str(account_number).strip():
            try:
                account = normalize_account_number(account_number)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid bank account details",
                ) from exc

        try:
            with httpx.Client(timeout=8.0) as client:
                resp = client.get(_IFSC_API.format(ifsc=code))
        except httpx.HTTPError as exc:
            logger.warning("IFSC lookup failed for %s: %s", code, exc)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Unable to verify bank details right now. Please try again.",
            ) from exc

        if resp.status_code == 404:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid IFSC code",
            )
        if resp.status_code != 200:
            logger.warning("IFSC API status %s for %s", resp.status_code, code)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Unable to verify bank details right now. Please try again.",
            )

        try:
            data = resp.json()
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Unable to verify bank details right now. Please try again.",
            ) from exc

        try:
            bank_name = (data.get("BANK") or data.get("BANKNAME") or "").strip()
            centre = (data.get("CENTRE") or data.get("CITY") or "").strip()
            address = (data.get("ADDRESS") or "").strip()
            # Some IFSC records return the literal "BRANCH" — fall back to centre / address
            branch = _clean_branch(
                data.get("BRANCH"),
                centre,
                address.split(",")[0] if address else None,
            )
            if not bank_name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid IFSC code",
                )
            if not branch:
                branch = centre or bank_name

            return {
                "valid": True,
                "ifsc": code,
                "account_number": account,
                "bank_name": bank_name,
                "branch": branch,
                "bank_branch": branch,
                "centre": centre or None,
                "state": (data.get("STATE") or "").strip() or None,
                "address": address or None,
            }
        except HTTPException:
            raise
        except Exception as exc:
            logger.error(
                f"Unexpected error in lookup_bank_details for IFSC {code}: {str(exc)}"
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to process bank details. Please try again."
            ) from exc
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(
            f"Unexpected runtime error in lookup_bank_details for IFSC {ifsc}: {str(exc)}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to verify bank details. Please try again."
        ) from exc
