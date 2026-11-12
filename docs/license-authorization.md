# BA 系統授權（License / Feature Gate / Quota）— 契約文件

> 最後更新：2026-11-12  
> 本檔為 **授權平台側契約摘要 SSOT**（對齊 BA `FEATURE_KEYS_CENTRAL` 18 鍵與台／點口徑）。  
> BA 後端實作細節仍以 ba-system 契約為準；**本平台不得改 ba-system 程式**。

---

## 1. 系統概覽

本平台為 **BA（Building Automation）** 提供 **買斷制、以功能模組（Feature）為粒度** 的授權。

### 1.1 主 LK / 副 LK

- **主 License Key（主 LK）**：首次審核產生，代表一份合約，綁定初始功能與設備。
- **副 License Key（副 LK）**：追加模組時先 `pending`，審核通過後才有 `licenseKey`；隸屬某一主 LK，一主可有多副。

### 1.2 設計原則（摘要）

- 使用者流程（線上／離線）以 **License Key** 為操作鍵；**Serial Number** 僅供後台／稽核。
- **deviceFingerprint** 為設備識別，線上與離線皆需記錄；平台啟用副 LK 時以 **DB 中主 LK 的指紋**為準。
- BA 前端不直連平台；由 BA 後端代理呼叫平台並落地本地狀態。

---

## 2. Feature keys（模組授權）

### 2.1 `LICENSE_DEPLOYMENT_PROFILE`／白名單

| 值 | 說明 |
| ---- | ---- |
| `central`（預設） | **18 鍵**（與 BA `FEATURE_KEYS_CENTRAL` 完全一致）：`people_counting`、`roll_call`、`elevator`、`lighting`、`hvac`、`air_circulation`、`drainage`、`power`、`energy`、`fire`、`emergency_rescue`、`smoke_alarm`、`environment`、`surveillance`、`vehicle_access`、`multimedia`、`intercom`、`security` |
| `construction` | 5 keys：`people_counting`、`environment`、`surveillance`、`vehicle_access`、`roll_call` |

顯示名（平台 UI）：

| key | 顯示名 |
| --- | --- |
| `people_counting` | 門禁管理 |
| `roll_call` | 時段簽到 |
| `intercom` | 對講系統 |
| `security` | 保全系統 |
| （其餘） | 見後台 catalog／`FEATURE_LABELS` |

#### 舊鍵相容

- 舊 `access_security`：**讀取可接受**；**寫出／對 BA 回傳／審核通過落盤一律轉 `intercom`**。
- 新發 LK／審核通過：**禁止再寫入 `access_security`**。
- `intercom` 與 `security` **分開**，不可合併。
- 舊 `visitor` 已自 central 白名單移除；對 BA 回傳時略過。

### 2.2 Feature Gate（後端為準）

- BA 後端 `requireFeature(featureKey)` 未授權回 `403 FEATURE_NOT_LICENSED`。
- 前端可用授權狀態的 `features[]` 做 UI 鎖頭，但 **是否放行以後端為準**。

### 2.3 `LICENSE_OPEN_ALL_FEATURES`

- 開發／測試用；正式環境請關閉（同時略過 Feature Gate 與 Quota 檢查）。

---

## 3. Quota（授權配額：台數／點數）與 Usage

### 3.1 顯示口徑（對客戶／業務／審核 UI）

- **禁止**把所有模組單位都叫「額度」。
- **台數模組** → 標「台數」，數字後綴「台」。
- **點數模組** → 標「點數」，數字後綴「點」。
- **elevator** → 同時顯示「台數」與「點數」（例：`2 台／40 點`）。
- 技術／API／DB 仍可用 `quotas`、`maxDevices` 等欄位名；UI label 用「台數上限／點數上限」。

#### 單位對照

**台數（devices）**  
`people_counting`、`roll_call`、`vehicle_access`、`surveillance`、`multimedia`、`intercom`

**點數（points）** — wire 仍用 `maxDevices` 存點上限  
`lighting`、`hvac`、`air_circulation`、`drainage`、`power`、`energy`、`fire`、`emergency_rescue`、`smoke_alarm`、`environment`、`security`  
（保全 DI 點綁在 `security`；門禁／讀卡機台數歸 `people_counting`，不要另計 security 台）

**台數＋點數（elevator）**  
- `maxDevices`＝梯控主機台數  
- `maxPoints`＝樓層偵測 DI 點數  

### 3.2 平台回傳契約（quotas）

```json
{
  "features": ["people_counting", "intercom", "security", "lighting", "elevator"],
  "quotas": {
    "people_counting": { "maxDevices": 50 },
    "intercom": { "maxDevices": 20 },
    "security": { "maxDevices": 100 },
    "lighting": { "maxDevices": 80 },
    "elevator": { "maxDevices": 2, "maxPoints": 40 }
  }
}
```

規則：

- `quotas` key 必須是正式 feature key（不得再出現 `access_security`）。
- `maxDevices` 為非負整數；缺 key／`null` → 視為不限。
- 僅 `elevator` 可帶 `maxPoints`。
- 點數模組的點上限仍放在 `maxDevices`（欄位名不變）。

### 3.3 本地落地與副 LK 合併（BA）

- **主 LK**：覆寫 quotas。
- **副 LK**：逐 key **加總**（additive）；elevator 的 `maxDevices`／`maxPoints` 各自加總。

### 3.4 Usage 顯示

- BA usage：台數模組顯示「N 台」；點數模組「N 點」；elevator 同時顯示台與點。
- Wire：`usedDevices`／`usedPoints`（欄位名不變）。

---

## 4. 平台 API（摘要）

| 方法 | 路徑 | 用途 |
| ---- | ---- | ---- |
| POST | `/api/license/activate` | 線上啟用（主/副 LK）；`result.features`／`result.quotas` 已 normalize |
| POST | `/api/license/offline-activate` | 離線啟用（回簽名 JSON）；簽章內容含 normalize 後的 features／quotas |

離線簽名：HMAC-SHA256，金鑰 `LICENSE_SIGN_SECRET`，BA 後端驗簽。

---

## 5. 遷移

平台腳本：`server/scripts/mongoDB/migrate-access-security-to-intercom.js`  
將 DB 中 `features`／`quotas` 的 `access_security` 轉為 `intercom`。
