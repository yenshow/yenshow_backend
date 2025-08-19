@echo off
chcp 65001 >nul
echo ========================================
echo 正在切換到備用系統 (Windows 192.168.1.3)
echo ========================================

REM 檢查 Docker Desktop 是否運行
docker info >nul 2>&1
if errorlevel 1 (
    echo 錯誤：Docker Desktop 未運行，請先啟動 Docker Desktop
    pause
    exit /b 1
)

REM 進入專案目錄
cd /d D:\web\yenshow

REM 檢查服務是否已經在運行
docker compose ps | findstr "Up" >nul
if not errorlevel 1 (
    echo 警告：服務已經在運行中
    echo 是否要重新啟動服務？(Y/N)
    set /p choice=
    if /i "%choice%"=="Y" (
        echo 重新啟動服務...
    ) else (
        echo 取消操作
        pause
        exit /b 0
    )
)

REM 啟動備用系統
echo 啟動備用系統...
docker compose up -d

REM 等待服務啟動
echo 等待服務啟動...
timeout /t 10 /nobreak >nul

REM 檢查服務狀態
echo 檢查服務狀態...
docker compose ps

echo.
echo ========================================
echo 備用系統已啟動！
echo 請將 DNS 或負載平衡器指向 192.168.1.3
echo ========================================
pause