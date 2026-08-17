from datetime import datetime
import pytest
from pydantic import ValidationError
from app.schemas.notification import NotificationCreate, NotificationListData, NotificationRead, UnreadCountData


def test_notification_negative_counts_rejected():
    """Negative total or unread_count should raise ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        NotificationListData(
            items=[],
            total=-1,
            page=1,
            page_size=20,
            has_more=False,
            unread_count=0,
        )
    assert any(err["loc"] == ("total",) for err in exc_info.value.errors())

    with pytest.raises(ValidationError) as exc_info:
        NotificationListData(
            items=[],
            total=10,
            page=1,
            page_size=20,
            has_more=False,
            unread_count=-5,
        )
    assert any(err["loc"] == ("unread_count",) for err in exc_info.value.errors())

    with pytest.raises(ValidationError) as exc_info:
        UnreadCountData(unread_count=-5)
    assert any(err["loc"] == ("unread_count",) for err in exc_info.value.errors())


def test_notification_list_data_valid_pagination():
    """Valid page and page_size pass validation."""
    data = NotificationListData(
        items=[],
        total=10,
        page=1,
        page_size=20,
        has_more=False,
        unread_count=2,
    )
    assert data.page == 1
    assert data.page_size == 20


def test_notification_list_data_invalid_page_rejected():
    """page=0 or negative page raises ValidationError."""
    for invalid_page in (0, -1, -5):
        with pytest.raises(ValidationError) as exc_info:
            NotificationListData(
                items=[],
                total=10,
                page=invalid_page,
                page_size=20,
                has_more=False,
                unread_count=0,
            )
        assert any(err["loc"] == ("page",) for err in exc_info.value.errors())


def test_notification_list_data_invalid_page_size_rejected():
    """page_size=0, negative, or >1000 raises ValidationError."""
    for invalid_size in (0, -1, 1001, 5000):
        with pytest.raises(ValidationError) as exc_info:
            NotificationListData(
                items=[],
                total=10,
                page=1,
                page_size=invalid_size,
                has_more=False,
                unread_count=0,
            )
        assert any(err["loc"] == ("page_size",) for err in exc_info.value.errors())


def test_notification_create_valid_user_id():
    """Valid positive user_id should pass validation."""
    nc = NotificationCreate(title="System Alert", message="Maintenance upcoming", user_id=5)
    assert nc.user_id == 5


def test_notification_create_none_user_id():
    """None user_id should pass validation."""
    nc = NotificationCreate(title="System Alert", message="Maintenance upcoming", user_id=None)
    assert nc.user_id is None


def test_notification_create_negative_user_id_rejected():
    """Negative user_id (e.g. -1) should raise ValidationError with ge=1 constraint."""
    with pytest.raises(ValidationError) as exc_info:
        NotificationCreate(title="System Alert", message="Maintenance upcoming", user_id=-1)
    
    errors = exc_info.value.errors()
    assert any(err["loc"] == ("user_id",) for err in errors)


def test_notification_create_zero_user_id_rejected():
    """Zero user_id (0) should raise ValidationError with ge=1 constraint."""
    with pytest.raises(ValidationError) as exc_info:
        NotificationCreate(title="System Alert", message="Maintenance upcoming", user_id=0)
    
    errors = exc_info.value.errors()
    assert any(err["loc"] == ("user_id",) for err in errors)


def test_notification_create_valid_priority():
    """Valid priority values (low, medium, high, urgent, critical) pass validation."""
    for p in ("low", "medium", "high", "urgent", "critical", "HIGH"):
        nc = NotificationCreate(title="System Alert", message="Maintenance upcoming", priority=p)
        assert nc.priority == p.lower()


def test_notification_create_invalid_priority_rejected():
    """Arbitrary priority values like 'invalid' or 'critical123' raise ValidationError."""
    for p in ("invalid", "critical123", "unknown"):
        with pytest.raises(ValidationError) as exc_info:
            NotificationCreate(title="System Alert", message="Maintenance upcoming", priority=p)
        assert any(err["loc"] == ("priority",) for err in exc_info.value.errors())


def test_notification_create_valid_type():
    """Valid notification types (information, success, warning, error, production, etc.) pass validation."""
    for t in ("information", "info", "success", "warning", "error", "production", "inventory", "quality", "maintenance", "sales", "hr", "finance", "system"):
        nc = NotificationCreate(title="System Alert", message="Maintenance upcoming", type=t)
        expected = "information" if t == "info" else t
        assert nc.type == expected


def test_notification_create_invalid_type_rejected():
    """Arbitrary type values like 'unknown_type' raise ValidationError."""
    for t in ("unknown_type", "invalid_type", "random"):
        with pytest.raises(ValidationError) as exc_info:
            NotificationCreate(title="System Alert", message="Maintenance upcoming", type=t)
        assert any(err["loc"] == ("type",) for err in exc_info.value.errors())


def test_notification_create_valid_module():
    """Valid ERP notification modules pass validation."""
    for m in ("system", "production", "inventory", "maintenance", "hr", "sales", "quality", "admin"):
        nc = NotificationCreate(title="System Alert", message="Maintenance upcoming", module=m)
        assert nc.module == m


def test_notification_create_invalid_module_rejected():
    """Arbitrary module values like 'invalid_module' raise ValidationError."""
    for m in ("invalid_module", "unknown_mod", "hack_module"):
        with pytest.raises(ValidationError) as exc_info:
            NotificationCreate(title="System Alert", message="Maintenance upcoming", module=m)
        assert any(err["loc"] == ("module",) for err in exc_info.value.errors())


def test_notification_create_valid_action_url():
    """Valid relative paths or HTTP/HTTPS URLs pass validation."""
    valid_urls = [
        "/maintenance/preventive",
        "/inventory/items?id=123",
        "https://example.com/alerts",
        "http://localhost:3000/dashboard",
        None,
        "",
    ]
    for url in valid_urls:
        nc = NotificationCreate(title="Alert", message="Msg", action_url=url)
        assert nc.action_url == (url.strip() if url else None)


def test_notification_create_invalid_action_url_rejected():
    """Unsafe or malformed action_url strings raise ValidationError."""
    invalid_urls = [
        "javascript:alert(1)",
        "data:text/html,script",
        "vbscript:msgbox",
        "file:///etc/passwd",
        "ftp://example.com",
        "malformed_without_slash",
        "/path with space",
    ]
    for url in invalid_urls:
        with pytest.raises(ValidationError) as exc_info:
            NotificationCreate(title="Alert", message="Msg", action_url=url)
        assert any(err["loc"] == ("action_url",) for err in exc_info.value.errors())


def test_notification_read_sync_read_state():
    """is_read and read fields are synchronized to be identical."""
    now = datetime.now()
    # Case 1: is_read=True, read=False -> read synced to True
    nr1 = NotificationRead(
        id=1, title="T", message="M", type="information", priority="medium", module="system",
        is_read=True, read=False, created_at=now, updated_at=now,
    )
    assert nr1.is_read is True
    assert nr1.read is True

    # Case 2: is_read=False, read=True -> read synced to False
    nr2 = NotificationRead(
        id=2, title="T", message="M", type="information", priority="medium", module="system",
        is_read=False, read=True, created_at=now, updated_at=now,
    )
    assert nr2.is_read is False
    assert nr2.read is False
