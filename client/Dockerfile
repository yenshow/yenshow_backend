# 建置階段
FROM node:18-alpine AS build-stage

WORKDIR /app

# 安裝所需工具（僅在需要編譯原生模組時需要）
RUN apk add --no-cache git

# 接收額外的構建參數
ARG VITE_API_URL
ARG VITE_API
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_API=${VITE_API}

# 複製 package*.json 檔案
COPY package*.json ./

# 安裝相依套件
RUN npm ci || npm install

# 複製專案檔案（確保包括 public 目錄）
COPY . .

# 構建應用
RUN export NODE_OPTIONS="--max-old-space-size=4096" && npm run build

# 生產階段
FROM nginx:stable-alpine

# 從構建階段複製編譯好的文件
COPY --from=build-stage /app/dist /usr/share/nginx/html

# 複製 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 創建存儲掛載點
RUN mkdir -p /mnt/storage

# 暴露 80 端口
EXPOSE 80

# 啟動 Nginx
CMD ["nginx", "-g", "daemon off;"] 