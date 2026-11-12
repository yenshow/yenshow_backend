# 授權中心（後台）— Quota 改版對接說明（BA System）

> 版本：v2（台數／點數口徑；18 feature keys）  
> 對接對象：授權中心 / 授權平台後台 API  
> 目的：在既有 Feature Gate（`features[]`）之上，維持每模組上限（Quota），並對齊 BA 正式鍵與台／點顯示

---

## 1. 核心原則

- **`features[]`**：僅使用正式鍵（central **18 鍵**；含 `intercom`／`security`，**不要** `access_security`）。
- **`quotas` 為選配**：平台可以不回傳 `quotas`；BA 端視為「不限」。
- **部署樣貌過濾**：BA 端會依 `LICENSE_DEPLOYMENT_PROFILE` 過濾 feature keys；平台若回多餘 keys，會被忽略。
- **副 LK 規則**：副 LK 若帶 `quotas`，BA 端採 **逐 key 加總**（不支援降配/扣減）。
- **對外匯案**：禁止把單位一律叫「額度」；依模組標「台數」或「點數」。

---

## 2. 需要平台提供/維持的欄位

### 2.1 `features: string[]`

正式 18 鍵（central）：

`people_counting`, `roll_call`, `elevator`, `lighting`, `hvac`, `air_circulation`, `drainage`, `power`, `energy`, `fire`, `emergency_rescue`, `smoke_alarm`, `environment`, `surveillance`, `vehicle_access`, `multimedia`, `intercom`, `security`

舊 `access_security`：讀取可接受；**對 BA 回傳一律轉 `intercom`**；新發／審核禁止再寫入。

### 2.2 `quotas: object`（選配）

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

- `quotas` 的 key 必須是 feature key，且出現在 `features[]`。
- **台數模組**：`maxDevices`＝台數上限。
- **點數模組**：點上限仍放 `maxDevices`（欄位名不變）。
- **elevator**：`maxDevices`＝台數；`maxPoints`＝點數。
- 缺 key／`maxDevices` 為 `null`／省略 → 不限；`0` 合法（不可再新增）。

### 2.3 `deploymentProfile: "central" | "construction"`

- `central`：上列 18 鍵  
- `construction`：`people_counting`、`environment`、`surveillance`、`vehicle_access`、`roll_call`  
- 舊拼法 `center` 視同 `central`

---

## 3. 主 LK / 副 LK

### 3.1 主 LK

- `features`：完整授權集合  
- `quotas`：完整授權配額（缺省不限）

### 3.2 副 LK

- `features`：追加授權（BA union）  
- `quotas`：追加台數／點數（BA 逐 key 加總；elevator 兩欄各自加）

---

## 4. 離線授權（驗簽）

- `quotas` 必須納入簽章內容（`signature` 以外欄位排序後 JSON stringify 再 HMAC）
- 平台回傳前會先 normalize（`access_security` → `intercom`）

---

## 5. 建議測試案例

- 不回 `quotas`：BA 顯示不限  
- 台數模組／點數模組分別設上限，usage 顯示「N 台」／「N 點」  
- elevator 同時設 `maxDevices`＋`maxPoints`  
- 新 LK 啟用後可見 `intercom`、`security`，無 `access_security`  
- 舊合約遷移後對 BA 回傳 `intercom`  
- 副 LK 加總、離線檔驗簽通過  
