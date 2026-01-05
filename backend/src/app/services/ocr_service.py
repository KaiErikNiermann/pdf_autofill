"""OCR service for extracting text from PDFs."""

import logging
import os
import warnings

# Suppress CUDA warnings BEFORE importing anything that might import torch
# This is needed for older GPUs (like GTX 1080 Ti) that aren't supported by latest PyTorch
# Set PDF_AUTOFILL_FORCE_CPU=1 to completely disable GPU usage
if os.environ.get("PDF_AUTOFILL_FORCE_CPU", "").lower() in ("1", "true", "yes"):
    os.environ["CUDA_VISIBLE_DEVICES"] = ""

# Filter out CUDA-related warnings
warnings.filterwarnings("ignore", message=".*CUDA capability.*")
warnings.filterwarnings("ignore", message=".*not compatible with the current PyTorch.*")
warnings.filterwarnings("ignore", message=".*Please install PyTorch with.*")
warnings.filterwarnings("ignore", category=UserWarning, module="torch.cuda")

import base64
import io
import platform
import shutil
import subprocess
import tempfile
from enum import Enum
from pathlib import Path
from typing import Any

import fitz  # PyMuPDF
import pytesseract
from PIL import Image

logger = logging.getLogger(__name__)


class OCRMode(str, Enum):
    """Available OCR modes."""
    TESSERACT = "tesseract"  # Fast, basic OCR
    DEEPDOCTECTION = "deepdoctection"  # Slower, structure-preserving OCR


# Lazy-loaded deepdoctection analyzer
_dd_analyzer = None
_dd_available = None


def _find_tesseract() -> str | None:
    """Find Tesseract executable on the system."""
    # First check if it's already in PATH
    tesseract_in_path = shutil.which("tesseract")
    if tesseract_in_path:
        return tesseract_in_path
    
    system = platform.system()
    
    if system == "Windows":
        # Common Windows installation locations
        windows_paths = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            os.path.expandvars(r"%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe"),
            os.path.expandvars(r"%LOCALAPPDATA%\Tesseract-OCR\tesseract.exe"),
            # Scoop installation
            os.path.expandvars(r"%USERPROFILE%\scoop\apps\tesseract\current\tesseract.exe"),
            # Chocolatey
            r"C:\ProgramData\chocolatey\bin\tesseract.exe",
        ]
        for path in windows_paths:
            if os.path.isfile(path):
                return path
                
    elif system == "Darwin":  # macOS
        mac_paths = [
            "/usr/local/bin/tesseract",  # Homebrew Intel
            "/opt/homebrew/bin/tesseract",  # Homebrew Apple Silicon
            "/usr/bin/tesseract",
        ]
        for path in mac_paths:
            if os.path.isfile(path):
                return path
                
    else:  # Linux
        linux_paths = [
            "/usr/bin/tesseract",
            "/usr/local/bin/tesseract",
            "/snap/bin/tesseract",
        ]
        for path in linux_paths:
            if os.path.isfile(path):
                return path
    
    return None


def _configure_tesseract() -> None:
    """Configure Tesseract path if needed."""
    tesseract_path = _find_tesseract()
    
    if tesseract_path:
        pytesseract.pytesseract.tesseract_cmd = tesseract_path
        logger.info(f"Tesseract found at: {tesseract_path}")
    else:
        # Try to run tesseract anyway - it might work if in PATH
        try:
            result = subprocess.run(
                ["tesseract", "--version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                logger.info("Tesseract available in PATH")
            else:
                logger.warning("Tesseract not found. OCR may not work.")
        except Exception:
            logger.warning("Tesseract not found. OCR may not work.")
            if platform.system() == "Windows":
                logger.warning("Install Tesseract: Download from https://github.com/UB-Mannheim/tesseract/wiki")
            elif platform.system() == "Darwin":
                logger.warning("Install Tesseract: Run 'brew install tesseract'")
            else:
                logger.warning("Install Tesseract: Run 'sudo apt install tesseract-ocr'")


# Configure Tesseract on module load
_configure_tesseract()


def _suppress_cuda_warnings() -> None:
    """Suppress CUDA-related warnings for older GPUs."""
    import warnings
    warnings.filterwarnings("ignore", message=".*CUDA capability.*")
    warnings.filterwarnings("ignore", message=".*not compatible with the current PyTorch.*")
    warnings.filterwarnings("ignore", message=".*Please install PyTorch with.*")
    warnings.filterwarnings("ignore", category=UserWarning, module="torch.cuda")


def _is_deepdoctection_available() -> bool:
    """Check if deepdoctection is available."""
    global _dd_available
    if _dd_available is not None:
        return _dd_available
    
    try:
        # Suppress CUDA warnings before importing torch/deepdoctection
        _suppress_cuda_warnings()
        import deepdoctection  # noqa: F401
        _dd_available = True
        logger.info("deepdoctection is available")
    except ImportError:
        _dd_available = False
        logger.debug("deepdoctection not available - install with: poetry install --extras deepdoctection")
    
    return _dd_available


def _get_dd_analyzer() -> Any:
    """Get or create the deepdoctection analyzer (lazy initialization)."""
    global _dd_analyzer
    
    if _dd_analyzer is not None:
        return _dd_analyzer
    
    if not _is_deepdoctection_available():
        raise RuntimeError("deepdoctection is not installed")
    
    # Suppress CUDA warnings (older GPUs like GTX 1080 Ti aren't supported by latest PyTorch)
    _suppress_cuda_warnings()
    
    import deepdoctection as dd
    
    logger.info("Initializing deepdoctection analyzer (this may take a moment on first run)...")
    
    # Use the default analyzer which includes:
    # - Layout detection (using Detectron2 or RT-DETR)
    # - Table recognition
    # - OCR (using DocTR by default)
    # This gives us structure preservation without overly complex models
    # Force CPU to avoid CUDA compatibility issues with older GPUs
    _dd_analyzer = dd.get_dd_analyzer()
    
    logger.info("deepdoctection analyzer initialized")
    return _dd_analyzer


# Supported image formats for OCR
SUPPORTED_IMAGE_FORMATS = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/bmp': '.bmp',
    'image/tiff': '.tiff',
}


def _detect_file_type(data: bytes) -> str:
    """Detect file type from magic bytes."""
    # PDF magic bytes
    if data[:4] == b'%PDF':
        return 'application/pdf'
    # PNG magic bytes
    if data[:8] == b'\x89PNG\r\n\x1a\n':
        return 'image/png'
    # JPEG magic bytes
    if data[:2] == b'\xff\xd8':
        return 'image/jpeg'
    # GIF magic bytes
    if data[:6] in (b'GIF87a', b'GIF89a'):
        return 'image/gif'
    # WebP magic bytes (RIFF....WEBP)
    if data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        return 'image/webp'
    # BMP magic bytes
    if data[:2] == b'BM':
        return 'image/bmp'
    # TIFF magic bytes (little endian or big endian)
    if data[:4] in (b'II\x2a\x00', b'MM\x00\x2a'):
        return 'image/tiff'
    # Default to PDF for unknown
    return 'application/pdf'


class OCRService:
    """Service for OCR processing of PDF documents and images."""

    def __init__(self) -> None:
        """Initialize the OCR service."""
        pass

    def extract_text(
        self, file_base64: str, mode: OCRMode = OCRMode.TESSERACT, mime_type: str | None = None
    ) -> str:
        """
        Extract text from a PDF or image using OCR.

        Args:
            file_base64: Base64 encoded file data (PDF or image).
            mode: OCR mode to use (tesseract or deepdoctection).
            mime_type: Optional MIME type hint. If not provided, auto-detected.

        Returns:
            Extracted text from the file.
        """
        # Decode base64 to bytes
        file_bytes = base64.b64decode(file_base64)
        
        # Auto-detect file type if not provided
        if not mime_type:
            mime_type = _detect_file_type(file_bytes)
        
        # Route to appropriate handler
        if mime_type == 'application/pdf':
            return self._extract_from_pdf(file_bytes, mode)
        elif mime_type in SUPPORTED_IMAGE_FORMATS:
            return self._extract_from_image(file_bytes, mode)
        else:
            # Try as PDF by default
            return self._extract_from_pdf(file_bytes, mode)

    def extract_text_from_pdf(
        self, pdf_base64: str, mode: OCRMode = OCRMode.TESSERACT
    ) -> str:
        """
        Extract text from a PDF using OCR.
        
        Legacy method - calls extract_text internally.

        Args:
            pdf_base64: Base64 encoded PDF data.
            mode: OCR mode to use (tesseract or deepdoctection).

        Returns:
            Extracted text from the PDF.
        """
        return self.extract_text(pdf_base64, mode, 'application/pdf')

    def _extract_from_pdf(self, pdf_bytes: bytes, mode: OCRMode) -> str:
        """Extract text from PDF bytes."""
        # First try to extract text directly (for text-based PDFs)
        text = self._extract_text_direct(pdf_bytes)

        # If no text found, use OCR based on mode
        if not text.strip():
            if mode == OCRMode.DEEPDOCTECTION:
                text = self._extract_text_deepdoctection(pdf_bytes)
            else:
                text = self._extract_text_ocr(pdf_bytes)

        return text

    def _extract_from_image(self, image_bytes: bytes, mode: OCRMode) -> str:
        """Extract text from image bytes using OCR."""
        if mode == OCRMode.DEEPDOCTECTION:
            return self._extract_image_deepdoctection(image_bytes)
        else:
            return self._extract_image_tesseract(image_bytes)

    def _extract_image_tesseract(self, image_bytes: bytes) -> str:
        """Extract text from image using Tesseract OCR."""
        try:
            # Load image with PIL
            img: Image.Image = Image.open(io.BytesIO(image_bytes))
            # Convert to RGB if necessary (e.g., for RGBA images)
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            # Run OCR
            text: str = pytesseract.image_to_string(img)
            return text
        except Exception as e:
            logger.error(f"Tesseract image OCR failed: {e}")
            return ""

    def _extract_image_deepdoctection(self, image_bytes: bytes) -> str:
        """Extract text from image using deepdoctection."""
        if not _is_deepdoctection_available():
            logger.warning("deepdoctection not available, falling back to tesseract")
            return self._extract_image_tesseract(image_bytes)
        
        temp_file = None
        try:
            # deepdoctection needs a file path
            # Detect image format for correct extension
            mime_type = _detect_file_type(image_bytes)
            ext = SUPPORTED_IMAGE_FORMATS.get(mime_type, '.png')
            
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                tmp.write(image_bytes)
                temp_file = tmp.name
            
            analyzer = _get_dd_analyzer()
            
            # Process the image
            df = analyzer.analyze(path=temp_file)
            df.reset_state()
            
            text_parts: list[str] = []
            for page in df:
                if page.text:
                    text_parts.append(page.text)
                # Also extract table data if present
                if page.tables:
                    for table in page.tables:
                        table_text = self._table_to_text(table)
                        if table_text:
                            text_parts.append(f"\n[Table]\n{table_text}\n")
            
            return "\n".join(text_parts)
            
        except Exception as e:
            logger.error(f"deepdoctection image OCR failed: {e}")
            logger.warning("Falling back to tesseract OCR")
            return self._extract_image_tesseract(image_bytes)
        finally:
            if temp_file and Path(temp_file).exists():
                try:
                    Path(temp_file).unlink()
                except Exception:
                    pass

    def is_deepdoctection_available(self) -> bool:
        """Check if deepdoctection mode is available."""
        return _is_deepdoctection_available()
    
    @staticmethod
    def get_supported_formats() -> list[str]:
        """Get list of supported file extensions."""
        return ['.pdf'] + list(set(SUPPORTED_IMAGE_FORMATS.values()))

    def _extract_text_direct(self, pdf_bytes: bytes) -> str:
        """Extract text directly from PDF (works for text-based PDFs)."""
        text_parts: list[str] = []

        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            for page in doc:
                page_text: str = page.get_text()  # type: ignore[assignment]
                text_parts.append(page_text)
            doc.close()
        except Exception as e:
            logger.error(f"Direct text extraction failed: {e}")

        return "\n".join(text_parts)

    def _extract_text_ocr(self, pdf_bytes: bytes) -> str:
        """Extract text using OCR (for scanned/image PDFs)."""
        text_parts: list[str] = []

        try:
            # Convert PDF to images using PyMuPDF
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")

            for page_num in range(len(doc)):
                page = doc[page_num]
                # Render page to image with good resolution
                mat = fitz.Matrix(2.0, 2.0)  # 2x zoom for better OCR
                pix = page.get_pixmap(matrix=mat)

                # Convert to PIL Image
                img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)

                # Run OCR
                page_text: str = pytesseract.image_to_string(img)
                text_parts.append(page_text)

            doc.close()
        except Exception as e:
            logger.error(f"OCR extraction failed: {e}")

        return "\n".join(text_parts)

    def _extract_text_deepdoctection(self, pdf_bytes: bytes) -> str:
        """
        Extract text using deepdoctection (structure-preserving OCR).
        
        This method preserves document structure including:
        - Text blocks and their reading order
        - Tables (converted to text representation)
        - Section headers and paragraphs
        """
        if not _is_deepdoctection_available():
            logger.warning("deepdoctection not available, falling back to tesseract")
            return self._extract_text_ocr(pdf_bytes)
        
        text_parts: list[str] = []
        temp_file = None
        
        try:
            # deepdoctection needs a file path, so write to temp file
            with tempfile.NamedTemporaryFile(
                suffix=".pdf", delete=False
            ) as tmp:
                tmp.write(pdf_bytes)
                temp_file = tmp.name
            
            analyzer = _get_dd_analyzer()
            
            # Process the PDF
            df = analyzer.analyze(path=temp_file)
            df.reset_state()
            
            # Extract text from each page with structure preservation
            for page in df:
                page_text_parts: list[str] = []
                
                # Get the structured text (preserves reading order)
                page_text = page.text
                if page_text:
                    page_text_parts.append(page_text)
                
                # Also extract table data if present
                if page.tables:
                    for table in page.tables:
                        # Convert table to readable text format
                        table_text = self._table_to_text(table)
                        if table_text:
                            page_text_parts.append(f"\n[Table]\n{table_text}\n")
                
                if page_text_parts:
                    text_parts.append("\n".join(page_text_parts))
            
        except Exception as e:
            logger.error(f"deepdoctection extraction failed: {e}")
            # Fall back to tesseract
            logger.warning("Falling back to tesseract OCR")
            return self._extract_text_ocr(pdf_bytes)
        finally:
            # Clean up temp file
            if temp_file and Path(temp_file).exists():
                try:
                    Path(temp_file).unlink()
                except Exception:
                    pass
        
        return "\n\n---PAGE---\n\n".join(text_parts)
    
    def _table_to_text(self, table: Any) -> str:
        """Convert a deepdoctection table to readable text."""
        try:
            # Try to get HTML representation and simplify it
            if hasattr(table, 'html'):
                html = table.html
                if html:
                    # Simple HTML table to text conversion
                    # Remove tags but preserve structure
                    import re
                    # Replace row endings with newlines
                    text = re.sub(r'</tr>', '\n', html)
                    # Replace cell boundaries with tabs
                    text = re.sub(r'</t[dh]>', '\t', text)
                    # Remove all other HTML tags
                    text = re.sub(r'<[^>]+>', '', text)
                    # Clean up whitespace
                    text = '\n'.join(line.strip() for line in text.split('\n') if line.strip())
                    return text
            
            # Fallback: try to get text directly
            if hasattr(table, 'text'):
                return table.text or ""
                
        except Exception as e:
            logger.error(f"Table conversion failed: {e}")
        
        return ""

    def extract_structured_data(self, text: str) -> dict[str, Any]:
        """
        Try to extract structured data from text.

        This is a simple heuristic extraction. The AI matching
        will do the heavy lifting.
        """
        lines = text.split("\n")
        data: dict[str, Any] = {"raw_text": text, "lines": []}

        for line in lines:
            line = line.strip()
            if line:
                data["lines"].append(line)

        return data


# Singleton instance
ocr_service = OCRService()
