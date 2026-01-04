"""API route handlers."""

from fastapi import APIRouter, HTTPException

from app.api.schemas import (
    AutofillRequest,
    AutofillResponse,
    HealthResponse,
    ProcessPdfRequest,
    ProcessPdfResponse,
)
from app.services.ai_matcher_service import ai_matcher_service
from app.services.ocr_service import ocr_service

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse(status="healthy", message="Service is running")

@router.post("/process-pdf", response_model=ProcessPdfResponse)
async def process_pdf(request: ProcessPdfRequest) -> ProcessPdfResponse:
    """
    Process a PDF and match extracted data to form fields.

    1. Extract text from PDF using OCR
    2. Use AI to match extracted data to form fields
    3. Return mappings for user confirmation
    """
    try:
        # Step 1: Extract text from PDF
        extracted_text = ocr_service.extract_text_from_pdf(request.pdf_base64)

        if not extracted_text.strip():
            return ProcessPdfResponse(
                success=False,
                mappings=[],
                error="Could not extract any text from the PDF",
            )

        # Step 2: Convert form fields to dict format for AI
        form_fields = [field.model_dump() for field in request.form_fields]

        # Step 3: Use AI to match fields (pass user's API key if provided)
        print(f"[Routes] Calling match_fields with api_key: {'sk-...' + request.openai_api_key[-4:] if request.openai_api_key else 'None'}")
        mappings = ai_matcher_service.match_fields(
            extracted_text, form_fields, api_key=request.openai_api_key
        )

        return ProcessPdfResponse(
            success=True,
            mappings=[
                {
                    "fieldId": m.get("fieldId", ""),
                    "fieldName": m.get("fieldName", ""),
                    "fieldType": m.get("fieldType", "text"),
                    "value": m.get("value", ""),
                }
                for m in mappings
            ],
            extracted_text=extracted_text[:500],  # Truncate for response
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
