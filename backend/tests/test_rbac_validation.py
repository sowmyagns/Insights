"""Tests for rbac.py schema validation: email format and role_ids bounds."""

import pytest
from pydantic import ValidationError

from app.schemas.rbac import UserCreate, UserUpdate, RoleCreate, RoleUpdate, RolePermissionsUpdate

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

VALID_EMAIL = "user@example.com"
VALID_PASSWORD = "Str0ng@Pass#2024"
VALID_FULL_NAME = "Test User"


def _make_create(**kwargs):
    defaults = dict(
        email=VALID_EMAIL,
        full_name=VALID_FULL_NAME,
        password=VALID_PASSWORD,
    )
    defaults.update(kwargs)
    return UserCreate(**defaults)


def _make_update(**kwargs):
    return UserUpdate(**kwargs)


# ---------------------------------------------------------------------------
# _normalize_email — invalid domain formats
# ---------------------------------------------------------------------------


class TestEmailValidation:
    """_normalize_email rejects malformed addresses in UserCreate & UserUpdate."""

    @pytest.mark.parametrize(
        "bad_email",
        [
            "user@domain",          # missing TLD
            "user@domain@com",      # multiple @
            "user@.com",            # leading dot in domain
            "user@com.",            # trailing dot in domain
            "user@-bad.com",        # domain starts with hyphen
            "@nodomain.com",        # empty local part
            "noatsign.com",         # missing @
            "user@",                # empty domain
            "",                     # empty string caught by min_length=3
        ],
    )
    def test_invalid_email_rejected_in_user_create(self, bad_email):
        if len(bad_email) < 3:
            # Field-level min_length fires first; still a ValidationError
            with pytest.raises(ValidationError):
                _make_create(email=bad_email)
        else:
            with pytest.raises(ValidationError, match="[Ii]nvalid email"):
                _make_create(email=bad_email)

    @pytest.mark.parametrize(
        "bad_email",
        [
            "user@domain",
            "user@domain@com",
            "user@.com",
            "user@com.",
        ],
    )
    def test_invalid_email_rejected_in_user_update(self, bad_email):
        with pytest.raises(ValidationError, match="[Ii]nvalid email"):
            _make_update(email=bad_email)

    @pytest.mark.parametrize(
        "good_email",
        [
            "user@example.com",
            "admin@sub.domain.org",
            "name+tag@company.io",
            "user.name@mail.example.co.uk",
        ],
    )
    def test_valid_email_accepted_in_user_create(self, good_email):
        obj = _make_create(email=good_email)
        assert obj.email == good_email.lower()

    def test_valid_email_accepted_in_user_update(self):
        obj = _make_update(email="admin@example.org")
        assert obj.email == "admin@example.org"

    def test_none_email_accepted_in_user_update(self):
        obj = _make_update(email=None)
        assert obj.email is None


# ---------------------------------------------------------------------------
# role_ids — must contain only positive integers (ge=1)
# ---------------------------------------------------------------------------


class TestRoleIdsValidation:
    """role_ids items must be >= 1 in UserCreate and UserUpdate."""

    def test_zero_role_id_rejected_in_user_create(self):
        with pytest.raises(ValidationError, match="role IDs must be >= 1"):
            _make_create(role_ids=[0])

    def test_negative_role_id_rejected_in_user_create(self):
        with pytest.raises(ValidationError, match="role IDs must be >= 1"):
            _make_create(role_ids=[-1])

    def test_mixed_invalid_role_ids_rejected_in_user_create(self):
        with pytest.raises(ValidationError, match="role IDs must be >= 1"):
            _make_create(role_ids=[1, 0, -5])

    def test_valid_role_ids_accepted_in_user_create(self):
        obj = _make_create(role_ids=[1, 2, 3])
        assert obj.role_ids == [1, 2, 3]

    def test_empty_role_ids_accepted_in_user_create(self):
        obj = _make_create(role_ids=[])
        assert obj.role_ids == []

    def test_zero_role_id_rejected_in_user_update(self):
        with pytest.raises(ValidationError, match="role IDs must be >= 1"):
            _make_update(role_ids=[0])

    def test_negative_role_id_rejected_in_user_update(self):
        with pytest.raises(ValidationError, match="role IDs must be >= 1"):
            _make_update(role_ids=[-3])

    def test_valid_role_ids_accepted_in_user_update(self):
        obj = _make_update(role_ids=[5, 10])
        assert obj.role_ids == [5, 10]

    def test_none_role_ids_accepted_in_user_update(self):
        obj = _make_update(role_ids=None)
        assert obj.role_ids is None


# ---------------------------------------------------------------------------
# permissions — must be non-empty, non-whitespace strings
# ---------------------------------------------------------------------------


class TestPermissionsValidation:
    """permissions list items must not be empty or whitespace-only."""

    # --- RoleCreate ---

    @pytest.mark.parametrize(
        "bad_permissions",
        [
            [""],
            ["   "],
            ["\t"],
            ["valid:permission", ""],
            ["valid:permission", "   "],
        ],
    )
    def test_empty_or_whitespace_permission_rejected_in_role_create(self, bad_permissions):
        with pytest.raises(ValidationError, match="non-empty, non-whitespace"):
            RoleCreate(name="Admin", permissions=bad_permissions)

    def test_valid_permissions_accepted_in_role_create(self):
        obj = RoleCreate(name="Admin", permissions=["read:users", "write:reports"])
        assert obj.permissions == ["read:users", "write:reports"]

    def test_empty_permissions_list_accepted_in_role_create(self):
        obj = RoleCreate(name="Admin", permissions=[])
        assert obj.permissions == []

    # --- RoleUpdate ---

    @pytest.mark.parametrize(
        "bad_permissions",
        [
            [""],
            ["  "],
            ["valid:permission", ""],
        ],
    )
    def test_empty_or_whitespace_permission_rejected_in_role_update(self, bad_permissions):
        with pytest.raises(ValidationError, match="non-empty, non-whitespace"):
            RoleUpdate(permissions=bad_permissions)

    def test_valid_permissions_accepted_in_role_update(self):
        obj = RoleUpdate(permissions=["read:users"])
        assert obj.permissions == ["read:users"]

    def test_none_permissions_accepted_in_role_update(self):
        obj = RoleUpdate(permissions=None)
        assert obj.permissions is None

    # --- RolePermissionsUpdate ---

    @pytest.mark.parametrize(
        "bad_permissions",
        [
            [""],
            ["\n"],
            ["valid:permission", ""],
        ],
    )
    def test_empty_or_whitespace_permission_rejected_in_role_permissions_update(self, bad_permissions):
        with pytest.raises(ValidationError, match="non-empty, non-whitespace"):
            RolePermissionsUpdate(permissions=bad_permissions)

    def test_valid_permissions_accepted_in_role_permissions_update(self):
        obj = RolePermissionsUpdate(permissions=["delete:orders", "approve:invoices"])
        assert obj.permissions == ["delete:orders", "approve:invoices"]

    def test_empty_list_accepted_in_role_permissions_update(self):
        obj = RolePermissionsUpdate(permissions=[])
        assert obj.permissions == []
