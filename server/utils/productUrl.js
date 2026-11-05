/**
 * 產品型號 → 單一 URL 路徑段（與官網 utils/productUrl.js 規則一致）
 * 例：YS-7604NI-K1/4K → ys-7604ni-k1-4k
 */
export const toProductUrlSegment = (code) => {
	if (code == null || code === "") return "";
	return String(code)
		.trim()
		.toLowerCase()
		.replace(/[/\\]+/g, "-")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-+|-+$/g, "");
};
