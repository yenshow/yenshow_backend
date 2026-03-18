# BA 系統授權管理文件

> 最後更新：2026-03-18

---

## 1. 系統概述

集中式授權平台，部署在 `api.yenshow.com`（Cloudflare Tunnel），管理 BA 系統的功能模組授權。**買斷制，無到期日。**

### 架構

```
授權管理平台 (api.yenshow.com)
│
├── 後台管理面板 (client/)
│   ├── 建立授權 → 指定客戶 + features
│   ├── 審核 → 自動生成 SN / LK
│   ├── 編輯 features（追加 / 移除模組）
│   └── 狀態管理 / 停用
│
├── 公開 API (/api/license/*)
│   ├── activate        — 線上啟用（BA 後端呼叫）
│   ├── check-status    — 心跳 / 狀態查詢
│   ├── offline-activate — 離線啟用（產生簽名回應檔）
│   ├── offline-refresh  — 離線更新（features 變更後重簽回應檔）
│   └── offline-verify   — 離線驗簽
│
└── 離線授權頁面 (yenshow.com/license/activate)
    ├── 啟用模式 — 上傳請求檔 → 下載回應檔
    └── 更新模式 — 輸入 SN → 下載最新回應檔
```

---

## 2. 名詞定義

| 名詞 | 說明 |
|------|------|
| **SN (Serial Number)** | 審核時自動生成，格式 `SN-YYYYMMDD-XXXX` |
| **LK (License Key)** | 審核時自動生成，格式 `XXXX-XXXX-XXXX-XXXX`（SHA256 hash） |
| **Features** | 功能模組陣列，決定 BA 系統可使用哪些功能 |
| **設備指紋** | 離線授權時客戶端提供，用於綁定設備 |
| **請求檔** | 離線設備產生的 JSON 檔案（含 SN + deviceFingerprint） |
| **回應檔** | 伺服器簽名的 JSON 檔案（含授權資訊 + features + HMAC-SHA256 簽名） |

---

## 3. Feature Keys

| Feature Key | 中文名稱 | BA 系統對應路由 |
|-------------|----------|----------------|
| `people_counting` | 人流計數 | `/construction-monitoring/people-counting/*` |
| `lighting` | 燈控管理 | `/infrastructure/lighting/*` |
| `environment` | 環境監測 | `/construction-monitoring/environment/*` |
| `surveillance` | 影像監控 | `/construction-monitoring/surveillance/*` |
| `vehicle_access` | 車輛門禁 | `/construction-monitoring/vehicle-access/*` |

---

## 4. 主要程式位置

| 檔案 | 用途 |
|------|------|
| `models/License.js` | Mongoose 資料模型 |
| `controllers/user/admin.js` | 後台管理 API（CRUD、審核、features 編輯） |
| `controllers/common/licenseController.js` | 公開授權 API（啟用、驗證、離線、刷新） |
| `routes/license.js` | 公開路由定義 |
| `routes/users.js` | 後台路由定義 |
| `utils/licenseSign.js` | HMAC-SHA256 離線簽名 / 驗簽 |

---

## 5. 資料模型 (License)

```javascript
{
  product:           "BA-system",     // 固定值
  features:          [String],        // enum: people_counting, lighting, environment, surveillance, vehicle_access
  customerName:      String,          // 客戶名稱（必填）
  serialNumber:      String,          // 審核時自動生成（partial unique index）
  licenseKey:        String,          // 審核時自動生成（partial unique index）
  status:            String,          // pending | available | active | inactive
  applicant:         String,          // 申請人（必填）
  appliedAt:         Date,            // 申請時間
  reviewer:          String,          // 審核人
  reviewedAt:        Date,            // 審核時間
  usedAt:            Date,            // 啟用時間（不為 null 時拒絕再次啟用）
  deviceFingerprint: String,          // 設備指紋（離線授權綁定）
  activationMethod:  String,          // "online" | "offline" | null
  notes:             String           // 備註
}
```

---

## 6. 授權狀態機

```
pending ──（審核通過）──▶ available ──（啟用）──▶ active
   │                        │                      │
   ▼                        ▼                      ▼
 （刪除）               （刪除）               inactive
                                              （管理員停用）
```

| 狀態 | 說明 | 可執行操作 |
|------|------|------------|
| `pending` | 審核中 | 審核通過 / 刪除 |
| `available` | 可啟用（已生成 SN/LK） | 線上啟用 / 離線啟用 / 刪除 |
| `active` | 使用中 | 編輯 features / 停用 / 離線刷新 |
| `inactive` | 已停用 | 重新啟用 |

---

## 7. 後台管理 API

基礎路徑：`/api/users/licenses`（需登入 + 管理員權限）

### 建立授權

```
POST /api/users/licenses
{
  "features": ["people_counting", "lighting", "environment"],
  "customerName": "台北營造",
  "applicant": "王小明",
  "notes": "2026 Q1 訂單"
}
```

### 審核授權

```
PATCH /api/users/licenses/:id/review
```

### 更新授權（含 features 編輯）

```
PUT /api/users/licenses/:id
{
  "features": ["people_counting", "lighting", "environment", "surveillance"],
  "status": "active",
  "notes": "追加影像監控模組"
}
```

### 刪除授權

```
DELETE /api/users/licenses/:id
```

---

## 8. 公開授權 API

基礎路徑：`/api/license`（無需登入，有速率限制）

### 8.1 線上啟用（BA 後端呼叫）

```
POST /api/license/activate
{ "serialNumber": "SN-20260318-1234" }
```

回應含 `features`，BA 後端儲存到本地：

```json
{
  "result": {
    "serialNumber": "SN-20260318-1234",
    "licenseKey": "A1B2-C3D4-E5F6-G7H8",
    "product": "BA-system",
    "features": ["people_counting", "lighting", "environment"],
    "status": "active",
    "customerName": "台北營造",
    "usedAt": "2026-03-18T10:00:00.000Z"
  }
}
```

### 8.2 檢查授權狀態（心跳）

```
POST /api/license/check-status
{ "serialNumber": "SN-20260318-1234" }
```

回傳含最新 `features`。線上 BA 設備定期呼叫即可自動同步 features 變更。

### 8.3 離線啟用

```
POST /api/license/offline-activate
{
  "serialNumber": "SN-20260318-1234",
  "deviceFingerprint": "ABC123-DEF456",
  "nonce": "random-string"
}
```

回傳簽名回應檔（含 features）。

### 8.4 離線刷新（features 變更後重簽）

```
POST /api/license/offline-refresh
{
  "serialNumber": "SN-20260318-1234",
  "deviceFingerprint": "ABC123-DEF456"
}
```

- 僅適用 `active` 狀態的授權
- 不改變授權狀態，只產生包含最新 features 的新簽名回應檔
- 回應檔多一個 `refreshedAt` 欄位

### 8.5 離線驗簽

```
POST /api/license/offline-verify
// body = 回應檔完整內容（含 signature）
```

---

## 9. 簽名機制

- 演算法：HMAC-SHA256
- 密鑰：`LICENSE_SIGN_SECRET` 環境變數
- 流程：payload 所有欄位（不含 signature）按 key 字母排序 → JSON.stringify → HMAC-SHA256
- 驗簽：使用 `crypto.timingSafeEqual` 防止 timing attack
- 工具：`utils/licenseSign.js`

---

## 10. 完整流程

### 10.1 新客戶啟用（線上）

```
1. 後台建立授權 → 選擇 features → pending
2. 管理員審核 → 自動生成 SN/LK → available
3. 將 SN 交付客戶
4. BA 後端 POST /api/license/activate { serialNumber }
5. 取回 features → 存本地 → active
6. requireFeature(key) 依本地 features 保護路由
```

### 10.2 新客戶啟用（離線）

```
1. 後台建立 + 審核 → available
2. BA 離線設備產生請求檔（SN + deviceFingerprint）
3. 操作人員到 yenshow.com/license/activate
4. 上傳請求檔 → 下載回應檔（含 features + 簽名）
5. 帶回設備匯入 → 驗簽 → 取出 features → 存本地
```

### 10.3 追加功能模組（features 變更）

```
1. 後台編輯授權 → 勾選新的 features → 儲存
2a. 線上設備：下次 check-status 自動取得最新 features（無需額外操作）
2b. 離線設備：
    → 到 yenshow.com/license/activate「更新授權」模式
    → 輸入 SN → 下載新的回應檔
    → 帶回設備匯入 → 驗簽 → 更新本地 features
```

### 10.4 停用客戶

```
1. 後台將狀態改為 inactive
2. 線上設備：下次 check-status 收到 inactive → 停止服務
3. 離線設備：需手動處理，或等下次連線同步
```

---

## 11. BA 系統端實作指引

### 後端

| 項目 | 說明 |
|------|------|
| `POST /api/license/activate` | admin 輸入 SN → 呼叫授權平台 API → 儲存 features 到本地 |
| `GET /api/license` | 回傳本地儲存的 features 狀態 |
| `requireFeature(key)` | Express middleware，未授權回 403 `FEATURE_NOT_LICENSED` |
| `LICENSE_OPEN_ALL_FEATURES` | 開發開關，設為 `true` 時跳過授權檢查 |
| 離線匯入 | 讀取回應檔 → 驗 HMAC-SHA256 簽名 → 取出 features → 存本地 |

### 前端

| 項目 | 說明 |
|------|------|
| `hasFeature(key)` | 路由守衛，未授權導回首頁 |
| UI 鎖頭 | 未授權模組顯示鎖頭，點擊 toast 提示 |
| admin 啟用頁 | 輸入 SN（線上）/ 匯入回應檔（離線） |
| `NUXT_PUBLIC_LICENSE_OPEN_ALL_FEATURES` | 前端開發開關 |

---

## 12. 速率限制

| API | 限制類型 |
|-----|----------|
| `/api/license/activate` | 一般限流 |
| `/api/license/check-status` | 一般限流 |
| `/api/license/validate` | 嚴格限流 |
| `/api/license/get-license-key` | 一般限流 |
| `/api/license/offline-activate` | 嚴格限流 |
| `/api/license/offline-refresh` | 嚴格限流 |
| `/api/license/offline-verify` | 嚴格限流 |

---

## 13. 部署設定

### 環境變數

| 變數 | 用途 | 位置 |
|------|------|------|
| `LICENSE_SIGN_SECRET` | HMAC-SHA256 密鑰 | server/.env、根目錄 .env、docker-compose.yml |

### Docker Compose

```yaml
backend:
  environment:
    - LICENSE_SIGN_SECRET=${LICENSE_SIGN_SECRET}
```

### 安全注意事項

- `LICENSE_SIGN_SECRET` 需部署到授權平台伺服器 **和** BA 離線設備
- 切勿提交密鑰到 Git
- 建議定期輪換密鑰（需同步更新所有離線設備）
