"""Pydantic schemas for API request/response models."""

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class OCRMode(str, Enum):
    """Available OCR modes."""
    TESSERACT = "tesseract"  # Fast, basic OCR
    DEEPDOCTECTION = "deepdoctection"  # Slower, structure-preserving OCR


class HealthResponse(BaseModel):
    """Health check response model."""

    status: str = Field(..., description="Service status")
    message: str = Field(..., description="Status message")


class AutofillRequest(BaseModel):
    """Autofill request model."""

    url: str | None = Field(None, description="URL of the page with the form")
    form_id: str | None = Field(None, description="Identifier for a specific form")
    fields: list[str] | None = Field(
        None, description="List of field selectors to fill"
    )


class AutofillResponse(BaseModel):
    """Autofill response model."""

    success: bool = Field(..., description="Whether the request was successful")
    data: dict[str, str] = Field(
        default_factory=dict,
        description="Map of field selectors to values",
    )
    message: str | None = Field(None, description="Optional message")


class FormField(BaseModel):
    """Individual form field model."""

    selector: str = Field(..., description="CSS selector for the field")
    label: str | None = Field(None, description="Human-readable label")
    field_type: str = Field(
        "text", description="Type of field (text, email, date, etc.)"
    )
    required: bool = Field(False, description="Whether the field is required")


class FormTemplate(BaseModel):
    """Form template model."""

    id: str = Field(..., description="Unique template identifier")
    name: str = Field(..., description="Template name")
    description: str | None = Field(None, description="Template description")
    fields: list[FormField] = Field(default_factory=list, description="Form fields")


# PDF Processing schemas
class FormFieldInput(BaseModel):
    """Form field from the frontend."""

    id: str = Field(..., description="Field ID")
    name: str = Field(..., description="Field name")
    type: str = Field(..., description="Field type (text, email, etc.)")
    label: str = Field("", description="Field label")
    placeholder: str = Field("", description="Placeholder text")
    selector: str = Field(..., description="CSS selector")
    options: list[str] | None = Field(
        None, description="Available options for select/radio/searchable fields"
    )


class ProcessFileRequest(BaseModel):
    """Request to process a file (PDF or image) and match to form fields."""

    file_base64: str = Field(..., description="Base64 encoded file (PDF or image)")
    mime_type: str | None = Field(
        None,
        description="MIME type of the file. If not provided, auto-detected.",
    )
    form_fields: list[FormFieldInput] = Field(
        ..., description="Form fields from the page"
    )
    openai_api_key: str | None = Field(
        None, description="User-provided OpenAI API key (optional)"
    )
    ocr_mode: OCRMode = Field(
        OCRMode.TESSERACT,
        description="OCR mode: 'tesseract' (fast) or 'deepdoctection' (accurate)",
    )


# Alias for backwards compatibility
class ProcessPdfRequest(ProcessFileRequest):
    """Request to process a PDF and match to form fields. Alias for ProcessFileRequest."""

    # Allow both 'file_base64' and legacy 'pdf_base64'
    pdf_base64: str | None = Field(None, description="Legacy: Base64 encoded PDF file")

    def model_post_init(self, __context: Any) -> None:
        """Handle legacy pdf_base64 field."""
        if self.pdf_base64 and not self.file_base64:
            object.__setattr__(self, 'file_base64', self.pdf_base64)


class FieldMapping(BaseModel):
    """A mapping from a form field to an extracted value."""

    fieldId: str = Field(..., description="The form field ID")
    fieldName: str = Field(..., description="Human readable field name")
    fieldType: str = Field(..., description="The field type")
    value: str = Field("", description="The extracted value to fill")


class ProcessPdfResponse(BaseModel):
    """Response from PDF processing."""

    success: bool = Field(..., description="Whether processing succeeded")
    mappings: list[FieldMapping] = Field(
        default_factory=list, description="Field to value mappings"
    )
    extracted_text: str | None = Field(None, description="Raw extracted text")
    error: str | None = Field(None, description="Error message if failed")


class OCRCapabilitiesResponse(BaseModel):
    """Response with available OCR capabilities."""

    tesseract_available: bool = Field(
        ..., description="Whether Tesseract OCR is available"
    )
    deepdoctection_available: bool = Field(
        ..., description="Whether deepdoctection is available"
    )
    default_mode: OCRMode = Field(..., description="The default OCR mode")
    supported_formats: list[str] = Field(
        default_factory=lambda: [".pdf", ".png", ".jpg", ".webp", ".gif", ".bmp", ".tiff"],
        description="Supported file extensions",
    )
