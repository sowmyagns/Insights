from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.core.database import Base


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(120), nullable=False)
    dept = Column(String(80), nullable=False)
    location = Column(String(50), nullable=False)
    applicants = Column(Integer, default=0)
    status = Column(String(20), default="Open")  # Open, Closed
    posted = Column(String(10))  # YYYY-MM-DD
    description = Column(String(500))

    applicants_rel = relationship("Applicant", back_populates="job")
