# PDF Autofill Backend

Backend service for the PDF Autofill browser extension.

## Requirements

### Development
- Python 3.13+
- Poetry
- Tesseract OCR
- Poppler (for pdf2image)
- (Optional) deepdoctection for advanced OCR

### Production (Windows Executable)
- Tesseract OCR installed and in PATH
- No Python required (bundled in executable)

## Setup

1. Install dependencies:

```bash
poetry install
```

2. (Optional) Install deepdoctection for structure-preserving OCR:

```bash
poetry install --extras deepdoctection
# Or with pip:
pip install deepdoctection timm transformers python-doctr
```

3. Copy the environment file and configure:

```bash
cp .env.example .env
```

4. Run the development server:

```bash
poetry run uvicorn app.main:app --reload
```

## OCR Modes

The backend supports two OCR modes:

### Tesseract (Default)
- **Speed**: Fast
- **Best for**: Clean, simple documents
- **Dependencies**: Tesseract OCR

### deepdoctection (Optional)
- **Speed**: Slower (uses deep learning models)
- **Best for**: Complex layouts, tables, multi-column documents
- **Dependencies**: ~2GB additional packages (PyTorch, transformers, etc.)
- **Features**: 
  - Document layout analysis
  - Table detection and extraction
  - Reading order preservation

## Building Windows Executable

Build a standalone Windows executable that users can run without installing Python:

### Quick Build

```bash
# Windows
scripts\build.bat

# Linux/macOS (for testing the build script)
./scripts/build.sh
```

### Manual Build

```bash
# Install PyInstaller
pip install pyinstaller

# Run the build script
python scripts/build_exe.py
```

### Build Output

The build creates:
- `dist/pdf-autofill-server/` - Directory with executable and dependencies
- `dist/pdf-autofill-server-{version}-{os}-{arch}.zip` - Distributable package

### GitHub Actions Release

Push a version tag to automatically build and create a release:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Or trigger manually from the Actions tab with a version number.

## Development

### Running Tests

```bash
poetry run pytest
```

With coverage:

```bash
poetry run pytest --cov=app --cov-report=html
```

### Linting & Formatting

```bash
# Format code
poetry run black src tests

# Lint code
poetry run ruff check src tests

# Type checking
poetry run mypy src
```

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/ocr-capabilities` - Get available OCR modes
- `POST /api/process-pdf` - Process PDF and match to form fields
- `POST /api/autofill` - Get autofill data for a form
- `GET /api/forms` - List available form templates

## Project Structure

```
backend/
├── src/
│   └── app/
│       ├── api/           # API routes and schemas
│       ├── core/          # Configuration and utilities
│       └── services/      # Business logic
├── scripts/
│   ├── build_exe.py       # PyInstaller build script
│   ├── build.bat          # Windows build helper
│   ├── build.sh           # Linux/macOS build helper
│   └── sync_deps.py       # Dependency sync tool
├── tests/                 # Test suite
├── pyproject.toml         # Poetry configuration
├── pdf_autofill_server.spec  # PyInstaller spec file
└── .env.example           # Environment template
```
