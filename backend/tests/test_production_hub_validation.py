from app.schemas.production_hub import ProductionHubRead


def test_production_hub_read_independent_list_defaults():
    """Each ProductionHubRead instance gets its own independent list instance for recent_jobs and machine_status."""
    hub1 = ProductionHubRead()
    hub2 = ProductionHubRead()

    assert hub1.recent_jobs is not hub2.recent_jobs
    assert hub1.machine_status is not hub2.machine_status

    hub1.recent_jobs.append({"id": 1, "name": "Job 1"})
    hub1.machine_status.append({"id": 1, "status": "running"})

    assert len(hub1.recent_jobs) == 1
    assert len(hub2.recent_jobs) == 0

    assert len(hub1.machine_status) == 1
    assert len(hub2.machine_status) == 0
