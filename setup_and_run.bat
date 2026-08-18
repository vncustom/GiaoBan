@echo off
title Setup Giao Ban HTV
echo ====================================================
echo    GIAO BAN HTV - Cai dat va Khoi dong
echo ====================================================
echo.

:: Kiem tra Python da cai dat chua
python --version >nul 2>&1
if errorlevel 1 (
    echo [LOI] Khong tim thay Python. Vui long cai dat Python 3.10+ truoc.
    echo Tai Python tai: https://www.python.org/downloads/
    pause
    exit
)

echo [1/3] Dang tao moi truong ao .venv_%COMPUTERNAME% ...
if exist ".venv_%COMPUTERNAME%" (
    echo Da ton tai moi truong ao. Xoa va tao moi...
    rmdir /s /q ".venv_%COMPUTERNAME%"
)
python -m venv ".venv_%COMPUTERNAME%"
if errorlevel 1 (
    echo [LOI] Khong the tao moi truong ao!
    pause
    exit
)

echo [2/3] Dang cai dat thu vien can thiet...
".venv_%COMPUTERNAME%\Scripts\pip" install -r requirements.txt --quiet
if errorlevel 1 (
    echo [LOI] Khong the cai dat thu vien!
    pause
    exit
)

echo [3/3] Dang khoi dong he thong...
echo.
echo Dang mo trinh duyet web den dia chi: http://127.0.0.1:8002 ...

:: Tu dong mo trinh duyet sau 3 giay (doi uvicorn khoi dong)
start "" cmd /c "timeout /t 3 >nul && start http://127.0.0.1:8002"

:: Khoi dong server
".venv_%COMPUTERNAME%\Scripts\python" -m uvicorn main:app --host 0.0.0.0 --port 8002 --timeout-keep-alive 30
