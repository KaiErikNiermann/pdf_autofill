"""AI service for matching PDF data to form fields."""

import json
import logging

from openai import OpenAI, AuthenticationError, APIConnectionError, RateLimitError

from app.core.config import settings

logger = logging.getLogger(__name__)


class AIMatcherService:
    """Service for AI-powered field matching."""

    def __init__(self) -> None:
        """Initialize the AI service."""
        self.default_client: OpenAI | None = None
        if settings.openai_api_key:
            self.default_client = OpenAI(api_key=settings.openai_api_key)

    def _get_client(self, api_key: str | None = None) -> OpenAI:
        """Get OpenAI client, using provided key or falling back to default."""
        # Clean the API key (remove any whitespace/newlines that might have been copied)
        if api_key:
            api_key = api_key.strip()
        
        logger.debug("_get_client called with api_key: %s", f"sk-...{api_key[-4:]}" if api_key else "None")
        logger.debug("API key length: %d", len(api_key) if api_key else 0)
        
        if api_key:
            logger.debug("Creating new OpenAI client with user-provided key")
            return OpenAI(api_key=api_key)
        if self.default_client:
            logger.debug("Using default client from settings")
            return self.default_client
        raise ValueError(
            "No OpenAI API key configured. Please provide your API key in the extension settings."
        )

    def match_fields(
        self,
        extracted_text: str,
        form_fields: list[dict[str, str]],
        api_key: str | None = None,
    ) -> list[dict[str, str]]:
        """
        Use GPT to match extracted PDF text to form fields.

        Args:
            extracted_text: Text extracted from the PDF via OCR.
            form_fields: List of form field definitions from the page.
            api_key: Optional user-provided OpenAI API key.

        Returns:
            List of field mappings with values.

        Raises:
            ValueError: If no API key is available or key is invalid.
            ConnectionError: If unable to connect to OpenAI.
            RuntimeError: If rate limited by OpenAI.
        """
        client = self._get_client(api_key)

        # Build the prompt with enhanced field descriptions
        fields_for_prompt: list[dict[str, object]] = []
        for field in form_fields:
            field_desc: dict[str, object] = {
                "id": field.get("id"),
                "name": field.get("name"),
                "label": field.get("label"),
                "type": field.get("type"),
                "placeholder": field.get("placeholder"),
            }
            # Include options if available
            if field.get("options"):
                field_desc["availableOptions"] = field.get("options")
            fields_for_prompt.append(field_desc)
        
        fields_description = json.dumps(fields_for_prompt, indent=2)

        prompt = f"""You are a form-filling assistant. I have extracted text from a PDF document and need to fill in a web form.

## Extracted PDF Text:
{extracted_text}

## Form Fields to Fill:
{fields_description}

## Task:
Analyze the PDF text and determine the best value for each form field based on semantic matching.
For each field, find the most appropriate value from the PDF text.

Return a JSON array with this structure:
[
  {{
    "fieldId": "the field id",
    "fieldName": "human readable field name/label",
    "fieldType": "the field type",
    "value": "the extracted value to fill, or empty string if no match"
  }}
]

## CRITICAL RULES:

### Translation & Semantic Matching:
- The PDF and form may be in DIFFERENT LANGUAGES. You MUST match by MEANING, not literal text.
- If a field has "availableOptions", you MUST return a value that EXACTLY matches one of those options.
- Translate PDF content to match the form's language when selecting from options.

### Examples of translation matching:
- PDF says "Männlich" (German for male) → select "Male" from options ["Male", "Female", "Other"]
- PDF says "États-Unis" (French) → select "United States" from country options
- PDF says "Geburtsdatum: 15.03.1990" → return "1990-03-15" for a date field
- PDF says "Homme" (French for man) → select "Male" from gender options
- PDF says "Deutschland" → select "Germany" from country options

### For fields WITH availableOptions:
1. Find the semantic/translated match between PDF content and available options
2. Return the EXACT text of the matching option (copy it exactly as shown in availableOptions)
3. If no option matches semantically, return empty string

### For fields WITHOUT availableOptions (free text):
- Extract the appropriate value directly from the PDF
- Format dates as YYYY-MM-DD
- For names, look for name patterns
- For emails, look for email patterns
- For phones, look for phone number patterns

### General:
- Only return valid JSON array, no other text
- Return empty string for value if no good match exists

JSON Response:"""

        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful assistant that extracts and matches form data. You excel at cross-language matching - translating content to find the correct option. Always respond with valid JSON only.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.1,
                max_tokens=2000,
            )

            content = response.choices[0].message.content
            if not content:
                return self._empty_mappings(form_fields)

            # Parse the JSON response
            # Clean up response if needed
            content = content.strip()
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

            mappings = json.loads(content)
            return mappings  # type: ignore[no-any-return]

        except AuthenticationError as e:
            logger.error("OpenAI AuthenticationError: %s", e)
            raise ValueError(
                "Invalid OpenAI API key. Please check your API key and try again."
            ) from e
        except APIConnectionError as e:
            logger.error("OpenAI APIConnectionError: %s", e)
            raise ConnectionError(
                "Unable to connect to OpenAI. Please check your internet connection."
            ) from e
        except RateLimitError as e:
            logger.warning("OpenAI RateLimitError: %s", e)
            raise RuntimeError(
                "OpenAI rate limit exceeded. Please wait a moment and try again."
            ) from e
        except json.JSONDecodeError as e:
            logger.warning("JSON parsing error from AI response: %s", e)
            return self._empty_mappings(form_fields)
        except Exception as e:
            logger.exception("Unexpected error in AI matching: %s", e)
            raise RuntimeError(f"AI processing failed: {e!s}") from e

    def _empty_mappings(
        self, form_fields: list[dict[str, str]]
    ) -> list[dict[str, str]]:
        """Return empty mappings for all fields."""
        return [
            {
                "fieldId": f.get("id", ""),
                "fieldName": f.get("label") or f.get("name", ""),
                "fieldType": f.get("type", "text"),
                "value": "",
            }
            for f in form_fields
        ]


# Singleton instance
ai_matcher_service = AIMatcherService()
