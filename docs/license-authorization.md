# BA 系統授權（License / Feature Gate / Quota）— 契約文件

> 最後更新：2026-04-08  
> 本檔為 **唯一授權文件 SSOT**：涵蓋授權平台契約、BA 後端落地、前端使用方式，以及 Quota/Usage 計數口徑。  
> 變更路由/回應時，需同步更新：`[api-surface.md](api-surface.md)`。  
> `openapi/openapi.yaml` 採骨架策略（不維護 `paths`），僅在需要機器可讀規格時再補齊。

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

平台合約可帶多個 feature 字串。BA **後端**依部署樣貌只接受、正規化與 gate 對應子集。

### 2.1 `LICENSE_DEPLOYMENT_PROFILE`

| 值                | 說明                                                                                                                                                           |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `central`（預設） | 11 keys：`people_counting`、`lighting`、`hvac`、`drainage`、`power`、`fire`、`emergency_rescue`、`environment`、`surveillance`、`vehicle_access`、`multimedia` |
| `construction`    | 4 keys：`people_counting`、`environment`、`surveillance`、`vehicle_access`                                                                                     |

程式：`ba-backend/src/services/licenseService.js` → `getActiveFeatureKeys()`。

### 2.2 Feature Gate（後端為準）

- 後端 `requireFeature(featureKey)` 未授權回 `403 FEATURE_NOT_LICENSED`。
- 前端可用 `GET /api/license` 的 `features[]` 做 UI 鎖頭/路由守衛，但 **是否放行以後端為準**。

### 2.3 `LICENSE_OPEN_ALL_FEATURES`

- 實際行為由 `licenseService.getLicenseState()` 決定：回傳部署允許 keys 的全集。
- **同時略過 Feature Gate 與 Quota 檢查**（開發/測試用；正式環境請關閉）。

---

## 3. Quota（配額）與 Usage（用量）

### 3.1 平台回傳契約（quotas）

平台在既有 `result.features` 外，可回傳選配 `result.quotas`：

```json
{
	"features": ["people_counting", "lighting"],
	"quotas": {
		"lighting": { "maxDevices": 2 }
	}
}
```

規則：

- `quotas` key 必須是 feature key。
- `maxDevices` 為非負整數。
- 缺 key / `maxDevices` 為 `null`/缺值 → 視為不限（後端不落地）。

### 3.2 本地落地與副 LK 合併

- 本地儲存於 `system_settings.license_quotas`（JSON）。
- **主 LK**：覆寫 quotas。
- **副 LK**：逐 key **加總**（additive）。
- 寫入前後都需套用 `LICENSE_DEPLOYMENT_PROFILE` 過濾。

### 3.3 Usage 計數口徑（重點）

`GET /api/license` 回傳的 `usage.{featureKey}.usedDevices` 為後端計算結果（用於 UI 顯示與 Quota 檢查）。

#### 3.3.1 device type 映射（非 controller）

- `camera -> surveillance`
- `sensor -> environment`
- `access_control -> people_counting`

以上為 **以 `devices` 表依 `device_types.code` 計數**。

#### 3.3.2 controller 類系統（做法 B；統一口徑）

對 `lighting / hvac / drainage / power / fire / emergency_rescue`：

- **以 `location_systems` 綁定為準**：`location_systems.system_type = featureKey`
- **設備來源**：從 `location_systems.system_config.device_id`（或相容 `deviceId`）取得 device
- **系統內去重**：同一系統下重複綁到同一台 controller 只算 1 台（`DISTINCT device_id`）
- **跨系統各算各的**：同一台 controller 若同時被 lighting 與 fire 綁定，會同時計入兩個系統的 usage
- **型別約束**：上述系統的綁定設備必須是 `device_types.code='controller'`

---

## 4. BA 對外 API（授權相關）

Base path：`/api/license`（見 `ba-backend/src/routes/licenseRoutes.js`）

| 方法 | 路徑                    | 權限  | 說明                                                        |
| ---- | ----------------------- | ----- | ----------------------------------------------------------- |
| GET  | `/`                     | 登入  | 本地授權狀態（含 `features/quotas/usage`）                  |
| POST | `/activate`             | admin | 線上啟用（body `{ licenseKey }`）或手動（`{ features[] }`） |
| POST | `/offline-request-file` | admin | 產生離線請求檔                                              |
| POST | `/offline-import`       | admin | 匯入離線回應（含 `signature`）                              |
| POST | `/reset`                | admin | 清空本地授權狀態（測試/維運用）                             |

常見錯誤碼：

- `FEATURE_NOT_LICENSED`（403）
- `LICENSE_QUOTA_EXCEEDED`（403）

---

## 5. Quota 檢查時機

### 5.1 controller

controller 類系統的用量由「系統綁定」決定，因此 Quota 檢查在：

- 建立/更新 `location_systems`（`/api/locations`）時進行

> 注意：建立 controller 設備（`POST /api/devices`）本身不代表「已被某系統使用」，因此不作為 controller Quota 的檢查點。

### 5.2 非 controller（camera/sensor/access_control）

仍可在建立 `devices` 時依 `deviceTypeCode -> featureKey` 做 Quota 檢查。

---

## 6. 平台 API（摘要）

平台 Base URL 由後端環境變數 `LICENSE_PLATFORM_API_BASE_URL` 決定（至 `/api/license` 前綴之完整根）。

| 方法 | 路徑                | 用途                    |
| ---- | ------------------- | ----------------------- |
| POST | `/activate`         | 線上啟用（主/副 LK）    |
| POST | `/offline-activate` | 離線啟用（回簽名 JSON） |

離線簽名：HMAC-SHA256，金鑰 `LICENSE_SIGN_SECRET`，BA 後端驗簽。
