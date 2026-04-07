# 新聞（News）重構規格：對齊 FAQ 之 Schema、API 與舊資料

本文為**已定案方向**的實作說明：新聞後台表單與資料模型參考 **FAQs**（`FaqModal.vue`、`Faq.js`、`faq` 路由／Controller 模式），並包含 **schema 變更**、**API 調整**與**舊資料遷移**須知。

---

## 1. 目標與對齊範圍

| 項目 | 說明 |
|------|------|
| 參考對象 | `client/src/components/FaqModal.vue`、`server/models/Faq.js`、`server/routes/faq.js`、`server/controllers/user/FaqController.js` |
| 新聞專屬 | 保留 **`coverImageUrl`（封面）**；**不提供** `productModel` |
| 頁籤 | **選項 B**：與 FAQ 相同三頁籤（見 §2） |
| 內容型態 | **主要內容**改為與 FAQ **單一雙語 Tiptap 區塊**（同 `answer` 模式），廢除可排序之多區塊編輯 |
| 圖／影片說明 | **替代文字、說明**不在正文編輯器內處理，改在 **「附加檔案」** 分頁維護（見 §4、§5） |

---

## 2. 頁籤結構（選項 B）

與 FAQ 一致，建議命名與順序：

| 頁籤 key（範例） | 顯示文案（可與 FAQ 統一） | 內容摘要 |
|------------------|---------------------------|----------|
| `general` | 基本資訊 | 模態外殼、grid 排版、作者／發布狀態、**雙語主分類＋子分類**、發布日期、**標題（TW/EN）**、**摘要（完全比照 FAQ：TW/EN 按鈕 + textarea）**、相關新聞、**封面圖片（僅新聞，置於本頁最底部）** |
| `mainContent` | 主要內容 | **單一** `RichTextBlockEditor`（雙語），對應 schema 中單一正文欄位（見 §4） |
| `attachments` | 附加檔案 | 多圖、多影片、多文件上傳與列表；**圖片／影片的替代文字與說明在此編輯**（見 §5） |

**封面圖片（已定案）：** 仍放在 **「基本資訊」頁籤最下方**，不移至附加檔案。

**不包含：** `productModel`（FAQ 基本資料 grid 內的產品型號欄位，新聞不出現）。

---

## 3. 摘要區（完全參考 FAQ）

- **UI/UX**：與 `FaqModal` 相同——摘要區塊標題、**TW / EN 小按鈕切換**、各語系 `textarea`、`rows` 與 placeholder 風格一致。
- **驗證**：與 FAQ 表單邏輯對齊（若 FAQ 對摘要有前端必填，新聞一併對齊；若僅後端選填，亦與 `Faq.js` 的 `summary` 定義一致）。
- **後端**：`summary: { TW, EN }` 維持與 FAQ 相同語意（`trim` 等），**不需**為新聞另訂規則，除非產品明定新聞摘要必填（再於 `News.js` 加 `required` 並搭配遷移／補齊舊資料）。

---

## 4. Schema 設計（`server/models/News.js`）

### 4.1 與 FAQ 對齊的欄位

| 欄位概念 | FAQ | 新聞（建議） |
|----------|-----|----------------|
| 標題／問題 | `question.TW` / `question.EN` | 維持 **`title.TW` / `title.EN`**（必填、EN 用於 slug，邏輯同現況與 FAQ） |
| 長文 | `answer.TW` / `answer.EN`（Mixed, Tiptap doc） | **`article.TW` / `article.EN`**：`{ TW, EN }` **同 `answer` 型別與預設空 doc**（欄位名已定案） |
| 摘要 | `summary` | 同 FAQ |
| 分類 | `category.main.TW/EN` + `category.sub.TW/EN` | **相同結構**；enum 值改為新聞既有三類之中英文對照（固定對照表見 §10） |
| 其他 | `author`, `publishDate`, `isActive`, `slug`, `relatedFaqs` | 新聞對應 `author`, `publishDate`, `isActive`, `slug`, **`relatedNews`** |
| 附件 | `imageUrl[]`, `videoUrl[]`, `documentUrl[]` 僅字串 | 新聞 **API 流程**可比照 FAQ（multer、寫回 URL），**儲存為子文件陣列**（見 §5） |

### 4.2 新聞專屬欄位

- **`coverImageUrl`**：保留，行為與現況一致（基本資料底部上傳）。

### 4.3 移除或廢止

- **`content`（區塊陣列）**：由單一正文 + 附件結構取代；正式上線前須完成遷移與前台改讀新欄位。
- **子元件對應之區塊型別**：`ImageBlockEditor` / `VideoBlockEditor` / `DocumentBlockEditor` 於「主要內容」流程中 **不再使用**（可刪除或僅保留給舊版相容期）。

### 4.4 不新增

- **`productModel`**：新聞不需要。

---

## 5. 附加檔案與「替代文字／說明」（已定案：子文件陣列）

FAQ 現況為 **`imageUrl` / `videoUrl` / `documentUrl` 僅存 URL 字串**，**沒有**圖片替代文字或圖說欄位。新聞附加檔案**已定案**採用 **Mongoose 子文件陣列**，以利在「附加檔案」分頁維護 **TW/EN 替代文字與說明**，並區分**上傳檔**與**嵌入 URL**（如 YouTube）。

### 5.1 欄位形狀（實作約定）

| 欄位 | 子文件重點 |
|------|------------|
| `attachmentImages` | `{ url: String（必填）, imageAltText: { TW, EN }, imageCaption: { TW, EN } }` |
| `attachmentVideos` | 需支援兩種來源（見下表） |
| `attachmentDocuments` | `{ url: String（必填）, documentDescription: { TW, EN } }`（承接舊 `document` 區塊） |

**`attachmentVideos` 子文件（已定案）：**

| 用途 | 建議欄位 | 說明 |
|------|-----------|------|
| 上傳影片檔 | `source: 'upload'`、`url`（儲存後的檔案 URL） | 與 FAQ 多影片上傳流程對應；`embedUrl` 不填 |
| 嵌入第三方（YouTube 等） | `source: 'embed'`、`embedUrl`（完整 watch / embed 連結） | 對應舊 `itemType: 'videoEmbed'` 的 `videoEmbedUrl`；`url` 可不填 |
| 共通 | `videoCaption: { TW, EN }` | 對應舊區塊 `videoCaption`，可為空字串 |

> 實作時 `source` 可用 `enum: ['upload', 'embed']`；Controller 驗證「upload 必有 `url`、embed 必有 `embedUrl`」。

### 5.2 後端驗證與 API

`NewsController` 改為驗證 `article` 與上述子文件陣列；可複用 **FaqController** 的 multer 合併邏輯，但寫入時須依**陣列索引**把新 URL 填回對應子文件的 `url`（嵌入列不經檔案上傳則僅更新 `embedUrl`／caption）。

---

## 6. API 與路由

| 項目 | 建議 |
|------|------|
| 路由 | `server/routes/news.js` 比照 `faq.js`，使用 **`multer.fields`** 多欄位上傳（封面可維持獨立 field，或與 FAQ 一樣拆成圖／影／文件欄位並在 Controller 分派） |
| 工具 | `server/utils/fileUpload.js` 增補或複用 **news** 專用 middleware（類似 `getFaqUpload`／欄位命名與 FAQ 對齊以利維護） |
| 建立／更新 | `createItem` / `updateItem`：解析 JSON 欄位中的 `article`、`category`、`attachmentImages` 等，並將上傳檔案 URL **依索引或順序**寫回對應陣列（對照 `FaqController` 實作方式） |
| 公開 API | 列表／詳情回傳型別變更：前端與 SSG/SEO 使用處需改讀 `article` 與新附件結構；`category` 由字串改物件時，**篩選 query** 要約定用 `main.TW` 或統一 query 參數 |

---

## 7. 舊資料遷移

### 7.1 必做

| 舊欄位／型態 | 動作 |
|--------------|------|
| `category: String` | Migration：對照表轉成 `{ main: { TW, EN }, sub: { TW: '', EN: '' } }` |
| `content: [區塊]` | 轉成單一 **`article`**，並將 **image / videoEmbed / document** 區塊轉成附件陣列（含既有 metadata） |

### 7.2 `content` → `article` 與附件（已定案合併策略）

以下規則以實際資料形態為準；**mongoexport / Compass 匯出**中若出現 `NumberInt('2')` 等 BSON 標記，遷移腳本應將 `heading.attrs.level` 等正規化為 **JavaScript `number`**，避免 Tiptap 解析異常。

#### A. `itemType: 'richText'`

- **單一** `richText` 區塊（與下方完整稿件範例相同）：  
  - `article.TW = 該區塊.richTextData.TW`  
  - `article.EN = 該區塊.richTextData.EN`  
  兩者皆應為 `{ type: 'doc', content: [...] }`，**原樣沿用**，不重排段落。

- **多個** `richText` 區塊：對 **`TW`、`EN` 各別**建立一個合併後的 doc：  
  - `merged.type = 'doc'`  
  - `merged.content = []`，再依 `content` 陣列順序（或 `sortOrder`）遍歷每個 richText 區塊，將該語系的 `doc.content`**陣列元素依序 `push`** 進 `merged.content`。  
  - **區塊之間**（可選）：插入與現有稿件習慣一致的分隔用段落，例如  
    `{ type: 'paragraph', content: [{ type: 'text', text: '________________________________________' }] }`  
    （與貴司既有內容中作為視覺分隔的底線段落一致時採用；否則可改為單一空白段落或編輯器支援之 horizontal rule）。

#### B. `itemType: 'videoEmbed'`（例：YouTube `videoEmbedUrl`）

- **不要**把影片寫進 `article` 的 Tiptap（舊區塊中冗餘的空 `richTextData` 可忽略）。
- 新增一筆 **`attachmentVideos`** 子文件：  
  - `source: 'embed'`  
  - `embedUrl: videoEmbedUrl`（例：`https://www.youtube.com/watch?v=...`）  
  - `videoCaption: { TW: videoCaption.TW ?? '', EN: videoCaption.EN ?? '' }`

#### C. `itemType: 'image'`

- 新增一筆 **`attachmentImages`**：`url`（或待上傳占位符依現行 API 規則）、`imageAltText`、`imageCaption` 自區塊帶入。

#### D. `itemType: 'document'`

- 新增一筆 **`attachmentDocuments`**：`url`、`documentDescription` 自區塊帶入。

#### E. 處理順序

- 依 **`content` 陣列順序**處理 richText（合併）與非 richText（append 至對應附件陣列），以利前台仍可按「文章流」還原媒體順序（若前台有「依序渲染正文＋附件」需求，可另加 `displayOrder` 欄位；未加時以陣列順序為準）。

#### F. 範例對照（摘要）

與下列結構一致時：

1. 第一個元素：`richText`，內含完整雙語長文 → **`article.TW` / `article.EN` 直接等於** `richTextData.TW` / `richTextData.EN`。  
2. 第二個元素：`videoEmbed`，`videoEmbedUrl` 為外部連結、`videoCaption` 可能為空 → **`attachmentVideos` 新增一筆 `source: 'embed'`**。

### 7.3 驗證與回滾

- Staging 全量跑 migration，抽樣對照舊稿在後台／前台的顯示。
- 建議保留舊欄位 `content` 一段時間唯讀或備份表，確認無誤後再 drop 或封存。

---

## 8. 前端實作清單

| 工作 | 說明 |
|------|------|
| `NewsModal.vue` | 頁籤改 `general` / `mainContent` / `attachments`；外殼與 FAQ 一致；基本資料 grid **不含** productModel；摘要區**完全複製 FAQ 行為**；封面在基本資料底部 |
| 主要內容 | 單一 `RichTextBlockEditor`，`v-model` 綁定 **`article`** |
| 附加檔案 | 複製 FAQ 附件 UX（多檔上傳、預覽、移除），並為**每一筆圖／影**加上表單欄位編輯 TW/EN 替代文字與說明（文件則加描述） |
| 移除 | 「新增區塊」選單、`contentBlocks`、區塊上下移／刪除邏輯與對應 API 組裝 |
| Store / API | `FormData` 欄位名與後端 multer **一致**；建立／編輯 payload 改送新結構 |
| 前台 | 新聞詳情／列表：分類篩選、正文渲染、附件區塊（含 alt/caption）改用新 schema |

---

## 9. 相關檔案索引

| 層級 | 檔案 |
|------|------|
| 參考（FAQ） | `FaqModal.vue`、`Faq.js`、`faq.js`、`FaqController.js` |
| 新聞（必改） | `NewsModal.vue`、`newsStore`（若有）、呼叫 news API 的 composables |
| 新聞（可移除或縮減） | `client/src/components/news/ImageBlockEditor.vue`、`VideoBlockEditor.vue`、`DocumentBlockEditor.vue`（若無其他引用） |
| 後端 | `News.js`、`NewsController.js`、`news.js`（路由）、`fileUpload.js` |
| 遷移 | 建議 `server/scripts/` 或 `migrations/` 單次腳本（依專案慣例） |
| 前台 | 所有使用 `news.content`、`news.category` 字串、內嵌區塊渲染處 |

---

## 10. 主分類中英文 enum（已定案）

**說明：** FAQ 在 `Faq.js` 內**本來就有** `category.main.TW` 與 `category.main.EN` 各自的 **Mongoose `enum`**；新聞在重構前則**只有**繁中字串 `category`。為避免散落字面值、並供遷移（`category` 字串 → `category.main`）與前台對照，專案已集中於 **`server/constants/mainCategories.js`**，`Faq.js`／`News.js` 由該檔引入 enum 陣列。

### 10.1 FAQ（`FAQ_CATEGORY_MAIN_PAIRS`）

| TW（主分類） | EN（主分類） |
|--------------|--------------|
| 名詞解說 | Glossary |
| 產品介紹 | Product Introduction |
| 故障排除 | Troubleshooting |

### 10.2 新聞（`NEWS_CATEGORY_MAIN_PAIRS`，未來 `category.main` 用）

| TW（主分類） | EN（主分類） |
|--------------|--------------|
| 智慧方案 | Smart Solutions |
| 產品介紹 | Product Introduction |
| 品牌新聞 | Brand News |

**輔助函式：** `faqCategoryMainTwToEn`、`newsCategoryMainTwToEn` 供遷移或後台自動帶 EN 使用。

> 「產品介紹」在 FAQ 與新聞中 **TW 字串相同**（產品介紹），**EN 亦相同**（Product Introduction），屬兩條目各自 enum 内的合法值，並非共用單一 Mongo 集合。

---

## 11. 前台渲染（已定案）

- **主要內容**（`article` 渲染區）與 **附加檔案**（圖／影／文件列表）在詳情頁 **分開區塊顯示**，不要求與舊 `content` 陣列順序交錯還原。  
- 因此遷移與 API **不必**為了前台再加 `displayOrder`（除非日後產品改為「交錯排版」）。

---

## 12. 占位符（`__NEW_CONTENT_*__`）與 migration

**用途（現行程式）：** 字串 `__NEW_CONTENT_IMAGE__`、`__NEW_CONTENT_VIDEO__`、`__NEW_CONTENT_DOCUMENT__` 僅在 **建立／更新新聞的請求處理** 中，由前端＋`NewsController` 辨識「此 content 區塊要搭配即將上傳的檔案」，並非一般 **已入庫** 資料的正常狀態。

**已入庫資料：** 成功儲存後應為實際 URL 或儲存路徑、嵌入網址等；**migration 腳本無需**針對占位符實作轉換。若極端情況 DB 內出現占位符，目前 **無**專用修復流程——**維持不額外處理**；改以人工或個案修稿。

---

## 13. `newsContentItemSchema` 與前端元件的關係（總結）

**是：** 重構後若從 `News.js` **移除** `newsContentItemSchema` 與 **`content` 區塊陣列**，改為 **`article` + 附件子文件陣列**，後端與前端資料契約就與現狀**脫鉤**。

| 後端 | 前端（需連動） |
|------|----------------|
| 刪除 `content` / `newsContentItemSchema` | `NewsModal.vue` 移除區塊列表、`getBlockComponent`、占位符與多檔上傳對區塊索引的組裝 |
| 新增 `article`、附件欄位 | 「主要內容」單一 `RichTextBlockEditor`；「附加檔案」比照 FAQ 並加上子文件 metadata 表單 |
| `validateContentItems` 等 | 改驗證 `article` 與附件結構 |

因此 **最主要的結構性變更**確實是 **拿掉區塊子 schema**，並讓 **`client/src/components/news` 從「多區塊編輯」改成「單一正文 + 附件分頁」**；`ImageBlockEditor` / `VideoBlockEditor` / `DocumentBlockEditor` 在該流程下可汰除或僅保留到他處重用。

---

## 14. 待後續重構時處理（非本文枚舉待定案）

其餘如 **`category` 改為與 FAQ 相同物件結構**、`article`／附件寫入 API 等，仍依 §4–§8 實作；**主分類中英文**之**字面值**已見 §10，無須再猜。

---

## 15. 總結

- 頁籤採 **選項 B**；**摘要**與 FAQ 一致；**封面**留在基本資料底部；**不提供 productModel**。  
- **主要內容**為 **`article`**；**附加檔案**為**子文件陣列**；FAQ 僅作流程與 UI 參考。  
- **主分類 enum**：FAQ／新聞對照已集中 **`server/constants/mainCategories.js`**（§10）。  
- **前台**：正文與附件 **分開顯示**（§11）。  
- **占位符**：僅 API 流程使用；migration **不另做**（§12）。  
- **`newsContentItemSchema` 移除**即代表改資料模型，**前端 news 元件必須跟著改**（§13）。

---

## 16. 修訂紀錄

| 日期 | 摘要 |
|------|------|
| 先前 | 定案：`article`、附件子文件、`attachmentVideos` upload/embed、`content` 遷移規則。 |
| （本版） | 新增 §10 分類 enum 與 `mainCategories.js`；§11 前台分開顯示；§12 占位符說明；§13 `newsContentItemSchema` 與前端關係。 |
