"""API route handlers."""

import logging

from fastapi import APIRouter, HTTPException

from app.api.schemas import (
    AutofillRequest,
    AutofillResponse,
    FieldMapping,
    HealthResponse,
    OCRCapabilitiesResponse,
    OCRMode,
    ProcessPdfRequest,
    ProcessPdfResponse,
)
from app.services.ai_matcher_service import ai_matcher_service
from app.services.ocr_service import OCRMode as ServiceOCRMode
from app.services.ocr_service import ocr_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse(status="healthy", message="Service is running")


@router.get("/ocr-capabilities", response_model=OCRCapabilitiesResponse)
async def get_ocr_capabilities() -> OCRCapabilitiesResponse:
    """Get available OCR capabilities."""
    dd_available = ocr_service.is_deepdoctection_available()
    return OCRCapabilitiesResponse(
        tesseract_available=True,  # Tesseract is always the fallback
        deepdoctection_available=dd_available,
        default_mode=OCRMode.TESSERACT,
        supported_formats=ocr_service.get_supported_formats(),
    )

@router.post("/process-pdf", response_model=ProcessPdfResponse)
async def process_pdf(request: ProcessPdfRequest) -> ProcessPdfResponse:
    """
    Process one or more PDFs/images and match extracted data to form fields.

    1. Extract text from file(s) using OCR
    2. Concatenate text from multiple files with filename annotations
    3. Use AI to match extracted data to form fields
    4. Return mappings for user confirmation
    """
    try:
        # Convert schema OCRMode to service OCRMode
        service_mode = ServiceOCRMode(request.ocr_mode.value)
        
        extracted_texts: list[str] = []
        
        # Check if we have multiple files
        if request.files and len(request.files) > 0:
            logger.info("Processing %d files", len(request.files))
            for file_input in request.files:
                file_text = ocr_service.extract_text(
                    file_input.file_base64,
                    mode=service_mode,
                    mime_type=file_input.mime_type,
                )
                if file_text.strip():
                    # Annotate with filename
                    annotated_text = f"--- Content from: {file_input.file_name} ---\n{file_text}"
                    extracted_texts.append(annotated_text)
                    logger.debug("Extracted %d chars from %s", len(file_text), file_input.file_name)
        else:
            # Single file (legacy support)
            file_data = request.file_base64 or request.pdf_base64
            if not file_data:
                return ProcessPdfResponse(
                    success=False,
                    mappings=[],
                    extracted_text=None,
                    error="No file data provided",
                )
            
            file_text = ocr_service.extract_text(
                file_data, mode=service_mode, mime_type=request.mime_type
            )
            if file_text.strip():
                extracted_texts.append(file_text)
        
        # Combine all extracted text
        extracted_text = "\n\n".join(extracted_texts)

        if not extracted_text.strip():
            return ProcessPdfResponse(
                success=False,
                mappings=[],
                extracted_text=None,
                error="Could not extract any text from the file(s)",
            )

        # Step 2: Convert form fields to dict format for AI
        form_fields = [field.model_dump() for field in request.form_fields]

        # Step 3: Use AI to match fields (pass user's API key if provided)
        logger.debug("Calling match_fields with api_key: %s", f"sk-...{request.openai_api_key[-4:]}" if request.openai_api_key else "None")
        mappings = ai_matcher_service.match_fields(
            extracted_text, form_fields, api_key=request.openai_api_key
        )

        return ProcessPdfResponse(
            success=True,
            mappings=[
                FieldMapping(
                    fieldId=m.get("fieldId", ""),
                    fieldName=m.get("fieldName", ""),
                    fieldType=m.get("fieldType", "text"),
                    value=m.get("value", ""),
                )
                for m in mappings
            ],
            extracted_text=extracted_text[:500],
            error=None,
        )

    except ValueError as e:
        # Configuration/authentication errors (e.g., missing or invalid API key)
        raise HTTPException(status_code=401, detail=str(e)) from e
    except ConnectionError as e:
        # Network connectivity issues
        raise HTTPException(status_code=503, detail=str(e)) from e
    except RuntimeError as e:
        # Rate limiting or other runtime errors
        raise HTTPException(status_code=429, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {e!s}") from e
