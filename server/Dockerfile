FROM node:20-alpine

WORKDIR /app

# 使用 package.json 作為緩存依據
COPY package*.json ./
RUN npm ci --only=production

# 複製應用代碼
COPY . .

# 建立檔案儲存目錄 和 上傳暫存目錄
RUN mkdir -p /app/storage/products /app/storage/temp /app/uploads
RUN chmod -R 755 /app/storage /app/uploads

# 健康檢查
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/ping || exit 1

# 環境變數配置
ENV PORT=4000
ENV FILES_ROOT=/app/storage

# 暴露API端口
EXPOSE 4000

# 啟動命令
CMD ["node", "app.js"] 