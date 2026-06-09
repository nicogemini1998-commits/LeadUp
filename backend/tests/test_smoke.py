from __future__ import annotations


def test_health_ok(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert "timestamp" in body


def test_auth_login_requires_credentials(client):
    r = client.post("/api/auth/login", json={})
    assert r.status_code in (400, 422)


def test_auth_login_rejects_bad_password(client):
    r = client.post(
        "/api/auth/login",
        json={"email": "nobody@example.com", "password": "wrong"},
    )
    assert r.status_code in (400, 401, 403, 404)


def test_protected_route_requires_token(client):
    r = client.get("/api/leads/today")
    assert r.status_code in (401, 403)


def test_openapi_docs_available_in_dev(client):
    r = client.get("/openapi.json")
    assert r.status_code == 200
    spec = r.json()
    assert spec.get("info", {}).get("title") == "LeadUp API"
