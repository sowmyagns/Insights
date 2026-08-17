from sqlalchemy.orm import Session
from app.models.employee import Employee


def generate_employee_id(db: Session) -> str:
    last = db.query(Employee).order_by(Employee.id.desc()).first()
    n = (last.id + 1) if last else 1
    return f"EMP{n:03d}"
