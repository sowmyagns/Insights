from datetime import datetime

from pydantic import BaseModel, ConfigDict, model_validator


class LoginHistoryBase(BaseModel):
    user_id: int | None = None
    company_id: int | None = None
    email: str
    ip_address: str | None = None
    user_agent: str | None = None
    login_status: str = "success"
    login_at: datetime
    logout_at: datetime | None = None

    @model_validator(mode="after")
    def validate_logout_after_login(self) -> "LoginHistoryBase":
        if self.login_at and self.logout_at and self.logout_at < self.login_at:
            raise ValueError("logout_at timestamp cannot be earlier than login_at timestamp.")
        return self


class LoginHistoryCreate(LoginHistoryBase):
    pass


class LoginHistoryRead(BaseModel):
    id: int
    user_id: int | None = None
    company_id: int | None = None
    full_name: str | None = None
    company_name: str | None = None
    email: str
    role: str | None = None
    ip_address: str | None = None
    browser: str | None = None
    operating_system: str | None = None
    device_type: str | None = None
    login_status: str
    login_at: datetime
    logout_at: datetime | None = None
    created_at: datetime | None = None
    login_date: str | None = None
    login_time: str | None = None
    logout_time: str | None = None

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def validate_logout_after_login(self) -> "LoginHistoryRead":
        if self.login_at and self.logout_at and self.logout_at < self.login_at:
            raise ValueError("logout_at timestamp cannot be earlier than login_at timestamp.")
        return self
