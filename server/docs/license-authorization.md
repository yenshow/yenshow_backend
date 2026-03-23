# BA 系統授權平台 — 技術文件

> 最後更新：2026-03-20

---

## 1. 系統概覽

本平台為 **BA（Building Automation）系統** 提供 **買斷制、功能模組授權**。

授權採用 **主 LK / 副 LK 雙層架構**：

- **主 License Key（主 LK）**：首次審核時產生，代表一份授權合約，綁定初始功能模組與設備
- **副 License Key（副 LK）**：後續追加功能時產生，隸屬於某組主 LK，一組主 LK 可對應多組副 LK

> **設計原則**
>
> - 所有使用者面向的流程（線上 / 離線）統一以 **License Key** 作為唯一操作鍵
> - Serial Number（SN）僅保留於 DB 供後台管理 / 稽核使用，使用者無需接觸
> - `deviceFingerprint` 作為設備唯一性識別，**線上與離線均需記錄**
> - 不提供任何外部可探測授權狀態的 API（資安考量）


| 項目   | 說明                                       |
| ------ | ------------------------------------------ |
| 產品   | BA-system（唯一）                          |
| 計費模式 | 買斷制（無到期日）                          |
| 授權粒度 | 以功能模組（Feature）為單位                  |
| 識別鍵  | 主 LK / 副 LK（`XXXX-XXXX-XXXX-XXXX`）     |
| 啟用方式 | 線上（BA 後端 → 平台 API）或 離線（請求檔/回應檔） |
| 設備綁定 | `deviceFingerprint`（線上 / 離線統一記錄）    |


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
pending ──(審核)──→ available ──(啟用)──→ active
                       ↑                    │
                       └──(解除綁定)─────────┘
```


| 狀態        | 說明                     | 可執行動作                |
| ----------- | ------------------------ | ----------------------- |
| `pending`   | 等待管理員審核             | 審核 → `available`       |
| `available` | 已產生 SN / LK，可啟用     | 線上啟用 / 離線啟用        |
| `active`    | 使用中，已綁定設備          | 解除綁定 → `available`    |


> **解除綁定**：管理員可將 `active` 狀態的授權解除設備綁定，清除 `deviceFingerprint`，狀態回到 `available`，允許在新設備上重新啟用。若主 LK 被解除綁定，其下所有副 LK 也一併重置為 `available`。

> **為何移除 `inactive`**：買斷制授權不存在「停用」語義；考量商業契約，授權一經售出即永久有效。若有換機需求，透過「解除綁定」回到 `available` 即可。

---

## 3. 資料模型

> **DB 設計：方案 A（同表 + `parentLicenseKey` 欄位）**
> 主副 LK 共用同一張 `licenses` 集合。`parentLicenseKey = null` 代表主 LK，有值代表副 LK。
> 欄位高度重疊，單表 + 索引即可高效查詢。

### 3.1 主 License 結構（主 LK）

首次審核時產生。


| 欄位                  | 類型       | 說明                                                  |
| ------------------- | -------- | --------------------------------------------------- |
| `product`           | String   | 固定 `"BA-system"`                                    |
| `features`          | [String] | 授權功能模組陣列（初始功能）                                     |
| `customerName`      | String   | 客戶名稱（必填，**僅後台管理用，不對外回傳**）                           |
| `serialNumber`      | String   | 審核時自動產生（`SN-YYYYMMDD-XXXX`，僅後台管理用）                  |
| `licenseKey`        | String   | 審核時自動產生（`XXXX-XXXX-XXXX-XXXX`，**主 LK**）             |
| `status`            | String   | `pending` / `available` / `active`                   |
| `applicant`         | String   | 申請人（必填）                                             |
| `appliedAt`         | Date     | 申請時間                                                |
| `reviewer`          | String   | 審核人                                                 |
| `reviewedAt`        | Date     | 審核時間                                                |
| `deviceFingerprint` | String   | 綁定設備指紋（**線上 / 離線啟用時寫入**）                             |
| `activationMethod`  | String   | `"online"` / `"offline"` / `null`                    |
| `notes`             | String   | 備註                                                  |


> **移除 `usedAt`**：原先用於標記使用唯一性，但因換機需求 LK 可被重複使用（解除綁定 → 重新啟用），改由 `deviceFingerprint` 控制設備唯一性。

### 3.2 副 License 結構（副 LK）

後續追加功能時產生，隸屬於某組主 LK。


| 欄位                 | 類型       | 說明                                          |
| -------------------- | -------- | --------------------------------------------- |
| `parentLicenseKey`   | String   | 所屬主 LK（關聯鍵）                              |
| `features`           | [String] | **追加**的功能模組陣列                              |
| `serialNumber`       | String?  | 副 LK **不產生 SerialNumber**（為 `null`/`undefined`） |
| `licenseKey`         | String   | 自動產生（`XXXX-XXXX-XXXX-XXXX`，**副 LK**）       |
| `status`             | String   | `pending` / `available` / `active`            |
| `createdBy`          | String   | 建立人                                          |
| `createdAt`          | Date     | 建立時間                                         |
| `reviewedAt`         | Date     | 審核時間                                         |
| `notes`              | String   | 備註                                            |


> **副 LK 不獨立綁定設備**：副 LK 的設備綁定繼承自主 LK。啟用副 LK 時，server 端比對 **DB 中主 LK 記錄的 `deviceFingerprint`**（而非信任 client 傳來的值）。
>
> **授權狀態追蹤**：只要設備回傳了 `deviceFingerprint`，後台即可追蹤該授權的使用設備，不需要額外的查詢機制。

---

## 4. API 總覽

### 4.1 公開 API（`/api/license`）

不需登入，有 rate limit。**所有 API 統一以 `licenseKey` 為查詢鍵。**


| 方法   | 路徑                  | 用途                              | Rate Limit |
| ---- | ------------------- | ------------------------------- | ---------- |
| POST | `/activate`         | 線上啟用（主 LK 首次啟用 / 副 LK 功能追加）  | 嚴格         |
| POST | `/offline-activate` | 離線啟用（主 LK 首次啟用 / 副 LK 功能追加）  | 嚴格         |


> **已移除的 API**
>
> - `/check-status`（心跳同步）：因資安風險移除，避免外部可探測授權狀態
> - `/offline-refresh`：統一使用 `/offline-activate` 流程，以副 LK 追加功能

### 4.2 管理 API（`/api/users/licenses`）

需登入 + ADMIN / STAFF 權限。


| 方法     | 路徑              | 用途                        | 權限           |
| ------ | --------------- | ------------------------- | ------------ |
| GET    | `/`             | 授權列表                      | ADMIN, STAFF |
| GET    | `/:id`          | 單筆授權（含其下所有副 LK）           | ADMIN, STAFF |
| POST   | `/`             | 新建授權                      | ADMIN, STAFF |
| POST   | `/:id/review`   | 審核 → 產生 SN / 主 LK         | ADMIN        |
| POST   | `/:id/extend`   | 追加功能 → 產生副 LK             | ADMIN        |
| POST   | `/:id/unbind`   | 解除設備綁定 → `available`      | ADMIN        |
| PUT    | `/:id`          | 更新（features、notes）        | ADMIN, STAFF |
| DELETE | `/:id`          | 刪除                        | ADMIN, STAFF |


---

## 5. 回應格式

### 5.1 線上 API 回應格式（`/activate`）

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
    "deviceFingerprint": "abc123..."
  }
}
```

> **與舊版差異**：新增 `deviceFingerprint`；移除 `customerName`（僅後台使用）、`usedAt`（已廢棄）。

> **副 LK 啟用回應**：`features` 回傳的是該副 LK 追加的功能模組。BA 端自行合併至本地已有的 features。
> **serialNumber**：主 LK 會有值；副 LK 為 `null`/`undefined`。

### 5.2 離線回應檔格式（`/offline-activate`）

```json
{
  "success": true,
  "message": "...",
  "result": {
    "licenseKey": "A1B2-C3D4-E5F6-G7H8",
    "serialNumber": "SN-20260318-0001",
    "product": "BA-system",
    "features": ["people_counting", "lighting"],
    "status": "active",
    "deviceFingerprint": "abc123...",
    "activatedAt": "2026-03-20T...",
    "isExtension": false,
    "parentLicenseKey": null,
    "signature": "hmac-sha256-hex..."
  }
}
```

> **serialNumber**：主 LK 會有值；副 LK 為 `null`/`undefined`。


| 欄位                 | 主 LK 啟用          | 副 LK 啟用                |
| -------------------- | ------------------- | ----------------------- |
| `isExtension`        | `false`             | `true`                  |
| `parentLicenseKey`   | `null`              | 主 LK 值                 |
| `features`           | 初始功能模組          | 追加的功能模組              |


> **與舊版差異**：移除 `customerName`（僅後台使用）、`nonce`（不再需要，見第 6 節說明）、`refreshedAt`（以 `isExtension` 取代判斷邏輯）。

BA 端用 `isExtension` 判斷是首次啟用還是功能追加。

---

## 6. API 詳細說明

### 6.1 POST `/api/license/activate`

線上啟用。BA 後端在使用者輸入 LK 後呼叫。支援主 LK 首次啟用、副 LK 功能追加、主 LK 換機啟用。

**Request**

```json
{
  "licenseKey": "A1B2-C3D4-E5F6-G7H8",
  "deviceFingerprint": "abc123..."
}
```

**行為邏輯**


| 情境           | 判斷條件                                                    | 行為                                           |
| ------------ | ------------------------------------------------------- | -------------------------------------------- |
| 主 LK 首次啟用   | LK 無 `parentLicenseKey`、`status = available`             | 綁定 `deviceFingerprint` → `status = active`   |
| 主 LK 換機啟用   | LK 無 `parentLicenseKey`、`status = available`（已解除綁定後）    | 綁定新 `deviceFingerprint` → `status = active`  |
| 副 LK 功能追加   | LK 有 `parentLicenseKey`、主 LK 已 `active` 且 **DB 中主 LK 的 `deviceFingerprint`** 與請求一致 | 副 LK `status = active`，回傳追加 features        |


**錯誤碼**


| code                    | 說明                                 |
| ----------------------- | ---------------------------------- |
| `LICENSE_NOT_FOUND`     | LK 不存在                             |
| `LICENSE_NOT_AVAILABLE` | 狀態非 `available`                    |
| `PARENT_NOT_ACTIVE`     | 副 LK 的主 LK 尚未啟用                   |
| `DEVICE_MISMATCH`       | 副 LK 啟用時，`deviceFingerprint` 與 **DB 中主 LK 記錄的指紋** 不一致 |


### 6.2 POST `/api/license/offline-activate`

離線啟用。操作人員在 `yenshow.com/license/activate` 上傳 BA 產生的 request file。
支援主 LK 首次啟用與副 LK 功能追加（統一流程，不再區分啟用 / 刷新模式）。

**Request file 格式（BA 端產生）**

採用 **加密陣列格式**，不顯示欄位名稱，達到初步欄位防範：

```json
["A1B2-C3D4-E5F6-G7H8", "abc123..."]
```

對應欄位順序：`[licenseKey, deviceFingerprint]`

BA 端匯出時以 **Base64 編碼** 包裝：

```
btoa(JSON.stringify(["A1B2-C3D4-E5F6-G7H8", "abc123..."]))
→ "WyJBMUIyLUMzRDQtRTVGNi1HN0g4IiwiYWJjMTIzLi4uIl0="
```

> **為何用陣列 + Base64？**
> 陣列隱藏欄位名稱，Base64 再遮蔽明文值，達到初步防範。線上授權頁面負責 Base64 解碼 → JSON 解析 → 映射為 API 參數。

**線上授權頁面處理流程**

1. 接收上傳的 request file（Base64 字串）
2. Base64 解碼 → JSON.parse → 取得陣列
3. 解析：`[0]` → `licenseKey`、`[1]` → `deviceFingerprint`
4. 組裝為 API request body 呼叫 `offline-activate`
5. 回傳簽名 response file 供下載

**行為邏輯**

同 6.1 `/activate`，差異僅在回應為簽名檔案供下載。

**錯誤碼**

同 6.1。

> **為何移除 `nonce`**
>
> 原設計中 `nonce` 用於防止 request file 重放。但在新架構下：
> 1. 狀態機本身已防重放：`available → active` 為單向轉換，已啟用的 LK 再次提交會被 `LICENSE_NOT_AVAILABLE` 擋下
> 2. `licenseKey + deviceFingerprint` 組合已具唯一性
> 3. 移除 `nonce` 可簡化 BA 端產生 request file 的邏輯

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

### 8.1 線上啟用（主 LK 首次啟用）

```
使用者在 BA 前端輸入主 License Key
  → BA 後端呼叫 POST /api/license/activate { licenseKey, deviceFingerprint }
  → 平台驗證 status=available → 綁定 deviceFingerprint → status=active
  → 回傳 result（含 features、deviceFingerprint）
  → BA 存入本地 DB → 啟用對應模組
```

### 8.2 線上功能追加（副 LK）

```
管理員在平台後台追加功能 → 產生副 LK → 告知使用者副 LK
  → 使用者在 BA 前端輸入副 License Key
  → BA 後端呼叫 POST /api/license/activate { licenseKey(副LK), deviceFingerprint }
  → 平台驗證：
      1. 副 LK status=available
      2. 主 LK 已 active
      3. deviceFingerprint 與主 LK 綁定的設備一致
  → 副 LK status=active → 回傳追加的 features
  → BA 合併 features 至本地 → 更新啟用模組
```

### 8.3 離線啟用（主 LK / 副 LK 統一流程）

```
┌─ BA 系統（離線設備）──────────────────────────┐
│ 1. admin 輸入 License Key（主 LK 或副 LK）     │
│ 2. 系統產生 request file（加密陣列格式）         │
│    [ licenseKey, deviceFingerprint ]           │
│ 3. 匯出檔案 → 用 USB 帶走                      │
└────────────────────────────────────────────────┘
        ↓ 操作人員帶到有網路的電腦
┌─ yenshow.com/license/activate ─────────────────┐
│ 4. 上傳 request file                            │
│ 5. 頁面解析陣列 → 呼叫 offline-activate API     │
│ 6. 下載簽名 response file                       │
└─────────────────────────────────────────────────┘
        ↓ 操作人員帶回離線設備
┌─ BA 系統（離線設備）──────────────────────────┐
│ 7. 匯入 response file                          │
│ 8. BA 驗簽 → 通過後存入本地 → 啟用/更新模組     │
└────────────────────────────────────────────────┘
```

> 不再區分「啟用模式」與「更新模式」。無論主 LK 或副 LK，統一走同一套離線流程。BA 端由回應檔的 `isExtension` 欄位判斷是首次啟用或功能追加。

### 8.4 解除綁定（換機流程）

```
┌─ 授權平台後台 ─────────────────────────────────┐
│ 1. 管理員點擊「解除綁定」                         │
│    → 系統提示「該授權有 N 組副 LK 也將被重置」    │
│    → 確認後 POST /:id/unbind                    │
│ 2. 清除主 LK 的 deviceFingerprint               │
│    主 LK status → available                     │
│ 3. 相關副 LK 一併重置為 available（DB Transaction）│
└─────────────────────────────────────────────────┘
        ↓
┌─ 新設備 ────────────────────────────────────────┐
│ 4. 使用者在新設備輸入主 LK                        │
│    → 重新走線上啟用或離線啟用流程                  │
│ 5. 再依序輸入各副 LK 追加功能                     │
└─────────────────────────────────────────────────┘
```

---

## 9. BA 系統端實作指引

### 9.1 離線 import 統一邏輯

BA 的「離線匯入」功能只需一個 handler，同時處理主 LK 啟用和副 LK 功能追加的回應檔：

```
handleImport(responseFileJson):
  1. 解析 JSON
  2. 取出 signature，對剩餘欄位排序後 HMAC 驗簽
  3. 驗簽失敗 → 拒絕匯入
  4. 驗簽成功：
     if (isExtension === false)
       → 首次啟用
       → 設定 license_license_key = json.licenseKey
       → 設定 license_features = json.features
       → 設定 license_serial_number = json.serialNumber
       → 設定 license_device_fingerprint = json.deviceFingerprint
       → 設定 activation_method = "offline"
     else
       → 功能追加
       → 合併 json.features 至本地 license_features
       → 記錄副 LK（供稽核）
     → 更新 license_updated_at = now
```

### 9.2 本地落地資料（PostgreSQL `system_settings`）


| key                           | 說明                                           |
| ----------------------------- | -------------------------------------------- |
| `license_license_key`         | 主 LK — **所有 API 查詢的主要鍵**                    |
| `license_features`            | 已啟用的 feature keys（feature gate 唯一依據）         |
| `license_serial_number`       | SN — 僅回顯 / 稽核用                               |
| `license_device_fingerprint`  | 設備指紋 — 線上 / 離線均記錄                            |
| `license_activation_method`   | `online` / `offline` / `open_all` / `manual` |
| `license_extension_keys`      | 已啟用的副 LK 清單（JSON 陣列，供稽核）                    |
| `license_updated_at`          | 最後更新時間                                       |


> `open_all` 和 `manual` 是 BA 端的本地狀態，不存在於授權平台 DB。

### 9.3 BA 對外 API（前端 → BA 後端 → 平台）


| BA 端路由                             | 行為                                                 |
| ---------------------------------- | -------------------------------------------------- |
| `GET /api/license`                 | 回傳本地授權狀態供前端顯示                                      |
| `POST /api/license/activate`       | 轉呼叫平台 `activate { licenseKey, deviceFingerprint }`，成功後落地 |
| `POST /api/license/offline-import` | 本地驗簽 + 落地（見 9.1）                                   |


> **已移除** `POST /api/license/check-status`：不再有心跳同步機制，也不需要「同步」按鈕。
> 線上版若需追加功能，使用者直接輸入新的副 LK 即可觸發 `/activate`。

### 9.4 Feature Gate

由 BA 後端 middleware `requireFeature(featureKey)` 執行，未授權回 403 `FEATURE_NOT_LICENSED`。

### 9.5 Request File 產生功能

BA 需提供功能讓 admin 產生離線 request file：

1. admin 輸入 License Key（主 LK 或副 LK）
2. 系統自動帶入 `deviceFingerprint`
3. 匯出 Base64 編碼的加密陣列格式檔案：

```
btoa(JSON.stringify(["A1B2-C3D4-E5F6-G7H8", "abc123..."]))
```

> `deviceFingerprint` 的產生方式由 BA 系統決定（如 MAC + hostname hash）。

### 9.6 開發/測試開關（正式環境必須關閉）


| 環境變數                                         | 說明                   |
| -------------------------------------------- | -------------------- |
| `LICENSE_OPEN_ALL_FEATURES=true`             | BA 後端跳過 feature gate |
| `NUXT_PUBLIC_LICENSE_OPEN_ALL_FEATURES=true` | BA 前端不顯示鎖頭           |


---

## 10. BA 系統端必要改動清單

> 本次架構調整後，BA 系統需要配合修改 / 確認的具體項目。

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
| `POST /api/license/check-status`    | 已移除，不再有心跳同步                     |
| `POST /api/license/offline-refresh` | 統一使用 `offline-activate` + 副 LK  |


### 10.3 統一使用 License Key + deviceFingerprint（必改）

所有線上流程都需帶入 `deviceFingerprint`：

```diff
  // 線上啟用
  {
-   "licenseKey": "A1B2-C3D4-E5F6-G7H8"
+   "licenseKey": "A1B2-C3D4-E5F6-G7H8",
+   "deviceFingerprint": "abc123..."
  }
```

離線 request file 改為加密陣列格式：

```diff
- { "licenseKey": "A1B2-C3D4-E5F6-G7H8", "deviceFingerprint": "...", "nonce": "..." }
+ ["A1B2-C3D4-E5F6-G7H8", "abc123..."]
```

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

### 10.5 離線 import 區分啟用 vs 功能追加（必改）


| `isExtension` | 含義       | BA 行為                                    |
| ------------- | -------- | ---------------------------------------- |
| `false`       | 主 LK 首次啟用 | 設定 `activation_method = "offline"`，寫入完整授權 |
| `true`        | 副 LK 功能追加 | 合併 `features`，記錄副 LK                     |


### 10.6 新增 Request File 產生功能（離線必做）

見 9.5 節。

### 10.7 改動摘要表


| #   | 項目                                                         | 優先級     | 狀態  |
| --- | ---------------------------------------------------------- | ------- | --- |
| 1   | API 回傳格式統一（`result.features`）                              | **必改**  | ▢   |
| 2   | 移除 `validate`、`get-license-key`、`offline-verify` 呼叫        | **必改**  | ▢   |
| 3   | 移除 `check-status` 心跳同步                                     | **必改**  | ▢   |
| 4   | 移除 `offline-refresh`，統一使用 `offline-activate`                | **必改**  | ▢   |
| 5   | 所有流程帶入 `deviceFingerprint`（線上 + 離線）                       | **必改**  | ▢   |
| 6   | 離線 request file 改為加密陣列格式                                   | **必改**  | ▢   |
| 7   | 離線 import 驗簽：不寫死欄位清單                                      | **必確認** | ▢   |
| 8   | 離線 import：用 `isExtension` 區分首次啟用 vs 功能追加                  | **必改**  | ▢   |
| 9   | 新增「產生 request file」功能（加密陣列格式）                              | **必做**  | ▢   |
| 10  | 支援副 LK 啟用流程（線上 + 離線）                                      | **必做**  | ▢   |


---

## 11. 已移除的 API


| 原路徑                                 | 移除原因                       |
| ----------------------------------- | -------------------------- |
| `POST /api/license/validate`        | 與 activate 語義重疊且觸發狀態變更     |
| `POST /api/license/get-license-key` | 所有流程統一用 LK，不再需要 SN 換 LK    |
| `POST /api/license/offline-verify`  | 驗簽應由 BA 本地執行               |
| `POST /api/license/check-status`    | 資安風險：避免外部探測授權狀態            |
| `POST /api/license/offline-refresh` | 統一使用 `offline-activate` + 副 LK |


---

## 12. 部署注意事項

### 授權平台環境變數


| 變數                    | 說明                                 |
| --------------------- | ---------------------------------- |
| `LICENSE_SIGN_SECRET` | HMAC-SHA256 簽名金鑰（離線授權必要，需與 BA 端同步） |


需在 `.env` 和 `docker-compose.yml` 中設定。

### Rate Limit


| 層級  | 視窗    | 上限   | 適用路由                         |
| --- | ----- | ---- | ---------------------------- |
| 嚴格  | 1 小時  | 20 次 | activate、offline-activate    |


> 移除一般層級（原適用 `check-status`，已移除）。
