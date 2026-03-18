# 授權管理系統（License Authorization）文件

> 範圍：**授權申請 / 審核 / 狀態管理**、以及 **Serial Number / License Key** 的發放、驗證、啟用與狀態查詢。  
> 非範圍：登入/身分驗證細節（僅描述此系統在後台 API 上的角色權限要求）。

---

## 1. 名詞定義

- **License（授權）**：一筆授權申請與其後續狀態流轉的資料。
- **Serial Number（序號 / SN）**：審核通過後自動生成，用於客戶端取得 License Key。
- **License Key（授權金鑰 / LK）**：審核通過後自動生成，用於客戶端驗證/啟用/查狀態。
- **一次性使用**：授權一旦被成功啟用/驗證，會記錄 `usedAt`，後續不可再次啟用。
- **設備指紋（Device Fingerprint）**：離線授權時由客戶端設備提供的硬體識別碼（如 MAC / HW-ID / hostname），用於綁定特定設備。
- **請求檔（Request File）**：離線設備產生的 JSON 檔案，包含 SN + 設備指紋，用於在有網路的電腦上提交啟用。
- **回應檔（Response File）**：伺服器產生的帶簽名 JSON 檔案，離線設備匯入後即可啟用授權。

---

## 2. 系統入口與程式位置

### 2.1 主要程式位置

- **資料模型**：`models/License.js`
- **公開授權 API（客戶端使用，不需登入）**：
  - 路由：`routes/license.js`
  - 控制器：`controllers/common/licenseController.js`
- **後台授權管理 API（需登入/角色權限）**：
  - 路由：`routes/user.js`（base path：`/api/users`）
  - 控制器：`controllers/user/admin.js`
- **離線授權簽名工具**：`utils/licenseSign.js`
- **角色權限檢查**：`middlewares/permission.js`
- **路由掛載**：`app.js`

### 2.2 路由掛載點

- 公開授權 API：
  - `app.use("/api/license", licenseRoutes);`
- 後台授權管理 API：
  - `app.use("/api/users", userRoutes);`

---

## 3. 資料模型（License）

來源：`models/License.js`

### 3.1 欄位

- **product**（String，enum，必填）：產品/系統類別
  - `line-bot`：LINE Bot
  - `BA-system`：BA 系統
- **customerName**（String，必填）：客戶名稱
- **serialNumber**（String，可為 null）：審核時自動生成
- **licenseKey**（String，可為 null）：審核時自動生成
- **status**（String，enum，預設 `pending`）：
  - `pending`：審核中
  - `available`：可啟用
  - `active`：使用中
  - `inactive`：已停用
- **applicant**（String，必填）：申請人
- **appliedAt**（Date，預設 now）：申請時間
- **reviewer**（String，可為 null）：審核人
- **reviewedAt**（Date，可為 null）：審核時間
- **usedAt**（Date，可為 null）：首次使用時間（一次性使用限制）
- **deviceFingerprint**（String，可為 null）：設備指紋（離線授權綁定設備用）
- **activationMethod**（String，enum，可為 null）：`online` / `offline`（啟用方式）
- **notes**（String，可為 null）：備註

### 3.2 索引（唯一性策略很重要）

`serialNumber` 與 `licenseKey` 採用 **partial unique index**：

- 只對「欄位存在且非 null」的文件做 unique 檢查
- 避免 `null` 值大量存在造成 unique index 衝突

索引修復腳本：`scripts/fix-license-indexes.js`

---

## 4. 授權狀態機（Status Flow）

### 4.1 主要狀態流轉

- **建立申請**：`pending`
- **管理端審核通過**：`pending` → `available`
  - 同步生成：`serialNumber` + `licenseKey`
  - 記錄：`reviewer`、`reviewedAt`
- **客戶端成功啟用/驗證（線上或離線）**：`available` → `active`
  - 記錄：`usedAt`、`activationMethod`（`online` 或 `offline`）
  - 離線啟用時額外記錄：`deviceFingerprint`
- **管理端停用**：`available|active` → `inactive`

### 4.2 一次性使用規則（usedAt）

- 只要 `usedAt` 有值，就視為「已使用過」
- 後續再啟用會被拒絕（詳見公開 API 的 `activate` 與 `validate` 行為差異）

---

## 5. Serial Number / License Key 生成規則

來源：`controllers/user/admin.js`（審核與特定狀態更新時使用的 helper）

### 5.1 Serial Number（SN）

- 格式：`SN-YYYYMMDD-XXXX`
- `XXXX`：0 padding 的 4 位數隨機碼
- 唯一性：最多嘗試 10 次，透過 DB 查詢避免重複

### 5.2 License Key（LK）

- 生成輸入：`${serialNumber}:${timestamp}:${random}`
- `random`：`crypto.randomBytes(8).toString("hex")`
- 雜湊：SHA256 → 取前 16 字元
- 格式化：每 4 字元加 `-`，轉大寫
- 產出格式：`XXXX-XXXX-XXXX-XXXX`
- 唯一性：最多嘗試 10 次，透過 DB 查詢避免重複

---

## 6. 公開授權 API（不需登入，客戶端使用）

路由：`routes/license.js`  
控制器：`controllers/common/licenseController.js`  
Base path：`/api/license`

> 注意：公開 API 會套用速率限制（rate limit），避免被暴力嘗試。

### 6.1 POST `/api/license/get-license-key`

**用途**：用 Serial Number 取得 License Key（僅允許 `available` / `active`）。

- Request Body：
  - `serialNumber`（required）
- 行為規則：
  - 找不到授權：404
  - 狀態非 `available|active`：403（拒絕提供 License Key）
- Response（成功）：
  - `licenseKey`
  - `serialNumber`
  - `status`

### 6.2 POST `/api/license/check-status`

**用途**：用 License Key 查授權狀態。

- Request Body：
  - `licenseKey`（required）
- 行為規則：
  - 找不到授權：404
- Response（成功）：
  - `license.id`
  - `license.licenseKey`
  - `license.serialNumber`
  - `license.status`
  - `license.createdAt`
  - `license.usedAt`
  - `license.notes`

### 6.3 POST `/api/license/validate`（敏感操作）

**用途**：驗證 License Key 是否可用；成功時會「佔用」授權（寫入 `usedAt`）並將狀態設為 `active`。

- Request Body：
  - `licenseKey`（required）
- 行為規則（以實作為準）：
  - 找不到授權：回傳 200，但 `valid:false`（含 `code: LICENSE_NOT_FOUND`）
  - 狀態非 `available|active`：回傳 200，但 `valid:false`（含 `code: LICENSE_INACTIVE`）
  - 已使用（`usedAt` 已存在）：回傳 200，但 `valid:false`（含 `code: LICENSE_ALREADY_USED`）
  - 成功：寫入 `usedAt=now`、`status="active"`，回傳 `valid:true`

> `validate` 的設計是「以結果回應」為主（多數情境回 200），讓客戶端能穩定拿到結構化的 `valid` 結果。

### 6.4 POST `/api/license/activate`（敏感操作）

**用途**：啟用授權；成功時會寫入 `usedAt` 並將狀態設為 `active`。

- Request Body：
  - `licenseKey`（required）
- 行為規則：
  - 找不到授權：404
  - 狀態非 `available|active`：403
  - 已使用（`usedAt` 已存在）：403（明確拒絕再次啟用）
  - 成功：寫入 `usedAt=now`、`status="active"`

> `activate` 的設計是「以權限/流程限制為主」（不符合條件直接拋錯），與 `validate` 的回應策略不同。

### 6.5 速率限制（Rate Limit）

在 `routes/license.js` 有區分兩種限制：

- 一般操作（`get-license-key`, `check-status`）：15 分鐘內最多 10 次
- 敏感操作（`validate`, `activate`, `offline-activate`, `offline-verify`）：1 小時內最多 20 次

### 6.6 POST `/api/license/offline-activate`（敏感操作 — 離線授權啟用）

**用途**：處理離線設備產生的「請求檔」，驗證後回傳帶 HMAC-SHA256 簽名的「回應檔」資料。

- Request Body（即請求檔內容）：
  - `serialNumber`（required）
  - `deviceFingerprint`（required）：設備指紋
  - `timestamp`（optional）：請求檔產生時間
  - `nonce`（optional）：隨機值，防重放
- 行為規則：
  - 找不到授權：404
  - 狀態非 `available|active`：403
  - 已使用（`usedAt` 已存在）：403
  - 已綁定其他設備（`deviceFingerprint` 不符）：403
  - 成功：寫入 `usedAt`、`status="active"`、`deviceFingerprint`、`activationMethod="offline"`
- Response（成功）：
  - `serialNumber`
  - `licenseKey`
  - `customerName`
  - `status`
  - `deviceFingerprint`
  - `activatedAt`
  - `nonce`
  - `signature`（HMAC-SHA256 簽名）

#### 離線授權完整流程

```
離線設備                    有網路的電腦                   伺服器
────────                    ──────────                   ──────
1. 輸入 SN
2. 收集設備指紋
3. 產生請求檔 (.json)
         ─── USB 傳輸 ───▶
                            4. 上傳請求檔
                            5. POST /api/license/offline-activate
                                                    ◀── 6. 驗證 SN → 啟用 → 簽名
                            7. 下載回應檔 (.json)
         ◀── USB 傳輸 ───
8. 匯入回應檔
9. 驗簽（HMAC-SHA256）
10. 驗設備指紋
11. 啟用完成
```

#### 請求檔格式範例

```json
{
  "serialNumber": "SN-20260318-1234",
  "deviceFingerprint": "A1B2C3D4-E5F6-7890-ABCD-EF1234567890",
  "timestamp": "2026-03-18T10:30:00.000Z",
  "nonce": "f8a2e1c4d9b0"
}
```

#### 回應檔格式範例

```json
{
  "serialNumber": "SN-20260318-1234",
  "licenseKey": "ABCD-1234-EFGH-5678",
  "customerName": "範例客戶",
  "status": "active",
  "deviceFingerprint": "A1B2C3D4-E5F6-7890-ABCD-EF1234567890",
  "activatedAt": "2026-03-18T10:31:00.000Z",
  "nonce": "f8a2e1c4d9b0",
  "signature": "a1b2c3d4e5f6..."
}
```

### 6.7 POST `/api/license/offline-verify`（敏感操作 — 離線授權驗簽）

**用途**：驗證回應檔的 HMAC-SHA256 簽名是否有效，並同步檢查伺服器上的授權狀態。

- Request Body（即回應檔內容）：
  - `serialNumber`（required）
  - `licenseKey`（required）
  - `customerName`（optional）
  - `status`（optional）
  - `deviceFingerprint`（optional）
  - `activatedAt`（optional）
  - `nonce`（optional）
  - `signature`（required）
- 行為規則：
  - 簽名無效：回 `valid:false`，code: `INVALID_SIGNATURE`
  - 簽名有效但找不到授權：回 `valid:false`，code: `LICENSE_NOT_FOUND`
  - 簽名有效但已停用：回 `valid:false`，code: `LICENSE_INACTIVE`
  - 全部通過：回 `valid:true`

> 此 API 可選用：離線設備若偶爾有網路，可呼叫此 API 做二次確認。

### 6.8 簽名機制說明

來源：`utils/licenseSign.js`

- **演算法**：HMAC-SHA256
- **密鑰**：環境變數 `LICENSE_SIGN_SECRET`
- **簽名方式**：
  1. 取回應檔 payload（不含 `signature` 欄位）
  2. 將所有 key 按字母排序後 JSON 序列化
  3. 用 HMAC-SHA256 計算 → 輸出 hex 字串
- **驗簽方式**：
  1. 用相同方式重算簽名
  2. 使用 `crypto.timingSafeEqual` 比較（防時序攻擊）
- **離線設備端驗簽**：離線設備需內建相同的 `LICENSE_SIGN_SECRET`，用同樣的演算法驗證

> 若未來需要更高安全性（不希望設備端持有簽名密鑰），可改用 RSA 非對稱簽名（伺服器用私鑰簽，設備用公鑰驗）。

---

## 7. 後台授權管理 API（需登入 + 角色權限）

路由：`routes/user.js`  
控制器：`controllers/user/admin.js`  
Base path：`/api/users`

### 7.1 權限規則（角色）

來源：`middlewares/permission.js`

- 授權列表/建立/更新/刪除：`ADMIN` 或 `STAFF`
- 審核（review）：**僅 `ADMIN`**

### 7.2 API 列表

#### 7.2.1 GET `/api/users/licenses`

- 權限：`ADMIN|STAFF`
- Query：
  - `status`（optional）：依狀態篩選
  - `sort`（optional，預設 `-createdAt`）

#### 7.2.2 GET `/api/users/licenses/:id`

- 權限：`ADMIN|STAFF`
- 用途：取得單一授權

#### 7.2.3 POST `/api/users/licenses`

- 權限：`ADMIN|STAFF`
- 用途：建立授權申請（**固定建立為 `pending`**）
- Request Body：
  - `customerName`（required）
  - `applicant`（required）
  - `notes`（optional）
- 重要行為：
  - `serialNumber` / `licenseKey` 不會在此生成（保持 null）

#### 7.2.4 POST `/api/users/licenses/:id/review`

- 權限：**僅 `ADMIN`**
- 用途：審核授權（通過）
- 前置條件：
  - 只允許 `status === "pending"`，否則拒絕
- 成功行為：
  - 生成 `serialNumber` + `licenseKey`
  - `status` → `available`
  - 寫入 `reviewer`、`reviewedAt`

#### 7.2.5 PUT `/api/users/licenses/:id`

- 權限：`ADMIN|STAFF`
- 用途：更新授權（狀態/備註）
- Request Body（依實作）：
  - `status`（optional）
  - `notes`（optional）
- 重要行為（內建自動補齊）：
  - 若將狀態改為 `available` 且尚未有 `serialNumber/licenseKey` → 自動生成（並補審核人/時間）
  - 若將狀態改為 `active` 且尚未 `usedAt` → 自動寫入 `usedAt`

#### 7.2.6 DELETE `/api/users/licenses/:id`

- 權限：`ADMIN|STAFF`
- 用途：刪除授權

---

## 8. 常見情境（流程對照）

### 8.1 標準申請與發放流程（線上）

1. 後台建立授權（`POST /api/users/licenses`）→ `pending`
2. 管理員審核（`POST /api/users/licenses/:id/review`）→ `available` + 產生 SN/LK
3. 客戶端用 SN 取 LK（`POST /api/license/get-license-key`）
4. 客戶端啟用或驗證（`POST /api/license/activate` 或 `POST /api/license/validate`）→ `active` + 寫入 `usedAt`

### 8.2 離線授權流程

1. 後台建立授權 + 管理員審核（同上 1–2）
2. 將 Serial Number 提供給離線設備操作人員
3. 離線設備上輸入 SN → 產生請求檔（含設備指紋）
4. 操作人員在有網路的電腦上傳請求檔（`POST /api/license/offline-activate`）→ 下載回應檔
5. 將回應檔帶回離線設備匯入 → 設備驗簽 + 驗設備指紋 → 啟用完成

### 8.3 已使用過（一次性限制）

- 若授權已 `usedAt`：
  - `validate` 會回 `valid:false`（含 `LICENSE_ALREADY_USED`）
  - `activate` 會直接 403 拒絕

### 8.4 停用

- 後台將狀態設為 `inactive`（`PUT /api/users/licenses/:id`）
- 公開 API 對 `inactive`：
  - `get-license-key`：拒絕（非 `available|active`）
  - `validate`：回 `valid:false`
  - `activate`：403 拒絕

---

## 9. 維運注意事項

- **索引問題**：若歷史上曾有 `serialNumber/licenseKey` unique index 與 null 值衝突，可執行 `scripts/fix-license-indexes.js` 以修復為 partial unique index。
- **回應策略差異**：`validate` 多用 200 回傳結構化結果；`activate` 多用拋錯（403/404）來表達不可啟用，整合客戶端時務必分開處理。
- **離線授權密鑰**：`LICENSE_SIGN_SECRET` 環境變數必須設定，否則離線授權 API 會拋錯。此密鑰也需要內建在離線設備的軟體中用於驗簽。
- **離線設備安全**：目前使用 HMAC-SHA256（對稱式），設備端需持有相同密鑰。若擔心密鑰洩漏，可改用 RSA 非對稱簽名（伺服器私鑰簽名，設備公鑰驗證）。
- **設備綁定**：離線啟用後，`deviceFingerprint` 會綁定到該筆授權，若同一 SN 用不同設備嘗試離線啟用會被拒絕。
- **產品類別**：新增授權時必須指定 `product`（`line-bot` 或 `BA-system`），後台管理與 API 查詢皆支援按 product 篩選。

---

## 10. 前端頁面

### 10.1 後台管理面板（Vue 3 + Vite）

位置：`client/src/views/LicenseView.vue`

- 以 Tab 切換不同產品類別（LINE Bot / BA System）
- 每個 Tab 獨立載入並顯示該產品的授權列表
- 新增授權時需選擇產品類別
- 路由：`/licenses`

### 10.2 公開授權啟用頁面（Nuxt 3）

位置：`pages/license/activate.vue`（Nuxt 前端）

- 路由：`/license/activate`
- 兩種模式：
  - **線上啟用**：輸入 Serial Number → 取得 License Key → 啟用
  - **離線啟用**：上傳請求檔 → 呼叫 offline-activate API → 下載回應檔
- 支援中英文（依 i18n locale 切換）
- 不需要登入，公開存取

---

## 11. 部署設定

### 11.1 環境變數

| 變數 | 位置 | 說明 |
|------|------|------|
| `LICENSE_SIGN_SECRET` | 根目錄 `.env` + `docker-compose.yml` backend environment | HMAC-SHA256 簽名密鑰 |

### 11.2 Docker Compose

`LICENSE_SIGN_SECRET` 已加入 `docker-compose.yml` 的 backend service environment 區塊：

```yaml
- LICENSE_SIGN_SECRET=${LICENSE_SIGN_SECRET}
```

根目錄 `.env` 提供值，docker-compose 自動讀取並傳入容器。

