/**
 * 下載授權 PDF 用的 Noto Sans TC（Subset OTF），供 pdfkit 嵌入中文。
 * 由 postinstall 呼叫；失敗時略過（執行環境需自行放入 fonts/NotoSansTC-Regular.otf）。
 */
import fs from "fs";
import https from "https";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const destDir = path.join(__dirname, "../fonts");
const destFile = path.join(destDir, "NotoSansTC-Regular.otf");
const url =
	"https://raw.githubusercontent.com/googlefonts/noto-cjk/main/Sans/SubsetOTF/TC/NotoSansTC-Regular.otf";

const download = () =>
	new Promise((resolve, reject) => {
		https
			.get(url, (res) => {
				if (res.statusCode !== 200) {
					reject(new Error(`HTTP ${res.statusCode}`));
					return;
				}
				const out = fs.createWriteStream(destFile);
				res.pipe(out);
				out.on("finish", () => {
					out.close(resolve);
				});
				out.on("error", reject);
			})
			.on("error", reject);
	});

try {
	if (fs.existsSync(destFile) && fs.statSync(destFile).size > 1_000_000) {
		process.exit(0);
	}
	fs.mkdirSync(destDir, { recursive: true });
	await download();
	// eslint-disable-next-line no-console
	console.log("[fetch-license-font] NotoSansTC-Regular.otf ready");
} catch (e) {
	// eslint-disable-next-line no-console
	console.warn("[fetch-license-font] skipped:", e?.message || e);
}
