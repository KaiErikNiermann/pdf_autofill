# PyInstaller spec file for PDF Autofill Server
# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller specification file for building the PDF Autofill Server.

This file can be used directly with PyInstaller:
    pyinstaller pdf_autofill_server.spec

Or use the build script:
    python scripts/build_exe.py
"""

import sys
from pathlib import Path

# Project root
PROJECT_ROOT = Path(SPECPATH)
SRC_DIR = PROJECT_ROOT / "src"

block_cipher = None

# Hidden imports required for the application
hidden_imports = [
    # FastAPI and web framework
    "fastapi",
    "starlette",
    "starlette.middleware",
    "starlette.middleware.cors",
    "starlette.routing",
    "starlette.responses",
    "starlette.requests",
    "uvicorn",
    "uvicorn.logging",
    "uvicorn.loops",
    "uvicorn.loops.auto",
    "uvicorn.protocols",
    "uvicorn.protocols.http",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.http.h11_impl",
    "uvicorn.protocols.http.httptools_impl",
    "uvicorn.protocols.websockets",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.lifespan",
    "uvicorn.lifespan.on",
    # Pydantic
    "pydantic",
    "pydantic_settings",
    "pydantic.deprecated.decorator",
    "pydantic_core",
    "annotated_types",
    # HTTP clients
    "httpx",
    "httpcore",
    "h11",
    "anyio",
    "anyio._backends",
    "anyio._backends._asyncio",
    "sniffio",
    "certifi",
    # OpenAI
    "openai",
    "openai.resources",
    "openai.resources.chat",
    "openai.resources.chat.completions",
    "openai._client",
    "openai._base_client",
    "distro",
    # Image processing
    "PIL",
    "PIL.Image",
    "PIL.ImageFilter",
    "pytesseract",
    "pdf2image",
    "pdf2image.pdf2image",
    "fitz",
    # Encoding/JSON
    "json",
    "base64",
    "email",
    "email.mime",
    "email.mime.text",
    "email.mime.multipart",
    # Async support
    "multiprocessing",
    "concurrent",
    "concurrent.futures",
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

a = Analysis(
    [str(PROJECT_ROOT / "run_server.py")],
    pathex=[str(SRC_DIR)],
    binaries=[],
    datas=[],
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        "tkinter",
        "matplotlib",
        "numpy.testing",
        "scipy",
        "pandas",
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="pdf-autofill-server",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,  # Show console for server output
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,  # Add icon path here if desired
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="pdf-autofill-server",
)
