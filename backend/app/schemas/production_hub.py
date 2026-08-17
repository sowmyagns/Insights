from pydantic import BaseModel, Field


class HubStatusBlockRead(BaseModel):
    label: str
    value: int | float | str
    status: str = "ok"
    detail: str | None = None


class ProductionHubRead(BaseModel):
    running_jobs: int = 0
    machines_running: int = 0
    machines_idle: int = 0
    machines_down: int = 0
    production_in_progress: int = 0
    production_completed_today: int = 0
    material_shortages: int = 0
    material_available: int = 0
    operators_present: int = 0
    operators_absent: int = 0
    quality_passed: int = 0
    quality_failed: int = 0
    recent_jobs: list[dict] = Field(default_factory=list)
    machine_status: list[dict] = Field(default_factory=list)
