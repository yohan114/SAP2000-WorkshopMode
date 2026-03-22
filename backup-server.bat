@echo off
setlocal
echo ==========================================
echo   SAP2000 SERVER BACKUP UTILITY
echo ==========================================

cd /d "%~dp0"

:: Use wmic to get reliable timestamp (YYYYMMDD_HHMMSS)
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set "TIMESTAMP=%datetime:~0,4%%datetime:~4,2%%datetime:~6,2%_%datetime:~8,2%%datetime:~10,2%%datetime:~12,2%"
set "BACKUP_DIR=backups\backup_%TIMESTAMP%"

echo.
echo Creating backup directory: %BACKUP_DIR%
mkdir "%BACKUP_DIR%" 2>nul

echo.
echo [1/3] Backing up Database...
if exist "prisma\dev.db" (
    mkdir "%BACKUP_DIR%\prisma" 2>nul
    copy "prisma\dev.db" "%BACKUP_DIR%\prisma\dev.db" >nul
    echo   - prisma\dev.db copied.
) else (
    echo   - No prisma\dev.db found.
)

echo.
echo [2/3] Backing up Uploads...
if exist "upload" (
    xcopy "upload\*" "%BACKUP_DIR%\upload\" /E /I /H /Y /C /Q >nul
    echo   - upload directory copied.
) else (
    echo   - No upload directory found.
)

echo.
echo [3/3] Backing up DB folder...
if exist "db" (
    xcopy "db\*" "%BACKUP_DIR%\db\" /E /I /H /Y /C /Q >nul
    echo   - db directory copied.
) else (
    echo   - No db directory found.
)

echo.
echo ==========================================
echo Backup completed successfully!
echo Backup Location: %cd%\%BACKUP_DIR%
echo ==========================================
pause
