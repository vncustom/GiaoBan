@echo off
title Giao Ban HTV
echo Dang khoi dong He thong Giao Ban HTV...
:: Kiem tra moi truong ao
if not exist ".venv_%COMPUTERNAME%" (
    echo [THONG BAO] Chua co moi truong ao .venv_%COMPUTERNAME%. Dang chuyen sang setup_and_run.bat...
    call setup_and_run.bat
    exit
)

".venv_%COMPUTERNAME%\Scripts\python" --version >nul 2>&1
if errorlevel 1 (
    echo [THONG BAO] Moi truong ao bi loi - dang cai dat lai...
    call setup_and_run.bat
    exit
)

echo Dang mo trinh duyet web den dia chi: http://127.0.0.1:8002 ...

:: Tu dong mo trinh duyet sau 2 giay
start "" cmd /c "timeout /t 2 >nul && start http://127.0.0.1:8002"

:: Khoi dong server FastAPI (lang nghe tren 0.0.0.0 de cac may khac trong mang LAN truy cap)
".venv_%COMPUTERNAME%\Scripts\python" -m uvicorn main:app --host 0.0.0.0 --port 8002 --timeout-keep-alive 30
