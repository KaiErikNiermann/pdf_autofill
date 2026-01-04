# PDF Autofill Backend

Backend service for the PDF Autofill browser extension.

## Requirements

### Development
- Python 3.13+
- Poetry
- Tesseract OCR
- Poppler (for pdf2image)

### Production (Windows Executable)
- Tesseract OCR installed and in PATH
- No Python required (bundled in executable)

## Setup

1. Install dependencies:

```bash
poetry install
```

2. Copy the environment file and configure:

```bash
cp .env.example .env
```

3. Run the development server:

```bash
poetry run uvicorn app.main:app --reload
```

Or using the shortcut:

```bash
poetry run python -m app.main
```

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
│   └── build.sh           # Linux/macOS build helper
├── tests/                 # Test suite
├── pyproject.toml         # Poetry configuration
├── pdf_autofill_server.spec  # PyInstaller spec file
└── .env.example           # Environment template
```
