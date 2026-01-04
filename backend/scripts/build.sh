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

echo
echo "Building executable..."
python3 scripts/build_exe.py

echo
echo "========================================"
echo " Build complete!"
echo "========================================"
