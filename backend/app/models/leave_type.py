from sqlalchemy import Column, Integer, String
from app.models.base import Base


class LeaveType(Base):
    __tablename__ = "leave_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(80), nullable=False)
    code = Column(String(20), unique=True)  # casual, sick, earned, etc.
    description = Column(String(255))
    days_per_year = Column(Integer)  # max days allowed per year
    is_paid = Column(Integer, default=1)  # 1=paid, 0=unpaid
    color = Column(String(20))  # for UI badge
