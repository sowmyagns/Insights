"""Unit tests for ProductRepository exception handling, input validation, and query operations."""

from unittest.mock import MagicMock
import pytest
from fastapi import HTTPException
from sqlalchemy.exc import InvalidRequestError, OperationalError
from sqlalchemy.orm.exc import UnmappedInstanceError

from app.models.product import Product
from app.repositories.product_repository import ProductRepository


def test_product_repository_list_all_success():
    mock_db = MagicMock()
    mock_product = MagicMock(spec=Product)
    mock_db.scalars.return_value.all.return_value = [mock_product]

    repo = ProductRepository(mock_db, tenant_id=1)
    result = repo.list_all()

    assert result == [mock_product]
    mock_db.scalars.assert_called_once()


def test_product_repository_list_all_catches_sqlalchemy_error():
    mock_db = MagicMock()
    mock_db.scalars.side_effect = OperationalError("SELECT 1", {}, Exception("Connection refused"))

    repo = ProductRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.list_all()

    assert exc_info.value.status_code == 503
    assert "Database connection unavailable" in exc_info.value.detail


def test_product_repository_list_all_catches_generic_exception():
    mock_db = MagicMock()
    mock_db.scalars.side_effect = RuntimeError("Unexpected query crash")

    repo = ProductRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.list_all()

    assert exc_info.value.status_code == 500
    assert "Database operation failed" in exc_info.value.detail


@pytest.mark.parametrize("invalid_id", [None, "10", True, False, 0, -5])
def test_product_repository_get_by_id_invalid_input(invalid_id):
    mock_db = MagicMock()
    repo = ProductRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.get_by_id(invalid_id)

    assert exc_info.value.status_code == 400
    assert "Invalid product ID" in exc_info.value.detail


def test_product_repository_get_by_id_catches_sqlalchemy_error():
    mock_db = MagicMock()
    mock_db.scalars.side_effect = OperationalError("SELECT 1", {}, Exception("Timeout"))

    repo = ProductRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.get_by_id(10)

    assert exc_info.value.status_code == 503
    assert "Database connection unavailable" in exc_info.value.detail


def test_product_repository_get_by_id_catches_generic_exception():
    mock_db = MagicMock()
    mock_db.scalars.side_effect = RuntimeError("Simulated database failure")

    repo = ProductRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.get_by_id(10)

    assert exc_info.value.status_code == 500
    assert "Database operation failed" in exc_info.value.detail


def test_product_repository_search_success():
    mock_db = MagicMock()
    mock_product = MagicMock(spec=Product)
    mock_db.scalars.return_value.all.return_value = [mock_product]

    repo = ProductRepository(mock_db, tenant_id=1)
    result = repo.search("widget")

    assert result == [mock_product]
    mock_db.scalars.assert_called_once()


@pytest.mark.parametrize("invalid_query", [None, 123, "", "   "])
def test_product_repository_search_invalid_query(invalid_query):
    mock_db = MagicMock()
    repo = ProductRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.search(invalid_query)

    assert exc_info.value.status_code == 400
    assert "Search query must be a non-empty string" in exc_info.value.detail


@pytest.mark.parametrize("invalid_limit", [None, 0, -5, "10"])
def test_product_repository_search_invalid_limit(invalid_limit):
    mock_db = MagicMock()
    repo = ProductRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.search("valid_query", limit=invalid_limit)

    assert exc_info.value.status_code == 400
    assert "Limit must be a positive integer" in exc_info.value.detail


def test_product_repository_search_catches_sqlalchemy_error():
    mock_db = MagicMock()
    mock_db.scalars.side_effect = OperationalError("SELECT 1", {}, Exception("DB failure during search"))

    repo = ProductRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.search("query")

    assert exc_info.value.status_code == 503
    assert "Database connection unavailable" in exc_info.value.detail


def test_product_repository_search_catches_generic_exception():
    mock_db = MagicMock()
    mock_db.scalars.side_effect = RuntimeError("Fatal driver crash")

    repo = ProductRepository(mock_db, tenant_id=1)

    with pytest.raises(HTTPException) as exc_info:
        repo.search("query")

    assert exc_info.value.status_code == 500
    assert "Database operation failed" in exc_info.value.detail


def test_product_repository_save_catches_sqlalchemy_error_and_rolls_back():
    mock_db = MagicMock()
    mock_db.commit.side_effect = OperationalError("COMMIT", {}, Exception("Constraint violation"))

    repo = ProductRepository(mock_db, tenant_id=1)
    mock_product = MagicMock(spec=Product)

    with pytest.raises(HTTPException) as exc_info:
        repo.save(mock_product)

    mock_db.rollback.assert_called_once()
    assert exc_info.value.status_code == 503
    assert "Transaction has been rolled back" in exc_info.value.detail
