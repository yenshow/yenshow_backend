/**
 * 內容主分類：FAQ 與新聞各自一組，繁中與英文 enum 須與 Mongoose model 一致。
 * 遷移或後台可 import pairs／twToEn 使用。
 */

/** @type {ReadonlyArray<{ tw: string, en: string }>} */
export const FAQ_CATEGORY_MAIN_PAIRS = Object.freeze([
	{ tw: "名詞解說", en: "Glossary" },
	{ tw: "產品介紹", en: "Product Introduction" },
	{ tw: "故障排除", en: "Troubleshooting" }
]);

/** @type {ReadonlyArray<{ tw: string, en: string }>} */
export const NEWS_CATEGORY_MAIN_PAIRS = Object.freeze([
	{ tw: "智慧方案", en: "Smart Solutions" },
	{ tw: "產品介紹", en: "Product Introduction" },
	{ tw: "品牌新聞", en: "Brand News" }
]);

export const FAQ_CATEGORY_MAIN_TW_ENUM = FAQ_CATEGORY_MAIN_PAIRS.map((p) => p.tw);
export const FAQ_CATEGORY_MAIN_EN_ENUM = FAQ_CATEGORY_MAIN_PAIRS.map((p) => p.en);

export const NEWS_CATEGORY_MAIN_TW_ENUM = NEWS_CATEGORY_MAIN_PAIRS.map((p) => p.tw);
export const NEWS_CATEGORY_MAIN_EN_ENUM = NEWS_CATEGORY_MAIN_PAIRS.map((p) => p.en);

/**
 * @param {string} tw
 * @returns {string | undefined} 對應的 EN，無則 undefined
 */
export const faqCategoryMainTwToEn = (tw) => FAQ_CATEGORY_MAIN_PAIRS.find((p) => p.tw === tw)?.en;

/**
 * @param {string} tw
 * @returns {string | undefined}
 */
export const newsCategoryMainTwToEn = (tw) => NEWS_CATEGORY_MAIN_PAIRS.find((p) => p.tw === tw)?.en;
