from sqlalchemy import Column, Integer, String
from app.core.database import Base


class EmploymentType(Base):
    __tablename__ = "employment_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(80), nullable=False)
    code = Column(String(30))  # full_time, contract, etc.
    description = Column(String(255))
