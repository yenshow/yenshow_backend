@echo off
chcp 65001 >nul
echo ========================================
echo MongoDB 資料同步腳本
echo 從 Linux VM (192.168.1.24) 同步到 Windows (192.168.1.3)
echo ========================================

set TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

echo 同步時間：%TIMESTAMP%

REM 檢查 SSH 連接
echo 檢查 SSH 連接...
ssh -o ConnectTimeout=5 yenshoweb-server@192.168.1.24 "echo SSH 連接正常" >nul 2>&1
if errorlevel 1 (
    echo 錯誤：無法連接到 Linux VM，請檢查網路連接
    pause
    exit /b 1
)

echo 正在從 Linux VM 匯出 MongoDB 資料...

REM 在 Linux VM 中匯出資料
ssh yenshoweb-server@192.168.1.24 "cd ~/yenshow_backend && sudo docker exec yenshow_backend-mongodb-1 mongodump --db yenshow --out /tmp/backup_%TIMESTAMP% --username user --password pass --authenticationDatabase admin"

REM 複製備份檔案到 VM 主機
ssh yenshoweb-server@192.168.1.24 "sudo docker cp yenshow_backend-mongodb-1:/tmp/backup_%TIMESTAMP% ~/mongodb_backup_%TIMESTAMP%"

REM 傳輸到 Windows
echo 正在傳輸資料到 Windows...
scp -r yenshoweb-server@192.168.1.24:~/mongodb_backup_%TIMESTAMP% D:\mongodb_backup_%TIMESTAMP%

REM 進入專案目錄
cd /d D:\web\yenshow

REM 停止 MongoDB 容器
echo 停止 MongoDB 容器...
docker compose stop mongodb

REM 複製備份檔案到容器
echo 還原 MongoDB 資料...
docker cp D:\mongodb_backup_%TIMESTAMP% yenshow-mongodb-1:/tmp/

REM 還原資料
docker exec yenshow-mongodb-1 mongorestore /tmp/mongodb_backup_%TIMESTAMP% --username user --password pass --authenticationDatabase admin

REM 重新啟動 MongoDB
echo 重新啟動 MongoDB...
docker compose up -d mongodb

REM 清理臨時檔案
echo 清理臨時檔案...
docker exec yenshow-mongodb-1 rm -rf /tmp/mongodb_backup_%TIMESTAMP%
ssh yenshoweb-server@192.168.1.24 "rm -rf ~/mongodb_backup_%TIMESTAMP%"
ssh yenshoweb-server@192.168.1.24 "sudo docker exec yenshow_backend-mongodb-1 rm -rf /tmp/backup_%TIMESTAMP%"

REM 驗證同步結果
echo 驗證同步結果...
docker exec yenshow-mongodb-1 mongosh --username user --password pass --authenticationDatabase admin --eval "use yenshow; print('使用者數量：' + db.users.countDocuments()); print('產品數量：' + db.products.countDocuments());"

echo.
echo ========================================
echo MongoDB 資料同步完成！
echo 備份檔案：D:\mongodb_backup_%TIMESTAMP%
echo ========================================
pause