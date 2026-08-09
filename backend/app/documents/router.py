from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Request, status, File, Form, UploadFile
from fastapi.responses import StreamingResponse
import logging
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.documents.models import (
    DocumentRequirement,
    DocumentType,
    Document
)
from app.auth.dependencies import get_current_user, require_hr, require_employee
from app.auth.models import User
from app.database.session import get_db
from app.documents.schemas import (
    DocumentRequirementCreate,
    DocumentRequirementResponse,
    DocumentTypeCreate,
    DocumentTypeResponse,
    ChecklistItemResponse,
    DocumentResponse,
    HRDocumentResponse,
    DocumentRejectRequest,
    DocumentAccessResponse,
    DocumentExpiryResponse,
)
from app.employees.models import Employee
from app.documents.service import (
    create_document_type,
    create_requirement,
    get_document_types,
    get_employee_checklist,
    upload_employee_document,
    get_pending_documents,
    get_employee_documents,
    approve_document,
    reject_document,
    get_document_access,
    get_my_documents,
    get_expiring_documents,
)
from app.storage.minio import stream_object

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/documents",
    tags=["Documents"]
)


@router.post(
    "/types",
    response_model=DocumentTypeResponse,
    status_code=status.HTTP_201_CREATED
)
def add_document_type(
    data: DocumentTypeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr)
):
    document_type = create_document_type(db, data)

    if document_type is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Document type already exists"
        )

    return document_type

@router.get(
    "/types",
    response_model=list[DocumentTypeResponse]
)
def list_document_types(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_document_types(db)

@router.post(
    "/requirements",
    response_model=DocumentRequirementResponse,
    status_code=status.HTTP_201_CREATED
)
def add_requirement(
    data: DocumentRequirementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr)
):
    requirement = create_requirement(db, data)

    if requirement is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document type not found"
        )

    return requirement

@router.get(
    "/my/checklist",
    response_model=list[ChecklistItemResponse]
)
def my_document_checklist(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_employee)
):
    checklist = get_employee_checklist(
        db,
        current_user.id
    )

    if checklist is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee profile not found"
        )

    return checklist

@router.get(
    "/my/submissions",
    response_model=list[DocumentResponse]
)
def my_document_submissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_employee)
):
    documents = get_my_documents(
        db,
        current_user.id
    )

    if documents is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee profile not found"
        )

    return documents

@router.post(
    "/my/upload/{document_type_id}",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED
)
async def upload_my_document(
    document_type_id: int,
    file: UploadFile = File(...),
    expiry_date: date | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_employee)
):
    employee = db.scalar(
        select(Employee).where(
            Employee.user_id == current_user.id
        )
    )

    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee profile not found"
        )

    document_type = db.get(
        DocumentType,
        document_type_id
    )

    if document_type is None or not document_type.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document type not found"
        )

    if document_type.tracks_expiry and expiry_date is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="An expiry date is required for this document type"
        )

    if expiry_date is not None and expiry_date <= date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expiry date must be in the future"
        )

    requirement = db.scalar(
        select(DocumentRequirement).where(
            DocumentRequirement.document_type_id
            == document_type_id,

            DocumentRequirement.employment_type
            == employee.employment_type.upper(),

            DocumentRequirement.is_required.is_(True)
        )
    )

    if requirement is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This document is not required for this employee"
        )

    allowed_types = {
        "application/pdf",
        "image/jpeg",
        "image/png"
    }

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF, JPEG and PNG files are allowed"
        )

    data = await file.read()

    if len(data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is empty"
        )

    max_size = 5 * 1024 * 1024

    if len(data) > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size cannot exceed 5 MB"
        )

    document = upload_employee_document(
    db=db,
    employee=employee,
    document_type=document_type,
    filename=file.filename or "document",
    content_type=file.content_type,
    file_data=data,
    user_id=current_user.id,
    expiry_date=expiry_date
    )

    if document is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A pending document already exists for this document type."
        )

    return document

@router.get(
    "/pending",
    response_model=list[HRDocumentResponse]
)
def list_pending_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr)
):
    return get_pending_documents(db)


@router.get(
    "/expiring",
    response_model=list[DocumentExpiryResponse]
)
def list_expiring_documents(
    within_days: int = 60,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr)
):
    if not 1 <= within_days <= 365:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="within_days must be between 1 and 365"
        )
    return get_expiring_documents(db, within_days)

@router.get(
    "/employee/{employee_id}",
    response_model=list[HRDocumentResponse]
)
def list_employee_documents(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr)
):
    return get_employee_documents(db, employee_id)

@router.get(
    "/{document_id}/access",
    response_model=DocumentAccessResponse
)
def access_document(
    request: Request,
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = get_document_access(
        db,
        document_id,
        current_user
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    if result is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this document"
        )

    return result

@router.get(
    "/{document_id}/download"
)
def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    document = db.get(Document, document_id)

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    result = get_document_access(
        db,
        document_id,
        current_user
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    if result is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this document"
        )

    try:
        obj = stream_object(document.object_key)
        return StreamingResponse(
            obj.stream(32 * 1024),
            media_type=document.content_type,
            headers={"Content-Disposition": f'inline; filename="{document.original_filename}"'}
        )
    except Exception as e:
        logger.exception("Failed to stream document %s: %s", document.id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve document file"
        )

@router.post(
    "/{document_id}/approve",
    response_model=DocumentResponse
)
def approve_employee_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr)
):
    document = approve_document(
        db,
        document_id,
        current_user.id
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    if document is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending documents can be approved"
        )

    return document

@router.post(
    "/{document_id}/reject",
    response_model=DocumentResponse
)
def reject_employee_document(
    document_id: int,
    data: DocumentRejectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr)
):
    document = reject_document(
        db,
        document_id,
        current_user.id,
        data.reason
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    if document is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending documents can be rejected"
        )

    return document
