from pydantic import BaseModel, Field

from datetime import date, datetime

from app.documents.models import DocumentCategory, DocumentStatus

class DocumentTypeCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    description: str | None = None
    tracks_expiry: bool = False
    category: DocumentCategory = DocumentCategory.ONBOARDING

class DocumentTypeResponse(BaseModel):
    id: int
    name: str
    description: str | None
    is_active: bool
    tracks_expiry: bool
    category: DocumentCategory

    model_config = {
        "from_attributes": True
    }

class DocumentRequirementCreate(BaseModel):
    document_type_id: int
    employment_type: str
    is_required: bool = True

class DocumentRequirementResponse(BaseModel):
    id: int
    document_type_id: int
    employment_type: str
    is_required: bool

    model_config = {
        "from_attributes": True
    }

class ChecklistItemResponse(BaseModel):
    document_type_id: int
    name: str
    description: str | None
    required: bool
    status: str
    tracks_expiry: bool

class DocumentResponse(BaseModel):
    id: int
    employee_id: int
    document_type_id: int
    original_filename: str
    content_type: str
    file_size: int
    status: DocumentStatus
    uploaded_at: datetime
    rejection_reason: str | None
    expiry_date: date | None

    model_config = {
        "from_attributes": True
    }

class HRDocumentResponse(BaseModel):
    id: int

    employee_id: int
    employee_code: str
    employee_name: str

    document_type_id: int
    document_type_name: str

    original_filename: str
    content_type: str
    file_size: int

    status: DocumentStatus
    uploaded_at: datetime

    rejection_reason: str | None
    expiry_date: date | None

class DocumentExpiryResponse(HRDocumentResponse):
    days_until_expiry: int


class EmployeeVaultDocumentResponse(BaseModel):
    id: int
    document_type_name: str
    category: DocumentCategory
    original_filename: str
    uploaded_at: datetime
    file_size: int


class HRVaultDocumentResponse(EmployeeVaultDocumentResponse):
    employee_id: int
    employee_name: str

class DocumentRejectRequest(BaseModel):
    reason: str = Field(
        min_length=3,
        max_length=500
    )

class DocumentAccessResponse(BaseModel):
    document_id: int
    filename: str
    content_type: str
    url: str
    expires_in: int
