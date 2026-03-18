---
title: 授權（License / Feature Gate）
tags: [BA, SSOT, License]
---

# 授權（License / Feature Gate）

本文件為授權的 **共用 SSOT**：後端 `requireFeature`、兩前端鎖頭/路由守衛、開發用全開開關，都應以此為入口對齊。

- **後端授權設計（離線/線上）**：`ba-backend/docs/LICENSE_OFFLINE_AND_ONLINE.md`
- **API Surface**：`docs/40-contracts/api-surface.md`
- **環境/部署對照**：`docs/10-setting/env-deploy-matrix.md`

---

## 1) Feature Keys（目前系統用到的 5 個）

- `people_counting`
- `lighting`
- `environment`
- `surveillance`
- `vehicle_access`

> 名詞補充：`docs/10-setting/glossary.md`

---

## 2) 後端：授權狀態與保護

- **狀態 API**：`GET /api/license`（需登入）
- **啟用/更新**：`POST /api/license/activate`（需登入，admin）
- **最終保護**：各路由以 `requireFeature(featureKey)` 回 403（未授權/過期）

---

## 3) 前端：顯示與導流（兩前端共通）

- **路由守衛**：進入需授權路徑時先檢查 `hasFeature`，未授權則提示並導回首頁
- **UI 鎖頭**：在模組入口顯示鎖頭；點擊未授權項目只 toast、不導向
- **注意**：前端只做 UX；真正限制仍以後端為準

---

## 4) 哪些路由需要授權（共用）

| Route                                        | Feature Key       |
| -------------------------------------------- | ----------------- |
| `/construction-monitoring/environment/*`     | `environment`     |
| `/construction-monitoring/people-counting/*` | `people_counting` |
| `/construction-monitoring/surveillance/*`    | `surveillance`    |
| `/construction-monitoring/vehicle-access/*`  | `vehicle_access`  |
| `/infrastructure/lighting/*`                 | `lighting`        |

---

## 5) 開發/測試用全開開關（重要）

| 位置 | Key                                            | 效果                                                                                                                           |
| ---- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 後端 | `LICENSE_OPEN_ALL_FEATURES=true`               | 實際行為以 `licenseService.getLicenseState()` 為準；`requireFeature` 只看回傳的 `features/expired`（請勿假設一定「直接放行」） |
| 前端 | `NUXT_PUBLIC_LICENSE_OPEN_ALL_FEATURES="true"` | 前端不顯示鎖頭、不擋路由（但後端仍可能擋）                                                                                     |
