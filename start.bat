@echo off
title Auto Process - Start

echo ========================================
echo         Auto Process - Local Start
echo ========================================
echo.

if not exist "node_modules\.bin\tsx" (
    echo [1/3] Installing Node.js dependencies...
    call npm install
) else (
    echo [1/3] Node dependencies found, skipping install.
)

echo [2/3] Starting Express server...
echo [3/3] The backend (Python) will be launched automatically.
echo ----------------------------------------
echo Hint: To stop the service, close this window or press Ctrl+C.
echo ----------------------------------------

call npm run dev
pause
