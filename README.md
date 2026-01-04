# PDF Autofill

A Chrome extension for automating PDF form filling, powered by a Python backend.

## Project Structure

```
pdf_autofill/
├── extension/          # Chrome extension (TypeScript)
│   ├── src/            # TypeScript source files
│   ├── styles/         # CSS styles
│   ├── icons/          # Extension icons
│   ├── manifest.json   # Extension manifest
│   └── popup.html      # Popup UI
│
├── backend/            # Python backend (FastAPI + Poetry)
│   ├── src/app/        # Application source
│   ├── tests/          # Test suite
│   └── pyproject.toml  # Poetry configuration
│
└── README.md           # This file
```

## Getting Started

### Backend Setup

1. Navigate to the backend directory:

```bash
cd backend
```

2. Install dependencies with Poetry:

```bash
poetry install
```

3. Start the development server:

```bash
poetry run uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`.

### Extension Setup

1. Navigate to the extension directory:

```bash
cd extension
```

2. Install dependencies:

```bash
npm install
```

3. Build the TypeScript:

```bash
npm run build
```

4. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension` folder

## Development

### Extension Development

```bash
cd extension
npm run watch  # Watch mode for TypeScript compilation
```

### Backend Development

```bash
cd backend
poetry run uvicorn app.main:app --reload  # Auto-reload on changes
```

### Running Tests

Backend tests:

```bash
cd backend
poetry run pytest
```

## Tech Stack

- **Extension**: TypeScript, Chrome Extension Manifest V3
- **Backend**: Python 3.13, FastAPI, Poetry, Pydantic

## License

MIT
