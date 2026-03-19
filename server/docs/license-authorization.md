# BA 系統授權平台 — 技術文件

> 最後更新：2026-03-19

## 1. 系統概覽

本平台為 **BA（Building Automation）系統** 提供 **買斷制、功能模組授權**。
一張授權對應一組 SN / LK，授權可包含多個功能模組（Feature Keys）。

### 核心特性

| 項目 | 說明 |
|------|------|
| 產品 | BA-system（唯一） |
| 計費模式 | 買斷制（無到期日） |
| 授權粒度 | 以功能模組（Feature）為單位 |
| 啟用方式 | 線上（BA 後端 → 平台 API）或 離線（請求檔/回應檔） |

### 可授權功能模組

| 值 | 說明 |
|----|------|
| `people_counting` | 人流計數 |
| `lighting` | 燈控管理 |
| `environment` | 環境監測 |
| `surveillance` | 影像監控 |
| `vehicle_access` | 車輛門禁 |

---

## 2. 狀態機

```
pending ──(審核)──→ available ──(啟用)──→ active ──(停用)──→ inactive
```

| 狀態 | 說明 | 可執行動作 |
|------|------|-----------|
| `pending` | 申請已送出，等待管理員審核 | 審核 → available |
| `available` | 已審核並產生 SN / LK，可被啟用 | 啟用（線上或離線） |
| `active` | 已啟用，正常使用中 | check-status 同步、離線刷新、停用 → inactive |
| `inactive` | 已停用（管理員操作） | 管理員可透過 updateLicense 改回 active/available |

---

## 3. 資料模型（License Schema）

| 欄位 | 類型 | 說明 |
|------|------|------|
| `product` | String | 固定 `"BA-system"` |
| `features` | [String] | 授權功能模組陣列 |
| `customerName` | String | 客戶名稱（必填） |
| `serialNumber` | String | 審核時自動產生（`SN-YYYYMMDD-XXXX`） |
| `licenseKey` | String | 審核時自動產生（`XXXX-XXXX-XXXX-XXXX`，SHA256） |
| `status` | String | `pending` / `available` / `active` / `inactive` |
| `applicant` | String | 申請人（必填） |
| `appliedAt` | Date | 申請時間 |
| `reviewer` | String | 審核人 |
| `reviewedAt` | Date | 審核時間 |
| `usedAt` | Date | 首次啟用時間（啟用後不可再次啟用） |
| `deviceFingerprint` | String | 離線啟用時綁定的設備指紋 |
| `activationMethod` | String | `"online"` / `"offline"` / `null` |
| `notes` | String | 備註 |

---

## 4. API 總覽

### 4.1 公開 API（`/api/license`）

不需登入，有 rate limit。BA 系統後端或離線操作頁面直接呼叫。

| 方法 | 路徑 | 說明 | Rate Limit |
|------|------|------|------------|
| POST | `/activate` | 線上啟用（一次性） | 嚴格（1h / 20次） |
| POST | `/check-status` | 心跳同步（純讀取） | 一般（15min / 10次） |
| POST | `/offline-activate` | 離線首次啟用 | 嚴格（1h / 20次） |

### 4.2 管理 API（`/api/users/licenses`）

需登入 + ADMIN / STAFF 權限。

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| GET | `/` | 取得授權列表 | ADMIN, STAFF |
| GET | `/:id` | 取得單筆授權 | ADMIN, STAFF |
| POST | `/` | 新建授權（status=pending） | ADMIN, STAFF |
| POST | `/:id/review` | 審核 → 產生 SN/LK | ADMIN |
| PUT | `/:id` | 更新授權（features、status、notes） | ADMIN, STAFF |
| DELETE | `/:id` | 刪除授權 | ADMIN, STAFF |
| POST | `/:id/offline-refresh` | 離線刷新（產生新簽名回應檔） | ADMIN |

---

## 5. 公開 API 詳細說明

### 5.1 POST `/api/license/activate`

線上啟用授權。BA 系統後端在使用者輸入 LK 後呼叫此 API。

**Request**

```json
{ "licenseKey": "XXXX-XXXX-XXXX-XXXX" }
```

或

```json
{ "serialNumber": "SN-20260318-0001" }
```

**成功 Response（200）**

```json
{
  "success": true,
  "message": "授權啟用成功",
  "result": {
    "serialNumber": "SN-20260318-0001",
    "licenseKey": "XXXX-XXXX-XXXX-XXXX",
    "product": "BA-system",
    "features": ["people_counting", "lighting"],
    "status": "active",
    "customerName": "測試公司",
    "usedAt": "2026-03-19T..."
  }
}
```

**錯誤碼**

| code | 說明 |
|------|------|
| `LICENSE_NOT_FOUND` | SN 或 LK 不存在 |
| `LICENSE_NOT_AVAILABLE` | 狀態不是 available |
| `LICENSE_ALREADY_USED` | 已啟用過 |

### 5.2 POST `/api/license/check-status`

心跳 / 定期同步。BA 系統定期呼叫以同步最新 features 或偵測 inactive。

**Request**（建議用 LK，安全性較高）

```json
{ "licenseKey": "XXXX-XXXX-XXXX-XXXX" }
```

**成功 Response（200）**

```json
{
  "success": true,
  "message": "獲取授權狀態成功",
  "result": {
    "serialNumber": "SN-20260318-0001",
    "licenseKey": "XXXX-XXXX-XXXX-XXXX",
    "product": "BA-system",
    "features": ["people_counting", "lighting", "environment"],
    "status": "active",
    "customerName": "測試公司",
    "usedAt": "2026-03-19T..."
  }
}
```

> **重要**：`result` 直接包含授權欄位，不再用 `result.license` 包裹。

### 5.3 POST `/api/license/offline-activate`

離線首次啟用。操作人員在 `yenshow.com/license/activate` 上傳請求檔後觸發。

**Request**

```json
{
  "serialNumber": "SN-20260318-0001",
  "deviceFingerprint": "abc123...",
  "nonce": "random-uuid"
}
```

**成功 Response（200）**

```json
{
  "success": true,
  "message": "離線授權啟用成功",
  "result": {
    "serialNumber": "SN-20260318-0001",
    "licenseKey": "XXXX-XXXX-XXXX-XXXX",
    "customerName": "測試公司",
    "product": "BA-system",
    "features": ["people_counting", "lighting"],
    "status": "active",
    "deviceFingerprint": "abc123...",
    "activatedAt": "2026-03-19T...",
    "nonce": "random-uuid",
    "signature": "hmac-sha256-hex..."
  }
}
```

回應檔由前端自動下載為 `.json`，操作人員帶回離線設備匯入。

---

## 6. 管理 API — 離線刷新

### POST `/api/users/licenses/:id/offline-refresh`

管理員專用。當客戶追加或變更功能模組後，admin 在後台先修改 features，再點「離線刷新」產生新的簽名回應檔。

**不會改變** `status`、`usedAt`、`deviceFingerprint`。

**成功 Response（200）**

```json
{
  "success": true,
  "message": "離線授權刷新成功",
  "result": {
    "serialNumber": "SN-20260318-0001",
    "licenseKey": "XXXX-XXXX-XXXX-XXXX",
    "customerName": "測試公司",
    "product": "BA-system",
    "features": ["people_counting", "lighting", "environment"],
    "status": "active",
    "deviceFingerprint": "abc123...",
    "activatedAt": "2026-03-19T...",
    "refreshedAt": "2026-03-19T...",
    "nonce": null,
    "signature": "hmac-sha256-hex..."
  }
}
```

---

## 7. 回應格式規範

所有公開 API 遵循統一的回應格式：

```json
{
  "success": true,
  "message": "...",
  "result": {
    "serialNumber": "...",
    "licenseKey": "...",
    "product": "BA-system",
    "features": [...],
    "status": "...",
    "customerName": "...",
    "usedAt": "..."
  }
}
```

**規則**：
- `result` 為扁平物件，不再包裹 `result.license`
- 所有 API（activate、check-status、offline-activate）回傳相同的 result 結構
- 錯誤回應使用 HTTP status code + `code` 欄位

---

## 8. 離線簽名機制

### 8.1 演算法

- HMAC-SHA256
- 金鑰：環境變數 `LICENSE_SIGN_SECRET`
- 將 payload 的 key 字母排序後 JSON 序列化，再簽名

### 8.2 簽名範圍

簽名覆蓋 `signature` 以外的所有欄位。BA 系統端以相同方式驗簽（需持有同一 secret 或使用非對稱方案）。

### 8.3 安全注意事項

- `LICENSE_SIGN_SECRET` 必須安全存放，不可洩漏到前端
- 離線場景下，BA 系統本地需儲存回應檔以供離線驗簽
- `offline-refresh` 已移至 admin 路由，需登入才能操作

---

## 9. BA 系統端實作指引

### 9.1 線上啟用流程

```
使用者輸入 License Key
  → BA 後端呼叫 POST /api/license/activate { licenseKey }
  → 收到 result.features → 存入本地 DB → 啟用對應模組
```

### 9.2 心跳同步流程

```
BA 後端定期（如每 24h）呼叫 POST /api/license/check-status { licenseKey }
  → 比對 result.features 與本地 → 有差異則更新本地
  → 檢查 result.status === "inactive" → 是則鎖定功能
```

### 9.3 離線啟用流程

```
1. BA 系統產生請求檔（含 serialNumber + deviceFingerprint + nonce）
2. 操作人員帶請求檔到有網路的電腦，開啟 yenshow.com/license/activate
3. 上傳請求檔 → 平台回傳簽名回應檔 → 下載
4. 帶回應檔回 BA 系統匯入 → BA 驗簽 → 存入本地
```

### 9.4 功能模組追加流程（離線設備）

```
1. admin 在後台修改該授權的 features
2. admin 點「離線刷新」→ 下載新的簽名回應檔
3. 操作人員帶回應檔到 BA 系統匯入 → 覆蓋本地授權資料
```

### 9.5 BA 本地儲存建議

BA 系統應在本地儲存：
- `licenseKey`：用於 check-status 查詢
- `features`：當前已啟用的功能模組列表
- `signature` + 原始回應檔：離線環境下的驗簽依據

---

## 10. 已移除的 API

以下 API 在本次重構中已移除：

| 原路徑 | 原用途 | 移除原因 |
|--------|--------|----------|
| `POST /api/license/validate` | 驗證授權 | 與 activate 語義重疊，且會觸發狀態變更 |
| `POST /api/license/get-license-key` | 以 SN 換 LK | BA 流程以 LK 為主，不再需要 |
| `POST /api/license/offline-verify` | 驗簽 | 驗簽應由 BA 系統本地執行，不需要呼叫平台 |
| `POST /api/license/offline-refresh` | 離線刷新（公開） | 已移至 admin 路由（`/api/users/licenses/:id/offline-refresh`），需登入 |

---

## 11. 部署注意事項

### 環境變數

| 變數 | 說明 |
|------|------|
| `LICENSE_SIGN_SECRET` | HMAC-SHA256 簽名金鑰（離線授權必要） |

需在 `.env` 和 `docker-compose.yml` 中設定。

### Rate Limit

| 層級 | 視窗 | 上限 | 適用路由 |
|------|------|------|----------|
| 一般 | 15 分鐘 | 10 次 | check-status |
| 嚴格 | 1 小時 | 20 次 | activate、offline-activate |
