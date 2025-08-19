#!/bin/bash
chcp 65001 >nul
echo "========================================"
echo "Linux VM 系統更新腳本"
echo "========================================"

# 進入專案目錄
cd ~/yenshow_backend

# 檢查 Git 狀態
echo "檢查 Git 狀態..."
git status

# 拉取最新程式碼
echo "拉取最新程式碼..."
git pull origin main

# 檢查是否有更新
if [ $? -eq 0 ]; then
    echo "程式碼更新成功，重新建置服務..."
    
    # 重新建置服務
    sudo docker compose build
    
    # 重新啟動服務
    sudo docker compose up -d
    
    # 檢查服務狀態
    echo "檢查服務狀態..."
    sudo docker compose ps
    
    echo "========================================"
    echo "更新完成！"
    echo "========================================"
else
    echo "更新失敗，請檢查 Git 狀態"
    exit 1
fi