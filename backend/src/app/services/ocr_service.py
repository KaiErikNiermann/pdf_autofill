"""OCR service for extracting text from PDFs."""

import base64
import io
import os
import platform
import shutil
import subprocess
from typing import Any

import fitz  # PyMuPDF
import pytesseract
from PIL import Image


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
        print(f"Tesseract found at: {tesseract_path}")
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
                print("Tesseract available in PATH")
            else:
                print("WARNING: Tesseract not found. OCR may not work.")
        except Exception:
            print("WARNING: Tesseract not found. OCR may not work.")
            print("Install Tesseract:")
            if platform.system() == "Windows":
                print("  - Download from: https://github.com/UB-Mannheim/tesseract/wiki")
            elif platform.system() == "Darwin":
                print("  - Run: brew install tesseract")
            else:
                print("  - Run: sudo apt install tesseract-ocr")


# Configure Tesseract on module load
_configure_tesseract()


class OCRService:
    """Service for OCR processing of PDF documents."""

    def __init__(self) -> None:
        """Initialize the OCR service."""
        pass

    def extract_text_from_pdf(self, pdf_base64: str) -> str:
        """
        Extract text from a PDF using OCR.

        Args:
            pdf_base64: Base64 encoded PDF data.

        Returns:
            Extracted text from the PDF.
        """
        # Decode base64 to bytes
        pdf_bytes = base64.b64decode(pdf_base64)

        # First try to extract text directly (for text-based PDFs)
        text = self._extract_text_direct(pdf_bytes)

        # If no text found, use OCR
        if not text.strip():
            text = self._extract_text_ocr(pdf_bytes)

        return text

    def _extract_text_direct(self, pdf_bytes: bytes) -> str:
        """Extract text directly from PDF (works for text-based PDFs)."""
        text_parts: list[str] = []

        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            for page in doc:  # type: ignore
                text_parts.append(page.get_text())  # type: ignore
            doc.close()
        except Exception as e:
            print(f"Direct text extraction failed: {e}")

        return "\n".join(text_parts)

    def _extract_text_ocr(self, pdf_bytes: bytes) -> str:
        """Extract text using OCR (for scanned/image PDFs)."""
        text_parts: list[str] = []

        try:
            # Convert PDF to images using PyMuPDF
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")

            for page_num in range(len(doc)):
                page = doc[page_num]  # type: ignore
                # Render page to image with good resolution
                mat = fitz.Matrix(2.0, 2.0)  # 2x zoom for better OCR
                pix = page.get_pixmap(matrix=mat)  # type: ignore

                # Convert to PIL Image
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)  # type: ignore

                # Run OCR
                page_text = pytesseract.image_to_string(img)  # type: ignore
                text_parts.append(page_text)  # type: ignore

            doc.close()
        except Exception as e:
            print(f"OCR extraction failed: {e}")

        return "\n".join(text_parts)

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
