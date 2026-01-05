@echo off
setlocal enabledelayedexpansion

REM Build script for Windows
REM Can be run from anywhere - will auto-detect paths

echo ========================================
echo  PDF Autofill Server - Windows Build
echo ========================================
echo.

REM Get the directory where this script is located
set "SCRIPT_DIR=%~dp0"
REM Remove trailing backslash
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
REM Go to parent directory (backend)
cd /d "%SCRIPT_DIR%\.."
set "BACKEND_DIR=%CD%"

echo Working directory: %BACKEND_DIR%
echo.

REM Required Python version
set "REQUIRED_MAJOR=3"
set "REQUIRED_MINOR=11"

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo Python is not installed. Installing Python %REQUIRED_MAJOR%.%REQUIRED_MINOR%...
    call :install_python
    if errorlevel 1 (
        echo ERROR: Could not install Python automatically.
        echo Please install Python %REQUIRED_MAJOR%.%REQUIRED_MINOR%+ from https://www.python.org/downloads/
        pause
        exit /b 1
    )
    REM Re-check after installation
    python --version >nul 2>&1
    if errorlevel 1 (
        echo ERROR: Python still not found after installation.
        echo Please restart this script or add Python to your PATH.
        pause
        exit /b 1
    )
)

REM Check Python version (need 3.11+)
echo Checking Python version...
for /f "tokens=2 delims= " %%v in ('python --version 2^>^&1') do set PYVER=%%v
for /f "tokens=1,2 delims=." %%a in ("%PYVER%") do (
    set PYMAJOR=%%a
    set PYMINOR=%%b
)
echo Found Python %PYVER%

set "NEED_UPGRADE=0"
if %PYMAJOR% LSS %REQUIRED_MAJOR% set "NEED_UPGRADE=1"
if %PYMAJOR% EQU %REQUIRED_MAJOR% if %PYMINOR% LSS %REQUIRED_MINOR% set "NEED_UPGRADE=1"

if "%NEED_UPGRADE%"=="1" (
    echo.
    echo Python %PYVER% is too old. Need Python %REQUIRED_MAJOR%.%REQUIRED_MINOR%+
    echo Attempting to upgrade Python...
    call :install_python
    if errorlevel 1 (
        echo.
        echo ERROR: Could not upgrade Python automatically.
        echo Please install Python %REQUIRED_MAJOR%.%REQUIRED_MINOR%+ manually from:
        echo https://www.python.org/downloads/
        pause
        exit /b 1
    )
    
    REM Check version again
    for /f "tokens=2 delims= " %%v in ('python --version 2^>^&1') do set PYVER=%%v
    for /f "tokens=1,2 delims=." %%a in ("%PYVER%") do (
        set PYMAJOR=%%a
        set PYMINOR=%%b
    )
    echo Now using Python !PYVER!
    
    if !PYMAJOR! LSS %REQUIRED_MAJOR% (
        echo ERROR: Python upgrade failed. Please install manually.
        pause
        exit /b 1
    )
    if !PYMAJOR! EQU %REQUIRED_MAJOR% if !PYMINOR! LSS %REQUIRED_MINOR% (
        echo ERROR: Python upgrade failed. Please install manually.
        pause
        exit /b 1
    )
)

echo Python %PYVER% OK!
echo.

REM Check/Install Tesseract OCR
echo Checking for Tesseract OCR...
where tesseract >nul 2>&1
if errorlevel 1 (
    REM Check if installed in default location even if not in PATH
    if exist "C:\Program Files\Tesseract-OCR\tesseract.exe" (
        echo Tesseract found in default location but not in PATH!
        set "PATH=%PATH%;C:\Program Files\Tesseract-OCR"
        echo Added to PATH for this session.
        "C:\Program Files\Tesseract-OCR\tesseract.exe" --version 2>&1 | findstr /R "^tesseract"
    ) else if exist "C:\Program Files (x86)\Tesseract-OCR\tesseract.exe" (
        echo Tesseract found in default location but not in PATH!
        set "PATH=%PATH%;C:\Program Files (x86)\Tesseract-OCR"
        echo Added to PATH for this session.
        "C:\Program Files (x86)\Tesseract-OCR\tesseract.exe" --version 2>&1 | findstr /R "^tesseract"
    ) else (
        echo Tesseract not found. Attempting to install...
        call :install_tesseract
        if errorlevel 1 (
            echo.
            echo WARNING: Could not auto-install Tesseract.
            echo Please install manually from:
            echo https://github.com/UB-Mannheim/tesseract/wiki
            echo.
            echo The application will still work if Tesseract is installed,
            echo as the code will auto-detect it.
            pause
        )
    )
) else (
    echo Tesseract found!
    tesseract --version 2>&1 | findstr /R "^tesseract"
)

echo.

REM Check for Poppler (pdf2image dependency)
echo Checking for Poppler...
where pdftoppm >nul 2>&1
if errorlevel 1 (
    echo Poppler not found. Attempting to install...
    call :install_poppler
    if errorlevel 1 (
        echo.
        echo WARNING: Could not auto-install Poppler.
        echo You may need to install it manually for PDF processing.
        echo.
    )
) else (
    echo Poppler found!
)

echo.

REM Install Python build dependencies
echo Installing Python build dependencies...
pip install pyinstaller

REM Install project dependencies directly with pip (skip Poetry for compatibility)
echo Installing project dependencies...
pip install fastapi uvicorn[standard] pydantic pydantic-settings httpx openai pytesseract pdf2image pillow pymupdf

REM Optional: Install deepdoctection for advanced OCR (heavy dependencies)
echo.
echo ========================================
echo  Optional: Install deepdoctection?
echo ========================================
echo deepdoctection provides structure-preserving OCR but adds ~2GB of dependencies.
echo.
set /p INSTALL_DD="Install deepdoctection? (y/N): "
if /i "%INSTALL_DD%"=="y" (
    echo Installing deepdoctection and dependencies...
    pip install deepdoctection timm transformers python-doctr
    echo deepdoctection installed!
) else (
    echo Skipping deepdoctection. You can install it later with:
    echo   pip install deepdoctection timm transformers python-doctr
)

echo.
echo Building executable...
python "%BACKEND_DIR%\scripts\build_exe.py"

if errorlevel 1 (
    echo.
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Build complete!
echo ========================================
echo.
echo Output: %BACKEND_DIR%\dist\pdf-autofill-server\
pause
exit /b 0

REM ========================================
REM  Helper Functions
REM ========================================

:install_tesseract
REM Try to install via winget (Windows 10+)
where winget >nul 2>&1
if not errorlevel 1 (
    echo Installing Tesseract via winget...
    winget install --id UB-Mannheim.TesseractOCR -e --accept-source-agreements --accept-package-agreements
    if not errorlevel 1 (
        REM Add to PATH for this session
        set "PATH=%PATH%;C:\Program Files\Tesseract-OCR"
        echo Tesseract installed successfully!
        exit /b 0
    )
)

REM Try chocolatey
where choco >nul 2>&1
if not errorlevel 1 (
    echo Installing Tesseract via Chocolatey...
    choco install tesseract -y
    if not errorlevel 1 (
        set "PATH=%PATH%;C:\Program Files\Tesseract-OCR"
        echo Tesseract installed successfully!
        exit /b 0
    )
)

REM Try scoop
where scoop >nul 2>&1
if not errorlevel 1 (
    echo Installing Tesseract via Scoop...
    scoop install tesseract
    if not errorlevel 1 (
        echo Tesseract installed successfully!
        exit /b 0
    )
)

REM Manual download fallback
echo.
echo No package manager found. Downloading Tesseract installer...
set "TESSERACT_URL=https://digi.bib.uni-mannheim.de/tesseract/tesseract-ocr-w64-setup-5.3.3.20231005.exe"
set "TESSERACT_INSTALLER=%TEMP%\tesseract-installer.exe"

REM Try PowerShell download
powershell -Command "& {Invoke-WebRequest -Uri '%TESSERACT_URL%' -OutFile '%TESSERACT_INSTALLER%'}" 2>nul
if exist "%TESSERACT_INSTALLER%" (
    echo.
    echo Tesseract installer downloaded.
    echo Please complete the installation wizard that will open.
    echo IMPORTANT: Check "Add to PATH" during installation!
    echo.
    start /wait "" "%TESSERACT_INSTALLER%"
    del "%TESSERACT_INSTALLER%" 2>nul
    
    REM Refresh PATH
    set "PATH=%PATH%;C:\Program Files\Tesseract-OCR"
    
    where tesseract >nul 2>&1
    if not errorlevel 1 (
        echo Tesseract installed successfully!
        exit /b 0
    )
)

exit /b 1

:install_poppler
REM Try to install via winget
where winget >nul 2>&1
if not errorlevel 1 (
    echo Installing Poppler via winget...
    winget install --id poppler -e --accept-source-agreements --accept-package-agreements 2>nul
    if not errorlevel 1 (
        exit /b 0
    )
)

REM Try chocolatey
where choco >nul 2>&1
if not errorlevel 1 (
    echo Installing Poppler via Chocolatey...
    choco install poppler -y
    if not errorlevel 1 (
        exit /b 0
    )
)

REM Try scoop
where scoop >nul 2>&1
if not errorlevel 1 (
    echo Installing Poppler via Scoop...
    scoop install poppler
    if not errorlevel 1 (
        exit /b 0
    )
)

exit /b 1

:install_python
echo.
echo ========================================
echo  Installing Python %REQUIRED_MAJOR%.%REQUIRED_MINOR%
echo ========================================
echo.

REM Try winget first (Windows 10/11)
where winget >nul 2>&1
if not errorlevel 1 (
    echo Installing Python via winget...
    winget install --id Python.Python.%REQUIRED_MAJOR%.%REQUIRED_MINOR% -e --accept-source-agreements --accept-package-agreements
    if not errorlevel 1 (
        echo.
        echo Python installed! Refreshing PATH...
        call :refresh_path
        exit /b 0
    )
)

REM Try chocolatey
where choco >nul 2>&1
if not errorlevel 1 (
    echo Installing Python via Chocolatey...
    choco install python311 -y
    if not errorlevel 1 (
        call :refresh_path
        exit /b 0
    )
)

REM Try scoop
where scoop >nul 2>&1
if not errorlevel 1 (
    echo Installing Python via Scoop...
    scoop install python
    if not errorlevel 1 (
        exit /b 0
    )
)

REM Manual download fallback
echo.
echo No package manager found. Downloading Python installer...
set "PYTHON_URL=https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe"
set "PYTHON_INSTALLER=%TEMP%\python-installer.exe"

REM Download with PowerShell
echo Downloading from %PYTHON_URL%...
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%PYTHON_URL%' -OutFile '%PYTHON_INSTALLER%'}" 2>nul

if exist "%PYTHON_INSTALLER%" (
    echo.
    echo Running Python installer...
    echo This will install Python %REQUIRED_MAJOR%.%REQUIRED_MINOR% with the following options:
    echo   - Install for all users
    echo   - Add Python to PATH
    echo   - Include pip
    echo.
    
    REM Silent install with PATH
    "%PYTHON_INSTALLER%" /quiet InstallAllUsers=1 PrependPath=1 Include_pip=1 Include_test=0
    
    if errorlevel 1 (
        REM If silent install fails, try interactive
        echo Silent install failed. Opening interactive installer...
        echo Please select "Add Python to PATH" during installation!
        start /wait "" "%PYTHON_INSTALLER%"
    )
    
    del "%PYTHON_INSTALLER%" 2>nul
    
    REM Refresh PATH
    call :refresh_path
    
    REM Verify installation
    python --version >nul 2>&1
    if not errorlevel 1 (
        echo Python installed successfully!
        exit /b 0
    )
    
    REM Try common install locations
    if exist "C:\Program Files\Python311\python.exe" (
        set "PATH=C:\Program Files\Python311;C:\Program Files\Python311\Scripts;%PATH%"
        echo Python installed successfully!
        exit /b 0
    )
    if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
        set "PATH=%LOCALAPPDATA%\Programs\Python\Python311;%LOCALAPPDATA%\Programs\Python\Python311\Scripts;%PATH%"
        echo Python installed successfully!
        exit /b 0
    )
)

exit /b 1

:refresh_path
REM Refresh PATH from registry to pick up new installations
echo Refreshing PATH environment...
for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "SYSPATH=%%b"
for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "USERPATH=%%b"
set "PATH=%SYSPATH%;%USERPATH%"
exit /b 0