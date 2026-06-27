@echo off
title Aegis Core System

echo ==============================================================
echo                 Aegis Core System
echo ==============================================================

echo Installing dependencies...
call npm install

echo Starting system...
cmd /k "npm run dev"
