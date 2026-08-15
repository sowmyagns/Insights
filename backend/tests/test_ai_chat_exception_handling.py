"""Tests for generic exception handling on POST /api/ai/chat when OperatorAgent.process_message fails."""

from unittest.mock import patch
from sqlalchemy.exc import OperationalError

from app.llm.operator_agent import OperatorAgent


def test_ai_chat_handles_sqlalchemy_error(client, register_admin):
    admin_auth = register_admin()

    with patch.object(
        OperatorAgent,
        "process_message",
        side_effect=OperationalError("SELECT 1", {}, Exception("Database offline")),
    ):
        resp = client.post(
            "/api/ai/chat",
            json={"message": "What work orders are active?"},
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert data["success"] is False
    assert "Database error processing AI message" in data["message"]
    assert "errors" in data


def test_ai_chat_handles_generic_exception(client, register_admin):
    admin_auth = register_admin()

    with patch.object(
        OperatorAgent,
        "process_message",
        side_effect=RuntimeError("LLM Provider Timeout"),
    ):
        resp = client.post(
            "/api/ai/chat",
            json={"message": "Show machine status"},
            headers=admin_auth["headers"],
        )

    assert resp.status_code == 500
    data = resp.json()
    assert data["success"] is False
    assert "Failed to process AI chat message" in data["message"]
    assert "errors" in data
