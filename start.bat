@echo off
chcp 65001 >nul
title Aegis Core System

echo ==============================================================
echo                 Aegis Core System
echo ==============================================================

echo 正在安装依赖...
call npm install

echo 正在启动系统...
cmd /k "npm run dev"
