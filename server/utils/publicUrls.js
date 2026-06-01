/** 官網根網址（sitemap alternates、PDF 導向等） */
export const getPublicSiteUrl = () =>
	(process.env.PUBLIC_SITE_URL || process.env.FRONTEND_PUBLIC_URL || "https://www.yenshow.com").replace(/\/$/, "");

/** API 對外網址（產品圖 /storage 轉絕對路徑，未設則不轉換） */
export const getPublicApiBaseUrl = () => {
	const raw = process.env.PUBLIC_BASE_URL;
	return raw ? raw.replace(/\/$/, "") : undefined;
};
