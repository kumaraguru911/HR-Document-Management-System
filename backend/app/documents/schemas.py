from pydantic import BaseModel, Field

from datetime import datetime

from app.documents.models import DocumentStatus

class DocumentTypeCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    description: str | None = None

class DocumentTypeResponse(BaseModel):
    id: int
    name: str
    description: str | None
    is_active: bool

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