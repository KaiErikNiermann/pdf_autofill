#!/usr/bin/env python3
"""Build script for creating Windows executable using PyInstaller."""

from __future__ import annotations  # Enable modern type hints on Python 3.7+

import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path

# Check Python version
if sys.version_info < (3, 9):
    print("=" * 50)
    print("  WARNING: Python 3.9+ is recommended")
    print(f"  You have Python {sys.version_info.major}.{sys.version_info.minor}")
    print("=" * 50)
    print()
    if sys.version_info < (3, 7):
        print("ERROR: Python 3.7+ is required. Please upgrade Python.")
        print("Download from: https://www.python.org/downloads/")
        sys.exit(1)

# Project paths
PROJECT_ROOT = Path(__file__).parent.parent
SRC_DIR = PROJECT_ROOT / "src"
DIST_DIR = PROJECT_ROOT / "dist"
BUILD_DIR = PROJECT_ROOT / "build"
SPEC_FILE = PROJECT_ROOT / "pdf_autofill_server.spec"

APP_NAME = "pdf-autofill-server"
APP_VERSION = "1.0.0"


def clean_build_dirs() -> None:
    """Clean previous build artifacts."""
    print("🧹 Cleaning previous builds...")
    for dir_path in [DIST_DIR, BUILD_DIR]:
        if dir_path.exists():
            shutil.rmtree(dir_path)
    if SPEC_FILE.exists():
        SPEC_FILE.unlink()


def install_build_deps() -> None:
    """Install build dependencies."""
    print("📦 Installing build dependencies...")
    subprocess.run(
        [sys.executable, "-m", "pip", "install", "pyinstaller"],
        check=True,
    )


def create_entry_point() -> Path:
    """Create a standalone entry point script for PyInstaller."""
    entry_point = PROJECT_ROOT / "run_server.py"
    entry_point.write_text('''\
#!/usr/bin/env python3
"""Entry point for PDF Autofill Server executable."""

import multiprocessing
import sys
import os

# Ensure the src directory is in path
if getattr(sys, 'frozen', False):
    # Running as compiled executable
    app_dir = os.path.dirname(sys.executable)
else:
    app_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, os.path.join(app_dir, 'src'))

def main() -> None:
    """Run the server."""
    # Required for Windows multiprocessing with PyInstaller
    multiprocessing.freeze_support()
    
    import uvicorn
    from app.main import app
    from app.core.config import settings
    
    print("=" * 50)
    print("  PDF Autofill Server")
    print("=" * 50)
    print(f"  Starting server at http://localhost:{settings.port}")
    print("  Press Ctrl+C to stop")
    print("=" * 50)
    print()
    
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=settings.port,
        log_level="info",
    )


if __name__ == "__main__":
    main()
''')
    return entry_point


def get_hidden_imports() -> list[str]:
    """Get list of hidden imports for PyInstaller."""
    imports = [
        # FastAPI and dependencies
        "fastapi",
        "starlette",
        "starlette.middleware",
        "starlette.middleware.cors",
        "starlette.routing",
        "uvicorn",
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.websockets",
        "uvicorn.protocols.websockets.auto",
        "uvicorn.lifespan",
        "uvicorn.lifespan.on",
        # Pydantic
        "pydantic",
        "pydantic_settings",
        "pydantic.deprecated.decorator",
        "pydantic_core",
        # HTTP clients
        "httpx",
        "httpcore",
        "h11",
        "anyio",
        "sniffio",
        # OpenAI
        "openai",
        "openai.resources",
        "openai._client",
        # Image processing
        "PIL",
        "PIL.Image",
        "pytesseract",
        "pdf2image",
        "pdf2image.pdf2image",
        "fitz",  # PyMuPDF
        # Standard library extras
        "multiprocessing",
        "email.mime.text",
        "email.mime.multipart",
        # App modules
        "app",
        "app.main",
        "app.api",
        "app.api.routes",
        "app.api.schemas",
        "app.core",
        "app.core.config",
        "app.services",
        "app.services.ai_matcher_service",
        "app.services.ocr_service",
    ]
    
    # Optional: Add deepdoctection imports if installed
    try:
        import deepdoctection  # noqa: F401
        imports.extend([
            "deepdoctection",
            "deepdoctection.pipe",
            "deepdoctection.datapoint",
            "deepdoctection.extern",
            "deepdoctection.mapper",
            "timm",
            "transformers",
            "doctr",
            "doctr.models",
            "doctr.io",
            "torch",
            "torchvision",
        ])
        print("Including deepdoctection in build")
    except ImportError:
        print("deepdoctection not installed - skipping in build")
    
    return imports


def get_data_files() -> list[tuple[str, str]]:
    """Get data files to include."""
    data_files: list[tuple[str, str]] = []
    
    # Include .env.example if it exists
    env_example = PROJECT_ROOT / ".env.example"
    if env_example.exists():
        data_files.append((str(env_example), "."))
    
    return data_files


def build_executable() -> None:
    """Build the executable using PyInstaller."""
    print("🔨 Building executable...")
    
    entry_point = create_entry_point()
    hidden_imports = get_hidden_imports()
    data_files = get_data_files()
    
    # Build PyInstaller command
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--name", APP_NAME,
        "--onedir",  # Create a directory with executable + deps
        "--console",  # Show console window for server output
        "--noconfirm",  # Overwrite without asking
        "--clean",  # Clean cache before building
        f"--distpath={DIST_DIR}",
        f"--workpath={BUILD_DIR}",
        f"--specpath={PROJECT_ROOT}",
        # Add src to path
        f"--paths={SRC_DIR}",
    ]
    
    # Add hidden imports
    for imp in hidden_imports:
        cmd.extend(["--hidden-import", imp])
    
    # Add data files
    for src, dst in data_files:
        cmd.extend(["--add-data", f"{src}{os.pathsep}{dst}"])
    
    # Entry point
    cmd.append(str(entry_point))
    
    # Run PyInstaller
    print(f"Running: {' '.join(cmd[:10])}...")
    subprocess.run(cmd, check=True, cwd=PROJECT_ROOT)
    
    # Clean up entry point
    entry_point.unlink()
    
    print(f"✅ Executable built: {DIST_DIR / APP_NAME}")


def create_readme() -> None:
    """Create a README for the distribution."""
    readme_path = DIST_DIR / APP_NAME / "README.txt"
    readme_path.write_text(f"""\
PDF Autofill Server v{APP_VERSION}
================================

QUICK START
-----------
1. Double-click 'pdf-autofill-server.exe' to start the server
2. The server will run at http://localhost:8000
3. Install the browser extension and start using PDF Autofill!

CONFIGURATION
-------------
Create a '.env' file in this directory to configure the server:

    OPENAI_API_KEY=sk-your-key-here  (optional - can set in extension)
    PORT=8000
    DEBUG=false

REQUIREMENTS
------------
- Tesseract OCR must be installed for PDF text extraction
  Download from: https://github.com/UB-Mannheim/tesseract/wiki
  
- Poppler (for pdf2image) - included in some distributions
  Or download from: https://github.com/osber/poppler-windows/releases

TROUBLESHOOTING
---------------
- If the server doesn't start, check if port 8000 is already in use
- Make sure Tesseract is installed and in your PATH
- Check the console output for error messages

SUPPORT
-------
Report issues at: https://github.com/your-repo/pdf-autofill/issues
""")


def create_batch_launcher() -> None:
    """Create a batch file launcher for Windows."""
    batch_path = DIST_DIR / APP_NAME / "Start Server.bat"
    batch_path.write_text(f"""\
@echo off
title PDF Autofill Server
cd /d "%~dp0"
echo Starting PDF Autofill Server...
echo.
"{APP_NAME}.exe"
pause
""")


def create_zip_package() -> Path:
    """Create a ZIP package for distribution."""
    print("📦 Creating ZIP package...")
    
    system = platform.system().lower()
    arch = platform.machine().lower()
    if arch in ("amd64", "x86_64"):
        arch = "x64"
    elif arch in ("arm64", "aarch64"):
        arch = "arm64"
    
    zip_name = f"{APP_NAME}-{APP_VERSION}-{system}-{arch}"
    zip_path = DIST_DIR / zip_name
    
    shutil.make_archive(
        str(zip_path),
        'zip',
        DIST_DIR,
        APP_NAME,
    )
    
    print(f"✅ ZIP package created: {zip_path}.zip")
    return Path(f"{zip_path}.zip")


def main() -> None:
    """Main build process."""
    print(f"🚀 Building {APP_NAME} v{APP_VERSION}")
    print(f"   Platform: {platform.system()} {platform.machine()}")
    print()
    
    clean_build_dirs()
    install_build_deps()
    build_executable()
    create_readme()
    create_batch_launcher()
    zip_path = create_zip_package()
    
    print()
    print("=" * 50)
    print("✅ Build complete!")
    print(f"   Executable: {DIST_DIR / APP_NAME / f'{APP_NAME}.exe'}")
    print(f"   Package: {zip_path}")
    print("=" * 50)


if __name__ == "__main__":
    main()
