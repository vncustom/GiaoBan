@echo off
title GiaoBanHTV Service
echo Dang cho he thong khoi dong hoan toan (15 giay)...
ping 127.0.0.1 -n 15 >nul

echo Dang khoi dong app GiaoBan...
cd /d "%~dp0"

:: Tat cac tien trinh cu dang chiem port 8001
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8002 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1

set PYTHON_CMD=python

if exist ".venv_%COMPUTERNAME%\Scripts\python.exe" (
    set PYTHON_CMD=".venv_%COMPUTERNAME%\Scripts\python.exe"
) else if exist ".venv_PHTL-KTWEB\Scripts\python.exe" (
    set PYTHON_CMD=".venv_PHTL-KTWEB\Scripts\python.exe"
) else if exist ".venv\Scripts\python.exe" (
    set PYTHON_CMD=".venv\Scripts\python.exe"
)

%PYTHON_CMD% -m uvicorn main:app --host 0.0.0.0 --port 8002 --timeout-keep-alive 30
