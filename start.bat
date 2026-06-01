@echo off
chcp 65001 >nul
title 自动发薪系统 - 启动程序

echo ========================================
echo         自动发薪系统 - 本地启动
echo ========================================
echo.

if not exist "node_modules\" (
    echo [1/3] 正在安装 Node.js 依赖...
    call npm install
) else (
    echo [1/3] Node 测试依赖已存在，跳过安装。 (如需强更请删除 node_modules 目录)
)

echo [2/3] 正在启动主节点...
echo [3/3] 稍后浏览器将自动打开地址（默认为 http://localhost:3000）
echo ----------------------------------------
echo 提示：如果要关闭服务，请直接关闭本窗口或按 Ctrl+C。
echo ----------------------------------------

call npm run dev
pause
