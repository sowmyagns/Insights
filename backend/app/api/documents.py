from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import logging

from app.api.deps import get_db
from app.core.permissions import require_permission, tenant_scope
from app.models.user import User
from app.schemas.document import DocumentCreate, DocumentRead, DocumentUpdate
from app.services.document_service import (
    create_document,
    delete_document,
    get_document,
    list_documents,
    update_document,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["documents"])

MODULE = "documents"


@router.post("", response_model=DocumentRead)
def create_document_endpoint(
    payload: DocumentCreate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
) -> DocumentRead:
    """
    Create a new document with comprehensive error handling.
    
    Catches database integrity errors and returns appropriate HTTP responses.
    """
    if not user.tenant_id:
        raise HTTPException(400, "Tenant context required")
    payload.tenant_id = user.tenant_id
    if not payload.uploaded_by:
        payload.uploaded_by = getattr(user, "full_name", None) or user.email
    
    try:
        return create_document(db, payload)
    except ValueError as e:
        logger.warning(f"Document creation validation error for user {user.id}: {str(e)}")
        raise HTTPException(400, detail=str(e))
    except RuntimeError as e:
        logger.error(f"Document creation database error for user {user.id}: {str(e)}")
        raise HTTPException(503, detail="Database error - please try again later")
    except Exception as e:
        logger.exception(f"Unexpected error creating document for user {user.id}: {str(e)}")
        raise HTTPException(500, detail="Failed to create document")


@router.get("", response_model=list[DocumentRead])
def list_documents_endpoint(
    tenant_id: int = Depends(tenant_scope(MODULE)),
    doc_type: str | None = Query(None),
    db: Session = Depends(get_db),
) -> list[DocumentRead]:
    return list_documents(db, tenant_id, doc_type)


@router.get("/{document_id}", response_model=DocumentRead)
def get_document_endpoint(
    document_id: int,
    tenant_id: int = Depends(tenant_scope(MODULE)),
    db: Session = Depends(get_db),
) -> DocumentRead:
    doc = get_document(db, document_id, tenant_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    return doc


@router.put("/{document_id}", response_model=DocumentRead)
def update_document_endpoint(
    document_id: int,
    payload: DocumentUpdate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
) -> DocumentRead:
    """
    Update an existing document with comprehensive error handling.
    
    Catches database errors and returns appropriate HTTP responses.
    """
    try:
        doc = update_document(db, document_id, user.tenant_id, payload)
        if not doc:
            raise HTTPException(404, "Document not found")
        return doc
    except ValueError as e:
        logger.warning(f"Document update validation error for user {user.id}, document {document_id}: {str(e)}")
        raise HTTPException(400, detail=str(e))
    except RuntimeError as e:
        logger.error(f"Document update database error for user {user.id}, document {document_id}: {str(e)}")
        raise HTTPException(503, detail="Database error - please try again later")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Unexpected error updating document {document_id} for user {user.id}: {str(e)}")
        raise HTTPException(500, detail="Failed to update document")


@router.delete("/{document_id}")
def delete_document_endpoint(
    document_id: int,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
):
    """
    Delete a document with comprehensive error handling.
    
    Catches foreign key constraint errors and other database errors.
    """
    try:
        if not delete_document(db, document_id, user.tenant_id):
            raise HTTPException(404, "Document not found")
        return {"deleted": True, "id": document_id}
    except ValueError as e:
        logger.warning(f"Document deletion constraint error for user {user.id}, document {document_id}: {str(e)}")
        raise HTTPException(409, detail="Cannot delete document due to related records")
    except RuntimeError as e:
        logger.error(f"Document deletion database error for user {user.id}, document {document_id}: {str(e)}")
        raise HTTPException(503, detail="Database error - please try again later")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Unexpected error deleting document {document_id} for user {user.id}: {str(e)}")
        raise HTTPException(500, detail="Failed to delete document")
