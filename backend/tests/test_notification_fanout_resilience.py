"""Tests for notification fanout resilience when individual user notification creation fails.
"""

from unittest.mock import MagicMock, patch

from app.models.alert import Alert
from app.services.alert_event_service import fanout_alert_notifications


def test_fanout_continues_when_one_user_notification_fails():
    """Verify that if create_for_user throws an exception for one user,
    notification creation continues for remaining users."""
    mock_db = MagicMock()
    fake_alert = Alert(
        id=1,
        tenant_id=1,
        alert_type="low_stock",
        title="Low Stock Alert",
        message="Stock is low",
        severity="high",
        module="inventory",
        target_role="Store Manager",
    )

    user_ids = [101, 102, 103]

    def mock_create_for_user(db, *, user_id, **kwargs):
        if user_id == 102:
            raise RuntimeError("Database error creating notification for user 102")
        return MagicMock()

    with patch(
        "app.services.alert_event_service._resolve_audience_user_ids",
        return_value=user_ids,
    ), patch(
        "app.services.notification_management_service.NotificationManagementService.create_for_user",
        side_effect=mock_create_for_user,
    ) as mock_create:
        created_count = fanout_alert_notifications(mock_db, fake_alert)

    # 2 out of 3 users should have been successfully notified (101 and 103)
    assert created_count == 2
    # All 3 users should have been attempted
    assert mock_create.call_count == 3
    attempted_uids = [call.kwargs["user_id"] for call in mock_create.call_args_list]
    assert attempted_uids == [101, 102, 103]
