@echo off
title Aegis Core Launcher
echo ==========================================
echo    Initializing Aegis Core System...
echo ==========================================

echo.
echo [1/3] Installing Node.js dependencies...
call npm install

echo.
echo [2/3] Installing Python dependencies...
cd backend
call pip install -r requirements.txt
cd ..

echo.
echo [3/3] Starting Frontend and Python Backend...
echo (Please do not close this window)
call npm run start:local

pause
