@echo off
chcp 65001 >nul
echo ========================================
echo 定時同步腳本
echo 每小時執行一次 MongoDB 同步
echo 按 Ctrl+C 停止定時同步
echo ========================================

:loop
echo 執行時間：%date% %time%
call sync_mongodb.bat

echo 等待 1 小時後再次同步...
timeout /t 3600 /nobreak >nul
goto loop