"""Company settings API smoke test."""


def test_company_settings_get_and_update(client, register_admin):
    admin = register_admin()
    headers = admin["headers"]

    get_resp = client.get("/settings/company", headers=headers)
    assert get_resp.status_code == 200, get_resp.text
    data = get_resp.json()
    assert "tenant_id" in data

    put_resp = client.put(
        "/settings/company",
        headers=headers,
        json={"company_name": "Insights Iva"},
    )
    assert put_resp.status_code == 200, put_resp.text
    assert put_resp.json()["company_name"] == "Insights Iva"
