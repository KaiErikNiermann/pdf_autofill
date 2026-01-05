#!/bin/bash
# Build script for Linux/macOS
# Run this from the backend directory

set -e

echo "========================================"
echo " PDF Autofill Server - Build"
echo "========================================"
echo

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    exit 1
fi

echo "Python version: $(python3 --version)"
echo

# Change to backend directory
cd "$(dirname "$0")/.."

# Install build dependencies
echo "Installing build dependencies..."
pip install pyinstaller

# Install core project dependencies
echo "Installing project dependencies..."
pip install fastapi uvicorn[standard] pydantic pydantic-settings httpx openai pytesseract pdf2image pillow pymupdf

# Optional: Install deepdoctection
echo
echo "========================================"
echo " Optional: Install deepdoctection?"
echo "========================================"
echo "deepdoctection provides structure-preserving OCR but adds ~2GB of dependencies."
echo
read -p "Install deepdoctection? (y/N): " INSTALL_DD
if [[ "$INSTALL_DD" =~ ^[Yy]$ ]]; then
    echo "Installing deepdoctection and dependencies..."
    pip install deepdoctection timm transformers python-doctr
    echo "deepdoctection installed!"
else
    echo "Skipping deepdoctection. You can install it later with:"
    echo "  pip install deepdoctection timm transformers python-doctr"
fi

echo
echo "Building executable..."
python3 scripts/build_exe.py

echo
echo "========================================"
echo " Build complete!"
echo "========================================"
