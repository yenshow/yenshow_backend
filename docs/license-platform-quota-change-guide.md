# 授權中心（後台）— Quota 改版對接說明（BA System）

> 版本：v1（Quota 選配）  
> 對接對象：授權中心 / 授權平台後台 API  
> 目的：在既有 Feature Gate（`features[]`）之上，新增「每模組設備數量上限（Quota）」能力

---

## 1. 核心原則

- **`features[]` 不變**：Feature Gate 仍以 `features: string[]` 表達授權模組。
- **`quotas` 為選配**：平台可以不回傳 `quotas`；BA 端視為「不限」。
- **部署樣貌過濾**：BA 端會依 `LICENSE_DEPLOYMENT_PROFILE` 過濾 feature keys；平台若回多餘 keys，會被忽略。
- **副 LK 規則**：副 LK 若帶 `quotas`，BA 端採 **逐 key 加總**（不支援降配/扣減）。

---

## 2. 需要平台提供/維持的欄位

以下皆位於平台回傳的 `result` 內（既有 `features` 保持不變）：

### 2.1 `features: string[]`（既有）

- 授權的功能鍵集合（例：`people_counting`、`environment`、`surveillance`...）

### 2.2 `quotas: object`（新增、選配）

建議格式：

```json
{
  "features": ["people_counting", "surveillance", "environment"],
  "quotas": {
    "people_counting": { "maxDevices": 2 },
    "surveillance": { "maxDevices": 10 },
    "environment": { "maxDevices": 20 }
  }
}
```

規則：

- `quotas` 的 key 必須是 feature key（字串）。
- `quotas[featureKey].maxDevices`：
  - 非負整數
  - **0 合法**（代表此模組完全不可新增設備）
- 下列情況視為「不限」：
  - `quotas` 不存在
  - 某 feature 沒有 `quotas[featureKey]`
  - `maxDevices` 為 `null` 或省略

平台端建議校驗：

- 若 `quotas` 有某 key，則該 key **必須同時出現在 `features[]`**，避免「有 quota 無功能」的矛盾狀態。

### 2.3 `deploymentProfile: "central" | "construction"`（新增、必填）

用途：

- 區分平台後台授權管理要使用的 **feature keys 集合**（見下節），並對應 BA 端的 `LICENSE_DEPLOYMENT_PROFILE` 過濾規則。

建議規則：

- `deploymentProfile="central"`：智慧管理平台（中控）
- `deploymentProfile="construction"`：工地管理平台

若平台端收到 `deploymentProfile="center"`（舊拼法），建議視同 `central`。

#### 2.3.1 Feature keys 集合（依部署樣貌）

`central`：

- `people_counting`
- `lighting`
- `drainage`
- `fire`
- `emergency_rescue`
- `environment`
- `surveillance`
- `vehicle_access`

`construction`：

- `people_counting`
- `environment`
- `surveillance`
- `vehicle_access`

---

## 3. 主 LK / 副 LK 行為（平台需配合）

### 3.1 主 LK（首次啟用）

- 平台回傳 `features`：代表完整授權集合
- 平台回傳 `quotas`：代表完整配額集合（缺省視為不限）

### 3.2 副 LK（Extension）

平台需能表達「這是一把副 LK」，既有做法可維持（例如 `result.isExtension=true`）。

- `features`：代表追加授權（BA 端會做 union 合併）
- `quotas`：代表追加配額（BA 端會做逐 key 加總）

不支援（v1）：

- 以副 LK 降低配額
- 以副 LK 移除某 feature 的 quota（當作不限/刪除）

---

## 4. 離線授權（驗簽）注意事項

若離線授權回應檔新增 `quotas`，則：

- `quotas` 必須納入簽章內容（`signature` 以外的所有欄位排序後 JSON stringify 再 HMAC）
- BA 端會用相同規則驗簽；若平台忘記把 `quotas` 納入簽名，會導致驗簽失敗

---

## 5. 測試/開發環境（平台可忽略）

BA 後端在 `LICENSE_OPEN_ALL_FEATURES=true` 時會略過 Feature Gate 與 Quota 檢查，平台不需額外提供 bypass 欄位。

---

## 6. 建議測試案例（平台端自測）

- **不回 `quotas`**：BA 顯示 `∞`，新增設備不受限
- **單一 feature 設 quota**：BA `usage` 正常計數，超過回 `LICENSE_QUOTA_EXCEEDED`
- **`maxDevices=0`**：BA 直接拒絕新增設備（used>=0 即滿）
- **副 LK 加總**：主 LK max=2 + 副 LK max=3 → BA 最終 max=5
- **離線檔帶 quotas**：驗簽可通過

