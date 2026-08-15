from app.core.database import SessionLocal
from app.models.accounts import JournalEntry


def test_create_journal_entry_accepts_reference_and_description_fields(client, register_admin):
    admin = register_admin()
    headers = admin["headers"]

    payload = {
        "date": "2026-07-26",
        "reference": "REF-001",
        "description": "Automation test entry",
        "branch": "Head Office",
        "legs": [
            {"account": "Office Supplies", "debit": 15000, "credit": 0},
            {"account": "Cash at Bank", "debit": 0, "credit": 15000},
        ],
    }

    response = client.post("/accounts/journal-entries", headers=headers, json=payload)
    assert response.status_code == 201, response.text

    db = SessionLocal()
    try:
        entry = db.query(JournalEntry).order_by(JournalEntry.id.desc()).first()
        assert entry is not None
        assert entry.reference == "REF-001"
        assert entry.description == "Automation test entry"
    finally:
        db.close()
