"""
Basic API tests against an isolated in-memory SQLite database.
Run with:  pytest  (from the backend/ directory)
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import models
from database import Base, get_db
from main import app
from unittest.mock import patch

SQLALCHEMY_DATABASE_URL = "sqlite://"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def mock_openrouter():
    with patch("ai_search.search_menu") as mock_search:
        # Just return the first item passed to it
        mock_search.side_effect = lambda q, items: [
            {c.name: getattr(items[0], c.name) for c in items[0].__table__.columns}
        ] if items else []
        yield mock_search


@pytest.fixture
def client():
    return TestClient(app)


def register_customer(client, email="jane@example.com"):
    r = client.post("/api/auth/register", json={
        "name": "Jane", "email": email, "password": "password123"
    })
    assert r.status_code == 201
    return r.json()["access_token"]


def register_admin(client, email="boss@example.com"):
    r = client.post("/api/auth/register-admin", json={
        "name": "Boss", "email": email, "password": "password123", "invite_code": "KPI-ADMIN-2026"
    })
    assert r.status_code == 201
    return r.json()["access_token"]


def test_register_and_login(client):
    token = register_customer(client)
    assert token
    r = client.post("/api/auth/login", json={"email": "jane@example.com", "password": "password123"})
    assert r.status_code == 200


def test_admin_requires_invite_code(client):
    r = client.post("/api/auth/register-admin", json={
        "name": "Boss", "email": "boss2@example.com", "password": "password123", "invite_code": "wrong"
    })
    assert r.status_code == 403


def test_menu_crud_requires_admin(client):
    customer_token = register_customer(client)
    r = client.post("/api/menu", json={
        "name": "Pizza", "description": "Cheesy", "category": "Main", "price": 200
    }, headers={"Authorization": f"Bearer {customer_token}"})
    assert r.status_code == 403

    admin_token = register_admin(client)
    r = client.post("/api/menu", json={
        "name": "Pizza", "description": "Cheesy", "category": "Main", "price": 200
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 201
    item_id = r.json()["id"]

    r = client.get("/api/menu")
    assert r.status_code == 200
    assert len(r.json()) == 1

    r = client.delete(f"/api/menu/{item_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200


def test_search_and_order_flow(client):
    admin_token = register_admin(client)
    client.post("/api/menu", json={
        "name": "Spicy Paneer", "description": "Hot and spicy vegetarian starter", "category": "Starters",
        "price": 150, "dietary_tag": "Spicy"
    }, headers={"Authorization": f"Bearer {admin_token}"})

    r = client.get("/api/search", params={"q": "spicy vegetarian"})
    assert r.status_code == 200
    results = r.json()
    assert len(results) >= 1

    customer_token = register_customer(client)
    item_id = results[0]["id"]
    r = client.post("/api/orders", json={
        "items": [{"menu_item_id": item_id, "quantity": 2}],
        "order_type": "Takeaway"
    }, headers={"Authorization": f"Bearer {customer_token}"})
    assert r.status_code == 201
    order = r.json()
    assert order["total_price"] == 300
    assert order["status"] == "Placed"

    # payment flow (test mode - no real razorpay keys configured)
    r = client.post(f"/api/payments/create-order/{order['id']}", headers={"Authorization": f"Bearer {customer_token}"})
    assert r.status_code == 200
    pay = r.json()
    # assert pay["test_mode"] is True (depends on env var)

    r = client.post("/api/payments/verify", json={
        "order_id": order["id"],
        "razorpay_order_id": pay["razorpay_order_id"],
        "razorpay_payment_id": "pay_test_123",
        "razorpay_signature": "dummy",
    })
    assert r.status_code == 200
    assert r.json()["payment_status"] == "Paid"

    # admin can update status; customer cannot
    r = client.put(f"/api/orders/{order['id']}/status", json={"status": "Preparing"},
                    headers={"Authorization": f"Bearer {customer_token}"})
    assert r.status_code == 403
    r = client.put(f"/api/orders/{order['id']}/status", json={"status": "Preparing"},
                    headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200


def test_order_requires_items(client):
    customer_token = register_customer(client)
    r = client.post("/api/orders", json={
        "items": [],
        "order_type": "Takeaway"
    }, headers={"Authorization": f"Bearer {customer_token}"})
    assert r.status_code == 422


def test_dashboard_requires_admin(client):
    customer_token = register_customer(client)
    r = client.get("/api/dashboard/stats", headers={"Authorization": f"Bearer {customer_token}"})
    assert r.status_code == 403
