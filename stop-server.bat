@echo off
setlocal
echo ==========================================
echo WCP Production Server Stopper
echo ==========================================
echo.

cd /d "%~dp0"

REM Configuration
set "PORT=3000"
set "MAX_WAIT=10"

echo Stopping WCP server on port %PORT%...
echo.

REM Method 1: Try using netstat to find the PID
set "found=0"
FOR /F "tokens=5" %%T IN ('netstat -ano ^| findstr "LISTENING" ^| findstr ":%PORT%"') DO (
    if "%%T" neq "" if "%%T" neq "0" (
        echo Found server process with PID: %%T
        taskkill /F /PID %%T >nul 2>&1
        if !errorlevel! equ 0 (
            echo [OK] Process %%T terminated successfully
        ) else (
            echo [WARN] Could not terminate process %%T (access denied?)
        )
        set "found=1"
    )
)

REM Method 2: If netstat didn't find anything, try using PowerShell Get-NetTCPConnection
if "%found%"=="0" (
    echo Trying alternative method...
    for /f "tokens=5" %%P in ('powershell -Command "Get-NetTCPConnection -LocalPort %PORT% -State Listen -ErrorAction SilentlyContinue ^| Select-Object -ExpandProperty OwningProcess" 2^>nul') do (
        if "%%P" neq "" if "%%P" neq "0" (
            echo Found server process with PID: %%P
            taskkill /F /PID %%P >nul 2>&1
            if !errorlevel! equ 0 (
                echo [OK] Process %%P terminated successfully
            )
            set "found=1"
        )
    )
)

echo.
if "%found%"=="0" (
    echo [INFO] No server process found running on port %PORT%.
    echo         The server may already be stopped.
) else (
    echo [SUCCESS] WCP server has been stopped successfully.
)

echo.
echo ==========================================
pause
