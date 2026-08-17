import logging

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
import logging

from app.models.document import Document
from app.schemas.document import DocumentCreate, DocumentUpdate

logger = logging.getLogger(__name__)


def create_document(db: Session, payload: DocumentCreate) -> Document:
    """
    Create a new document with database error handling.
    
    Database operation can fail due to constraint violations, connection errors,
    or transaction errors. Failed transactions are rolled back.
    """
    try:
        data = payload.model_dump()
        tenant_id = data.get("tenant_id")
        if not tenant_id:
            raise ValueError("tenant_id is required")
        doc = Document(**data)
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return doc
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Document creation failed due to integrity constraint: {str(e)}")
        raise ValueError(f"Document creation failed: Duplicate or invalid data - {str(e)}") from e
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Document creation failed due to database error: {str(e)}")
        raise RuntimeError(f"Document creation failed: Database error - {str(e)}") from e
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error during document creation: {str(e)}")
        raise


def list_documents(
    db: Session,
    tenant_id: int,
    doc_type: str | None = None,
) -> list[Document]:
    try:
        stmt = select(Document).where(Document.tenant_id == tenant_id)
        if doc_type and doc_type.strip():
            target_dt = doc_type.strip().lower()
            stmt = stmt.where(func.lower(Document.doc_type) == target_dt)
        stmt = stmt.order_by(Document.created_at.desc())
        return list(db.scalars(stmt).all())
    except SQLAlchemyError as exc:
        logger.exception("Database error in list_documents for tenant_id=%s: %s", tenant_id, exc)
        try:
            db.rollback()
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database error retrieving document list.",
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected error in list_documents for tenant_id=%s: %s", tenant_id, exc)
        try:
            db.rollback()
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve document list.",
        ) from exc


def get_document(db: Session, document_id: int, tenant_id: int | None = None) -> Document | None:
    try:
        doc = db.get(Document, document_id)
        if not doc:
            return None
        if tenant_id is not None and doc.tenant_id != tenant_id:
            return None
        return doc
    except SQLAlchemyError as exc:
        logger.exception("Database error in get_document document_id=%s: %s", document_id, exc)
        try:
            db.rollback()
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database error retrieving document.",
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected error in get_document document_id=%s: %s", document_id, exc)
        try:
            db.rollback()
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve document.",
        ) from exc


def update_document(
    db: Session,
    document_id: int,
    tenant_id: int | None = None,
    payload: DocumentUpdate = None,
) -> Document | None:
    """
    Update an existing document with database error handling.
    
    Database update can fail due to database or transaction errors.
    Failed updates are rolled back and the session remains usable.
    """
    try:
        doc = get_document(db, document_id, tenant_id)
        if not doc:
            return None
        data = payload.model_dump(exclude_unset=True) if payload else {}
        # Never allow tenant reassignment via update
        data.pop("tenant_id", None)
        for key, value in data.items():
            setattr(doc, key, value)
        db.commit()
        db.refresh(doc)
        return doc
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Document update failed due to integrity constraint for document {document_id}: {str(e)}")
        raise ValueError(f"Document update failed: Invalid data - {str(e)}") from e
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Document update failed due to database error for document {document_id}: {str(e)}")
        raise RuntimeError(f"Document update failed: Database error - {str(e)}") from e
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error during document update for document {document_id}: {str(e)}")
        raise


def delete_document(db: Session, document_id: int, tenant_id: int | None = None) -> bool:
    """
    Delete a document with database error handling.
    
    Database deletion can fail due to foreign key constraints or transaction errors.
    Failed deletions are rolled back and the session remains usable.
    """
    try:
        doc = get_document(db, document_id, tenant_id)
        if not doc:
            return False
        db.delete(doc)
        db.commit()
        return True
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Document deletion failed due to foreign key constraint for document {document_id}: {str(e)}")
        raise ValueError(f"Document deletion failed: Cannot delete due to related records - {str(e)}") from e
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Document deletion failed due to database error for document {document_id}: {str(e)}")
        raise RuntimeError(f"Document deletion failed: Database error - {str(e)}") from e
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error during document deletion for document {document_id}: {str(e)}")
        raise
