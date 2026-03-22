@echo off
echo ==========================================
echo WCP Production Server Launcher
echo ==========================================
echo.

REM Change to the script's directory (where the app is installed)
cd /d "%~dp0"

REM Set Production Environment
set NODE_ENV=production
set PORT=3000

echo Configuration:
echo - Environment: Production
echo - Port: 3000
echo - Working Directory: %CD%
echo.

REM Check if production build exists
IF NOT EXIST ".next\standalone\server.js" (
    echo [ERROR] Production build not found!
    echo.
    echo Please run the following command first:
    echo   npm run build
    echo.
    pause
    exit /b 1
)

echo [1/2] Starting Production Server...
echo.

REM Start the production server in a new window
start "WCP Production Server" cmd /k "title WCP Production Server ^&^ bun run start"

REM Wait for server to initialize
echo [2/2] Waiting for server to initialize...
timeout /t 10 >nul

echo.
echo ==========================================
echo Server Started Successfully!
echo ==========================================
echo.
echo The WCP application is now running in production mode.
echo Access the application at: http://localhost:3000
echo.
echo To stop the server, run: stop-server.bat
echo.
timeout /t 5 >nul
