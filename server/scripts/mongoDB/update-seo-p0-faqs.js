/**
 * P0 FAQ SEO：依 slug 寫入 seoTitle／summary／導流欄。
 * 不改 slug、不改 question。使用 updateOne（不觸發 pre("save")）。
 * 用法：node scripts/mongoDB/update-seo-p0-faqs.js
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import Faq from "../../models/Faq.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const SURVEILLANCE_CTA = {
	label: { TW: "查看影像監控產品", EN: "View surveillance products" },
	href: "/products/surveillance-monitoring",
	type: "product"
};

const UPDATES = [
	{
		slug: "yenshow-technology-camera-rtsp-streaming-tutorial",
		seoTitle: {
			TW: "RTSP 是什麼？攝影機串流與 VLC 播放教學",
			EN: "What is RTSP? Camera streaming tutorial with VLC"
		},
		summary: {
			TW: "RTSP 是即時串流協定，用來把攝影機畫面送到 VLC、NVR 或 VMS。本篇說明如何取得 RTSP 網址、用 VLC 播放，以及碼率與防火牆常見問題。",
			EN: "RTSP is a real-time streaming protocol that sends camera video to VLC, NVRs, or VMS. This guide covers RTSP URLs, VLC playback, bitrate settings, and firewall troubleshooting."
		},
		relatedSolutions: [],
		relatedProductPaths: ["/products/surveillance-monitoring"],
		ctaPrimary: SURVEILLANCE_CTA
	},
	{
		slug: "sharper-image-slower-network-understand-the-key-to-camera-bandwidth-and-bitrate-settings",
		seoTitle: {
			TW: "Bitrate 是什麼？監視器畫質、頻寬與儲存怎麼算",
			EN: "What is bitrate? Camera quality, bandwidth, and storage"
		},
		summary: {
			TW: "Bitrate（位元率）決定監視器畫質、網路頻寬與硬碟用量。本篇說明解析度、幀率、H.264／H.265 如何影響頻寬，並提供錄影空間計算方式。",
			EN: "Bitrate determines camera image quality, network bandwidth, and disk usage. Learn how resolution, frame rate, and H.264/H.265 affect bandwidth, plus how to estimate NVR storage."
		},
		relatedSolutions: [],
		relatedProductPaths: ["/products/surveillance-monitoring"],
		ctaPrimary: SURVEILLANCE_CTA
	},
	{
		slug: "nvr-time-lapse-recording-guide",
		seoTitle: {
			TW: "NVR 縮時錄影怎麼設？間隔與硬碟容量計算",
			EN: "NVR time-lapse recording: interval and storage calculation"
		},
		summary: {
			TW: "NVR 縮時錄影用較長間隔擷取畫面，可大幅減少硬碟用量。本篇說明拍攝間隔、幀率設定，以及如何估算儲存容量。",
			EN: "NVR time-lapse recording captures frames at longer intervals to save disk space. This guide covers interval, frame-rate settings, and storage estimation."
		},
		relatedSolutions: [],
		relatedProductPaths: ["/products/surveillance-monitoring"],
		ctaPrimary: SURVEILLANCE_CTA
	},
	{
		slug: "white-paper-on-hvac-systems-and-bacnet-based-control-applications",
		seoTitle: {
			TW: "HVAC 是什麼？建築空調系統與 BACnet 控制說明",
			EN: "What is HVAC? Building climate systems and BACnet control"
		},
		summary: {
			TW: "HVAC 是建築的暖氣、通風與空調系統，通常佔大樓最大用電。本篇說明 HVAC 是什麼，以及如何用 BACnet 做監控與控制。",
			EN: "HVAC means heating, ventilation, and air conditioning—often the largest energy load in a building. This article explains HVAC basics and BACnet-based monitoring and control."
		},
		relatedSolutions: ["aiot-property-management"],
		relatedProductPaths: ["/products/ysop"],
		ctaPrimary: {
			label: { TW: "了解智慧社區 AIoT", EN: "Explore AIoT property management" },
			href: "/solutions/aiot-property-management",
			type: "solution"
		}
	},
	{
		slug: "what-is-wdr-access-control",
		seoTitle: {
			TW: "WDR 寬動態是什麼？門禁與攝影機適用情境",
			EN: "What is WDR? When access control and cameras need it"
		},
		summary: {
			TW: "WDR（寬動態範圍）能在強背光下同時保留亮部與暗部細節，避免人臉過曝。本篇說明門禁機與攝影機何時需要 WDR。",
			EN: "WDR (wide dynamic range) keeps both bright and dark details in strong backlight so faces are not overexposed. Learn when access readers and cameras need WDR."
		},
		relatedSolutions: ["community-security"],
		relatedProductPaths: ["/products/access-control"],
		ctaPrimary: {
			label: { TW: "查看門禁產品", EN: "View access control products" },
			href: "/products/access-control",
			type: "product"
		}
	},
	{
		slug: "what-is-video-encoding-and-decoding-instantly-understand-with-a-shipping-analogy-and-real-ipcnvr-examples",
		seoTitle: {
			TW: "影像編碼／解碼是什麼？H.264、H.265 與 IPC/NVR",
			EN: "What is video encoding and decoding? H.264, H.265, IPC/NVR"
		},
		summary: {
			TW: "影像編碼是把攝影機畫面壓縮後傳輸，解碼則在 NVR 或播放端還原。本篇用 IPC／NVR 實例說明 H.264、H.265、碼率與幀率。",
			EN: "Video encoding compresses camera footage for transmission; decoding restores it on the NVR or player. This FAQ explains H.264, H.265, bitrate, and frame rate with IPC/NVR examples."
		},
		relatedSolutions: [],
		relatedProductPaths: ["/products/surveillance-monitoring"],
		ctaPrimary: SURVEILLANCE_CTA
	}
];

const main = async () => {
	const dbUrl = process.env.MONGO_URI || process.env.DB_URL;
	if (!dbUrl) {
		console.error("缺少 MONGO_URI");
		process.exit(1);
	}

	await mongoose.connect(dbUrl, { serverSelectionTimeoutMS: 8000 });

	let updated = 0;
	let missing = 0;

	for (const item of UPDATES) {
		const { slug, ...fields } = item;
		const existing = await Faq.findOne({ slug }).select("slug question.EN").lean();
		if (!existing) {
			console.error(`找不到 slug: ${slug}`);
			missing += 1;
			continue;
		}

		const result = await Faq.updateOne(
			{ slug },
			{
				$set: {
					seoTitle: fields.seoTitle,
					summary: fields.summary,
					relatedSolutions: fields.relatedSolutions,
					relatedProductPaths: fields.relatedProductPaths,
					ctaPrimary: fields.ctaPrimary
				},
				$unset: { seoDescription: 1 }
			}
		);

		const after = await Faq.findOne({ slug }).select("slug question.EN seoTitle relatedProductPaths ctaPrimary.href").lean();
		if (after.question?.EN !== existing.question?.EN || after.slug !== existing.slug) {
			console.error(`警告：slug 或 question.EN 不應變動：${slug}`);
		}

		console.log(
			`${result.modifiedCount ? "updated" : "unchanged"} | ${slug} | ${after.seoTitle?.TW} | ${after.ctaPrimary?.href}`
		);
		if (result.modifiedCount) updated += 1;
	}

	await mongoose.disconnect();
	console.log(`完成：updated=${updated}, missing=${missing}`);
	if (missing > 0) process.exit(1);
};

main().catch(async (error) => {
	console.error(error);
	try {
		await mongoose.disconnect();
	} catch {
		// ignore
	}
	process.exit(1);
});
