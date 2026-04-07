# BA 系統授權平台 — 技術文件

> 最後更新：2026-03-19

---

## 1. 系統概覽

本平台為 **BA（Building Automation）系統** 提供 **買斷制、功能模組授權**。

一張授權由一個 **License Key（LK）** 唯一識別，授權可包含多個功能模組（Feature Keys）。

> **設計原則**：所有使用者面向的流程（線上 / 離線）統一以 **License Key** 作為唯一操作鍵。
> Serial Number（SN）僅保留於 DB 供後台管理 / 稽核使用，使用者無需接觸。


| 項目   | 說明                                 |
| ---- | ---------------------------------- |
| 產品   | BA-system（唯一）                      |
| 計費模式 | 買斷制（無到期日）                          |
| 授權粒度 | 以功能模組（Feature）為單位                  |
| 識別鍵  | License Key（`XXXX-XXXX-XXXX-XXXX`） |
| 啟用方式 | 線上（BA 後端 → 平台 API）或 離線（請求檔/回應檔）    |


### 可授權功能模組


| 值                 | 說明   |
| ----------------- | ---- |
| `people_counting` | 人流計數 |
| `lighting`        | 燈控管理 |
| `environment`     | 環境監測 |
| `surveillance`    | 影像監控 |
| `vehicle_access`  | 車輛門禁 |


---

## 2. 狀態機

```
pending ──(審核)──→ available ──(啟用)──→ active ──(停用)──→ inactive
```


| 狀態          | 說明              | 可執行動作                           |
| ----------- | --------------- | ------------------------------- |
| `pending`   | 等待管理員審核         | 審核 → available                  |
| `available` | 已產生 SN / LK，可啟用 | 線上啟用 / 離線啟用                     |
| `active`    | 使用中             | check-status、離線刷新、停用 → inactive |
| `inactive`  | 已停用（管理員操作）      | 管理員可改回 active / available       |


---

## 3. 資料模型（License Schema）


| 欄位                  | 類型       | 說明                                              |
| ------------------- | -------- | ----------------------------------------------- |
| `product`           | String   | 固定 `"BA-system"`                                |
| `features`          | [String] | 授權功能模組陣列                                        |
| `customerName`      | String   | 客戶名稱（必填）                                        |
| `serialNumber`      | String   | 審核時自動產生（`SN-YYYYMMDD-XXXX`，僅後台管理用）              |
| `licenseKey`        | String   | 審核時自動產生（`XXXX-XXXX-XXXX-XXXX`，**所有 API 查詢鍵**）   |
| `status`            | String   | `pending` / `available` / `active` / `inactive` |
| `applicant`         | String   | 申請人（必填）                                         |
| `appliedAt`         | Date     | 申請時間                                            |
| `reviewer`          | String   | 審核人                                             |
| `reviewedAt`        | Date     | 審核時間                                            |
| `usedAt`            | Date     | 首次啟用時間（一次性）                                     |
| `deviceFingerprint` | String   | 離線啟用時綁定的設備指紋                                    |
| `activationMethod`  | String   | `"online"` / `"offline"` / `null`               |
| `notes`             | String   | 備註                                              |


---

## 4. API 總覽

### 4.1 公開 API（`/api/license`）

不需登入，有 rate limit。**所有 API 統一以 `licenseKey` 為查詢鍵。**


| 方法   | 路徑                  | 用途                 | Rate Limit |
| ---- | ------------------- | ------------------ | ---------- |
| POST | `/activate`         | 線上啟用（一次性）          | 嚴格         |
| POST | `/check-status`     | 心跳同步（純讀取）          | 一般         |
| POST | `/offline-activate` | 離線首次啟用             | 嚴格         |
| POST | `/offline-refresh`  | 離線刷新（features 變更後） | 嚴格         |


### 4.2 管理 API（`/api/users/licenses`）

需登入 + ADMIN / STAFF 權限。


| 方法     | 路徑            | 用途                        | 權限           |
| ------ | ------------- | ------------------------- | ------------ |
| GET    | `/`           | 授權列表                      | ADMIN, STAFF |
| GET    | `/:id`        | 單筆授權                      | ADMIN, STAFF |
| POST   | `/`           | 新建授權                      | ADMIN, STAFF |
| POST   | `/:id/review` | 審核 → 產生 SN/LK             | ADMIN        |
| PUT    | `/:id`        | 更新（features、status、notes） | ADMIN, STAFF |
| DELETE | `/:id`        | 刪除                        | ADMIN, STAFF |


---

## 5. 回應格式

### 5.1 線上 API 回應格式（activate、check-status）

```json
{
  "success": true,
  "message": "...",
  "result": {
    "serialNumber": "SN-20260318-0001",
    "licenseKey": "A1B2-C3D4-E5F6-G7H8",
    "product": "BA-system",
    "features": ["people_counting", "lighting"],
    "status": "active",
    "customerName": "測試公司",
    "usedAt": "2026-03-19T..."
  }
}
```

### 5.2 離線回應檔格式（offline-activate、offline-refresh 共用）

兩個離線 API 產出**完全相同的欄位集**，BA 端只需一套 import / 驗簽邏輯。

```json
{
  "success": true,
  "message": "...",
  "result": {
    "licenseKey": "A1B2-C3D4-E5F6-G7H8",
    "serialNumber": "SN-20260318-0001",
    "customerName": "測試公司",
    "product": "BA-system",
    "features": ["people_counting", "lighting"],
    "status": "active",
    "deviceFingerprint": "abc123...",
    "activatedAt": "2026-03-19T...",
    "refreshedAt": null,
    "nonce": "random-uuid",
    "signature": "hmac-sha256-hex..."
  }
}
```


| 欄位            | offline-activate | offline-refresh |
| ------------- | ---------------- | --------------- |
| `activatedAt` | 啟用時間（剛寫入）        | 原始啟用時間（不變）      |
| `refreshedAt` | `null`           | 刷新時間（本次）        |


BA 端用 `refreshedAt === null` 判斷是首次啟用還是更新。

---

## 6. API 詳細說明

### 6.1 POST `/api/license/activate`

線上啟用。BA 後端在使用者輸入 LK 後呼叫。

**Request**

```json
{ "licenseKey": "A1B2-C3D4-E5F6-G7H8" }
```

**錯誤碼**


| code                    | 說明            |
| ----------------------- | ------------- |
| `LICENSE_NOT_FOUND`     | LK 不存在        |
| `LICENSE_NOT_AVAILABLE` | 狀態非 available |
| `LICENSE_ALREADY_USED`  | 已啟用過          |


### 6.2 POST `/api/license/check-status`

心跳同步。BA 定期呼叫以取得最新 features 或偵測 inactive。

**Request**

```json
{ "licenseKey": "A1B2-C3D4-E5F6-G7H8" }
```

### 6.3 POST `/api/license/offline-activate`

離線首次啟用。操作人員在 `yenshow.com/license/activate`（啟用模式）上傳 BA 產生的 request file。

**Request**（即 BA 產生的 request file 內容）

```json
{
  "licenseKey": "A1B2-C3D4-E5F6-G7H8",
  "deviceFingerprint": "abc123...",
  "nonce": "random-uuid"
}
```

**錯誤碼**


| code                    | 說明            |
| ----------------------- | ------------- |
| `LICENSE_NOT_FOUND`     | LK 不存在        |
| `LICENSE_NOT_AVAILABLE` | 狀態非 available |
| `LICENSE_ALREADY_USED`  | 已啟用過          |
| `DEVICE_MISMATCH`       | 設備指紋不符        |


### 6.4 POST `/api/license/offline-refresh`

離線刷新。操作人員在 `yenshow.com/license/activate`（更新模式）輸入 LK。

**Request**

```json
{
  "licenseKey": "A1B2-C3D4-E5F6-G7H8",
  "deviceFingerprint": "abc123...",
  "nonce": null
}
```

> `deviceFingerprint` 和 `nonce` 為選填。

**錯誤碼**


| code                 | 說明     |
| -------------------- | ------ |
| `LICENSE_NOT_FOUND`  | LK 不存在 |
| `LICENSE_NOT_ACTIVE` | 授權尚未啟用 |
| `DEVICE_MISMATCH`    | 設備指紋不符 |


---

## 7. 離線簽名機制

### 7.1 演算法

- HMAC-SHA256
- 金鑰：環境變數 `LICENSE_SIGN_SECRET`
- 簽名流程：取 payload 中 `signature` 以外的**所有欄位** → key 字母排序 → JSON 序列化 → HMAC

### 7.2 BA 端驗簽虛擬碼

```
input  = 回應檔 JSON（完整物件）
fields = 移除 input.signature 後的剩餘欄位
sorted = 依 key 字母排序
data   = JSON.stringify(sorted)
expect = HMAC-SHA256(data, LICENSE_SIGN_SECRET)
valid  = timingSafeEqual(expect, input.signature)
```

> **重點**：不要寫死欄位清單。`signature` 以外的所有 key 都要參與簽名。

### 7.3 安全注意事項

- `LICENSE_SIGN_SECRET` 必須安全存放，不可洩漏到前端
- BA 系統需持有同一 secret 才能驗簽
- 離線場景下，BA 本地需儲存回應檔以供日後驗簽

---

## 8. 完整流程圖

### 8.1 線上啟用

```
使用者在 BA 前端輸入 License Key
  → BA 後端呼叫 POST /api/license/activate { licenseKey }
  → 平台回傳 result（含 features）
  → BA 存入本地 DB → 啟用對應模組
```

### 8.2 心跳同步

```
BA 後端定期呼叫 POST /api/license/check-status { licenseKey }
  → 比對 result.features 與本地 → 有差異則更新
  → result.status === "inactive" → 清空本地 features → 封鎖功能
```

### 8.3 離線啟用（首次）— 需要 request file

```
┌─ BA 系統（離線設備）─────────────────────────┐
│ 1. admin 輸入 License Key                     │
│ 2. 系統產生 request file                      │
│    { licenseKey, deviceFingerprint, nonce }    │
│ 3. 匯出 .json → 用 USB 帶走                   │
└───────────────────────────────────────────────┘
        ↓ 操作人員帶到有網路的電腦
┌─ yenshow.com/license/activate（啟用模式）─────┐
│ 4. 上傳 request file                          │
│ 5. 平台呼叫 offline-activate API              │
│ 6. 下載簽名 response file                     │
└───────────────────────────────────────────────┘
        ↓ 操作人員帶回離線設備
┌─ BA 系統（離線設備）─────────────────────────┐
│ 7. 匯入 response file                         │
│ 8. BA 驗簽 → 通過後存入本地 → 啟用模組         │
└───────────────────────────────────────────────┘
```

### 8.4 離線刷新（features 變更後）— 不需要 request file

```
┌─ 授權平台後台 ────────────────────────────────┐
│ 1. admin 修改該授權的 features                 │
└───────────────────────────────────────────────┘

┌─ yenshow.com/license/activate（更新模式）─────┐
│ 2. 操作人員輸入 License Key                    │
│    （選填 deviceFingerprint）                  │
│ 3. 平台呼叫 offline-refresh API               │
│ 4. 下載簽名 response file                     │
└───────────────────────────────────────────────┘
        ↓ 操作人員帶回離線設備
┌─ BA 系統（離線設備）─────────────────────────┐
│ 5. 匯入 response file                         │
│ 6. BA 驗簽 → 通過後覆蓋本地 features           │
└───────────────────────────────────────────────┘
```

**兩個流程的關鍵差異：**


|                   | 離線啟用（8.3）                | 離線刷新（8.4）         |
| ----------------- | ------------------------ | ----------------- |
| 起始                | BA 產生 request file（含 LK） | 只需輸入 LK           |
| Nuxt 模式           | 「啟用授權」                   | 「更新授權」            |
| 平台 API            | `offline-activate`       | `offline-refresh` |
| 平台行為              | 寫入 status=active、usedAt  | 不修改 DB            |
| 回應檔 `refreshedAt` | `null`                   | 有值                |


---

## 9. BA 系統端實作指引

### 9.1 離線 import 統一邏輯

BA 的「離線匯入」功能只需一個 handler，同時處理啟用和刷新的回應檔：

```
handleImport(responseFileJson):
  1. 解析 JSON
  2. 取出 signature，對剩餘欄位排序後 HMAC 驗簽
  3. 驗簽失敗 → 拒絕匯入
  4. 驗簽成功：
     - 更新本地 license_license_key = json.licenseKey
     - 更新本地 license_features = json.features
     - 更新本地 license_serial_number = json.serialNumber
     - 判斷類型：
       if (refreshedAt === null)  → 首次啟用，設定 activation_method = "offline"
       else                      → 刷新，不改 activation_method
     - 更新 license_updated_at = now
```

### 9.2 本地落地資料（PostgreSQL `system_settings`）


| key                         | 說明                                           |
| --------------------------- | -------------------------------------------- |
| `license_license_key`       | LK — **所有 API 查詢的主要鍵**                       |
| `license_features`          | 已啟用的 feature keys（feature gate 唯一依據）         |
| `license_serial_number`     | SN — 僅回顯 / 稽核用                               |
| `license_activation_method` | `online` / `offline` / `open_all` / `manual` |
| `license_updated_at`        | 最後更新時間                                       |


> `open_all` 和 `manual` 是 BA 端的本地狀態，不存在於授權平台 DB。

### 9.3 BA 對外 API（前端 → BA 後端 → 平台）


| BA 端路由                             | 行為                                              |
| ---------------------------------- | ----------------------------------------------- |
| `GET /api/license`                 | 回傳本地授權狀態供前端顯示                                   |
| `POST /api/license/activate`       | 轉呼叫平台 `activate { licenseKey }`，成功後落地           |
| `POST /api/license/check-status`   | 轉呼叫平台 `check-status { licenseKey }`，同步 features |
| `POST /api/license/offline-import` | 本地驗簽 + 落地（見 9.1）                                |


### 9.4 Feature Gate

由 BA 後端 middleware `requireFeature(featureKey)` 執行，未授權回 403 `FEATURE_NOT_LICENSED`。

### 9.5 開發/測試開關（正式環境必須關閉）


| 環境變數                                         | 說明                   |
| -------------------------------------------- | -------------------- |
| `LICENSE_OPEN_ALL_FEATURES=true`             | BA 後端跳過 feature gate |
| `NUXT_PUBLIC_LICENSE_OPEN_ALL_FEATURES=true` | BA 前端不顯示鎖頭           |


---

## 10. BA 系統端必要改動清單

> 平台重構後，BA 系統需要配合修改 / 確認的具體項目。

### 10.1 API 回傳格式（必改）

平台所有 API 回傳已統一為扁平格式：

```diff
- const features = response.result.license.features   // 舊格式
+ const features = response.result.features            // 新格式
```

### 10.2 移除已廢棄的 API 呼叫（必改）


| 已移除 API                             | BA 應改為                          |
| ----------------------------------- | ------------------------------- |
| `POST /api/license/validate`        | 使用 `POST /api/license/activate` |
| `POST /api/license/get-license-key` | 不需要（BA 以 LK 為主）                 |
| `POST /api/license/offline-verify`  | BA 本地驗簽（見 7.2）                  |


### 10.3 統一使用 License Key（必改）

所有流程統一以 LK 為操作鍵，不再使用 SN：

```diff
  // 離線 request file
  {
-   "serialNumber": "SN-20260318-0001",
+   "licenseKey": "A1B2-C3D4-E5F6-G7H8",
    "deviceFingerprint": "...",
    "nonce": "..."
  }
```

BA 前端的「線上啟用」和「離線啟用」都使用 LK 輸入，體驗一致。

### 10.4 離線 import 驗簽邏輯（必確認）

驗簽不可寫死欄位清單：

```diff
- // 錯誤：寫死欄位
- const payload = { serialNumber: data.serialNumber, ... };

+ // 正確：取 signature 以外的所有欄位
+ const { signature, ...fields } = data;
+ const sorted = Object.keys(fields).sort()
+   .reduce((acc, k) => { acc[k] = fields[k]; return acc; }, {});
```

### 10.5 離線 import 區分啟用 vs 刷新（建議改）


| `refreshedAt` | 含義     | BA 行為                                 |
| ------------- | ------ | ------------------------------------- |
| `null`        | 首次離線啟用 | 設定 `activation_method = "offline"`    |
| 有值            | 功能模組刷新 | 不改 `activation_method`，僅更新 `features` |


### 10.6 新增「產生 request file」功能（離線啟用必做）

BA 需新增一個功能，讓 admin 可以：

1. 輸入 License Key
2. 系統自動帶入 deviceFingerprint 和 nonce
3. 匯出 `.json`：

```json
{
  "licenseKey": "A1B2-C3D4-E5F6-G7H8",
  "deviceFingerprint": "<BA 系統自動產生>",
  "nonce": "<UUID v4>"
}
```

> `deviceFingerprint` 的產生方式由 BA 系統決定（如 MAC + hostname hash）。

### 10.7 改動摘要表


| #   | 項目                                                  | 優先級     | 狀態  |
| --- | --------------------------------------------------- | ------- | --- |
| 1   | API 回傳格式統一（`result.features`）                       | **必改**  | ▢   |
| 2   | 移除 `validate`、`get-license-key`、`offline-verify` 呼叫 | **必改**  | ▢   |
| 3   | 所有流程統一使用 LK（request file、刷新輸入）                      | **必改**  | ▢   |
| 4   | 離線 import 驗簽：不寫死欄位清單                                | **必確認** | ▢   |
| 5   | 離線 import：用 `refreshedAt` 區分首次 vs 刷新                | 建議      | ▢   |
| 6   | 新增「產生 request file」功能                               | **必做**  | ▢   |


---

## 11. 已移除的 API


| 原路徑                                 | 移除原因                    |
| ----------------------------------- | ----------------------- |
| `POST /api/license/validate`        | 與 activate 語義重疊且觸發狀態變更  |
| `POST /api/license/get-license-key` | 所有流程統一用 LK，不再需要 SN 換 LK |
| `POST /api/license/offline-verify`  | 驗簽應由 BA 本地執行            |


---

## 12. 部署注意事項

### 授權平台環境變數


| 變數                    | 說明                                 |
| --------------------- | ---------------------------------- |
| `LICENSE_SIGN_SECRET` | HMAC-SHA256 簽名金鑰（離線授權必要，需與 BA 端同步） |


需在 `.env` 和 `docker-compose.yml` 中設定。

### Rate Limit


| 層級  | 視窗    | 上限   | 適用路由                                      |
| --- | ----- | ---- | ----------------------------------------- |
| 一般  | 15 分鐘 | 10 次 | check-status                              |
| 嚴格  | 1 小時  | 20 次 | activate、offline-activate、offline-refresh |


