@echo off
chcp 65001 >nul
echo ========================================
echo 檢查備用系統狀態
echo ========================================

cd /d D:\web\yenshow

echo Docker 服務狀態：
docker compose ps

echo.
echo 測試 API 連接：
curl -s http://localhost:4001/ping

echo.
echo 測試前端連接：
curl -s -I http://localhost:3002 | findstr "HTTP"

echo.
echo ========================================
pause