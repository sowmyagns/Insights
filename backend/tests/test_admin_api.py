"""Settings / Admin API tests."""

import uuid


def _login_admin(client, register_admin):
    admin = register_admin()
    return admin["headers"]


def _unwrap(response):
    body = response.json()
    if isinstance(body, dict) and "success" in body:
        assert body["success"] is True
        return body["data"]
    return body


def test_admin_users_crud(client, register_admin):
    admin = register_admin()
    headers = admin["headers"]

    stats = client.get("/admin/users/stats", headers=headers)
    assert stats.status_code == 200
    stats_data = stats.json()
    assert stats_data["total_users"] >= 1
    assert stats_data["active_users"] >= 1
    assert stats_data["administrators"] >= 1

    roles = client.get("/admin/roles", headers=headers).json()
    admin_email = admin["email"]
    domain = admin_email.split("@", 1)[1]
    email = f"settings-{uuid.uuid4().hex[:8]}@{domain}"

    create = client.post(
        "/admin/users",
        headers=headers,
        json={
            "full_name": "Settings Test User",
            "email": email,
            "phone": "6302828004",
            "password": "Passw0rd!123",
            "is_active": True,
            "role_ids": [roles[0]["id"]],
        },
    )
    assert create.status_code == 201, create.text
    created = create.json()
    assert created["email"] == email

    update = client.put(
        f"/admin/users/{created['id']}",
        headers=headers,
        json={"full_name": "Settings Updated"},
    )
    assert update.status_code == 200
    assert update.json()["full_name"] == "Settings Updated"


def test_admin_user_validation_errors(client, register_admin):
    admin = register_admin()
    headers = admin["headers"]
    roles = client.get("/admin/roles", headers=headers).json()
    domain = admin["email"].split("@", 1)[1]

    invalid_name = client.post(
        "/admin/users",
        headers=headers,
        json={
            "full_name": "@@@@",
            "email": f"invalid-name-{uuid.uuid4().hex[:8]}@{domain}",
            "phone": "6302828004",
            "password": "Passw0rd!123",
            "is_active": True,
            "role_ids": [roles[0]["id"]],
        },
    )
    assert invalid_name.status_code == 422

    invalid_phone = client.post(
        "/admin/users",
        headers=headers,
        json={
            "full_name": "Valid Name",
            "email": f"invalid-phone-{uuid.uuid4().hex[:8]}@{domain}",
            "phone": "12345",
            "password": "Passw0rd!123",
            "is_active": True,
            "role_ids": [roles[0]["id"]],
        },
    )
    assert invalid_phone.status_code == 422

    too_long_name = client.post(
        "/admin/users",
        headers=headers,
        json={
            "full_name": "A" * 101,
            "email": f"invalid-long-{uuid.uuid4().hex[:8]}@{domain}",
            "phone": "6302828004",
            "password": "Passw0rd!123",
            "is_active": True,
            "role_ids": [roles[0]["id"]],
        },
    )
    assert too_long_name.status_code == 422


def test_admin_roles_and_permissions(client, register_admin):
    headers = _login_admin(client, register_admin)

    modules = client.get("/admin/permissions/modules", headers=headers)
    assert modules.status_code == 200
    assert len(modules.json()) >= 10

    roles = client.get("/admin/roles", headers=headers).json()
    store_role = next(r for r in roles if r["name"] == "Store Manager")

    updated = client.put(
        f"/admin/roles/{store_role['id']}/permissions",
        headers=headers,
        json={"permissions": ["dashboard", "inventory", "procurement", "alerts"]},
    )
    assert updated.status_code == 200
    assert "inventory" in updated.json()["permissions"]


def test_settings_api_envelope(client, register_admin):
    headers = _login_admin(client, register_admin)

    resp = client.get("/api/settings/users/stats", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["data"]["total_users"] >= 1

    perms = client.get("/api/settings/permissions", headers=headers)
    assert perms.status_code == 200
    roles = _unwrap(perms)
    assert len(roles) >= 6


def test_audit_logs(client, register_admin):
    admin = register_admin()
    headers = admin["headers"]

    login_resp = client.post(
        "/auth/login",
        json={"email": admin["email"], "password": admin["password"], "role": "Admin"},
    )
    assert login_resp.status_code == 200
    new_token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {new_token}"}

    logs = client.get("/admin/access-logs", headers=headers)
    assert logs.status_code == 200
    items = logs.json()
    assert isinstance(items, list)
    assert len(items) >= 1
    assert any(l["action"] == "login" for l in items)

    envelope = client.get("/api/settings/audit-logs?page_size=10", headers=headers)
    assert envelope.status_code == 200
    data = _unwrap(envelope)
    assert "items" in data
    assert data["total"] >= 1


def test_admin_requires_admin_role(client, register_admin, make_restricted_user):
    admin = register_admin()
    tenant_id = admin["user"]["tenant_id"]
    limited = make_restricted_user(tenant_id, permissions=["production"])

    for path in ("/admin/users", "/api/settings/users"):
        resp = client.get(path, headers=limited["headers"])
        assert resp.status_code == 403
