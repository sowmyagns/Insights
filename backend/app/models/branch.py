from sqlalchemy import Column, Integer, String, Float
from app.models.base import Base


class Branch(Base):
    __tablename__ = "branches"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(30))
    address = Column(String(255))
    city = Column(String(80))
    state = Column(String(80))
    pincode = Column(String(20))
    is_default = Column(Integer, default=0)
