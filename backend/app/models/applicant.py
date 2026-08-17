from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Applicant(Base):
    """Job applicants for hiring process automation."""
    __tablename__ = "applicants"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    name = Column(String(100), nullable=False)
    email = Column(String(150), nullable=False)
    phone = Column(String(30))
    status = Column(String(30), default="applied")  # applied, screening, interview, offered, hired, rejected
    applied_date = Column(Date, nullable=False)
    resume_url = Column(String(500))
    offer_sent_date = Column(Date)
    employee_id = Column(Integer, ForeignKey("employees.id"))  # Set when hired

    job = relationship("Job", back_populates="applicants_rel")
