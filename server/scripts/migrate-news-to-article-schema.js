/**
 * 將舊版 News（category 字串 + content 區塊）遷移至 article + 雙語 category + 附件子文件。
 *
 * 使用方式（專案根目錄或 server 目錄，需已設定 MONGO_URI 或 DB_URL）：
 *   node scripts/migrate-news-to-article-schema.js
 *
 * 會先將目前 news 集合完整複製到 news_backup_<ISO時間戳>，再逐一更新原集合文件。
 */
import "dotenv/config";
import mongoose from "mongoose";
import { newsCategoryMainTwToEn } from "../constants/mainCategories.js";

const SEPARATOR_PARAGRAPH = {
	type: "paragraph",
	content: [{ type: "text", text: "________________________________________" }]
};

function normalizeNode(node) {
	if (!node || typeof node !== "object") {
		return node;
	}
	if (node.attrs && node.attrs.level != null) {
		node.attrs.level = Number(node.attrs.level);
	}
	if (Array.isArray(node.content)) {
		node.content = node.content.map(normalizeNode);
	}
	return node;
}

function normalizeTiptapDoc(doc) {
	if (!doc || typeof doc !== "object") {
		return { type: "doc", content: [{ type: "paragraph" }] };
	}
	const copy = JSON.parse(JSON.stringify(doc));
	if (Array.isArray(copy.content)) {
		copy.content = copy.content.map(normalizeNode);
	}
	return copy;
}

function mergeLangDocs(richTextBlocks, langKey) {
	const merged = { type: "doc", content: [] };
	let first = true;
	for (const b of richTextBlocks) {
		if (!b.richTextData || !b.richTextData[langKey]) {
			continue;
		}
		const doc = normalizeTiptapDoc(b.richTextData[langKey]);
		const inner = doc.content || [];
		if (!first && inner.length > 0) {
			merged.content.push(JSON.parse(JSON.stringify(SEPARATOR_PARAGRAPH)));
		}
		merged.content.push(...inner);
		first = false;
	}
	if (merged.content.length === 0) {
		merged.content = [{ type: "paragraph" }];
	}
	return merged;
}

function migrateContentArray(content) {
	const sorted = [...(content || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
	const richBlocks = sorted.filter((b) => b.itemType === "richText");
	const article = {
		TW: mergeLangDocs(richBlocks, "TW"),
		EN: mergeLangDocs(richBlocks, "EN")
	};

	const attachmentImages = [];
	const attachmentVideos = [];
	const attachmentDocuments = [];

	for (const b of sorted) {
		if (b.itemType === "image") {
			if (!b.imageUrl || String(b.imageUrl).startsWith("__")) {
				continue;
			}
			attachmentImages.push({
				url: b.imageUrl
			});
		} else if (b.itemType === "videoEmbed") {
			const url = b.videoEmbedUrl;
			if (!url || String(url).startsWith("__")) {
				continue;
			}
			if (/^https?:\/\//i.test(url)) {
				attachmentVideos.push({ source: "embed", embedUrl: url });
			} else {
				attachmentVideos.push({ source: "upload", url });
			}
		} else if (b.itemType === "document") {
			if (!b.documentUrl || String(b.documentUrl).startsWith("__")) {
				continue;
			}
			attachmentDocuments.push({
				url: b.documentUrl
			});
		}
	}

	return { article, attachmentImages, attachmentVideos, attachmentDocuments };
}

function migrateCategoryField(category) {
	if (category && typeof category === "object" && category.main && category.main.TW) {
		const tw = category.main.TW;
		return {
			main: { TW: tw, EN: category.main.EN || newsCategoryMainTwToEn(tw) || "" }
		};
	}
	if (typeof category === "string" && category) {
		return {
			main: { TW: category, EN: newsCategoryMainTwToEn(category) || "" }
		};
	}
	return {
		main: { TW: "品牌新聞", EN: newsCategoryMainTwToEn("品牌新聞") || "Brand News" }
	};
}

async function run() {
	const dbUrl = process.env.MONGO_URI || process.env.DB_URL;
	if (!dbUrl) {
		console.error("請設定 MONGO_URI 或 DB_URL");
		process.exit(1);
	}

	await mongoose.connect(dbUrl, { serverSelectionTimeoutMS: 10000 });
	console.log("已連線 MongoDB");

	const col = mongoose.connection.collection("news");
	const count = await col.countDocuments();
	if (count === 0) {
		console.log("news 集合為空，結束");
		await mongoose.disconnect();
		return;
	}

	const backupName = `news_backup_${new Date().toISOString().replace(/[:.]/g, "-")}`;
	const rawDocs = await col.find({}).toArray();
	await mongoose.connection.db.collection(backupName).insertMany(rawDocs);
	console.log(`已備份 ${rawDocs.length} 筆至集合: ${backupName}`);

	let migrated = 0;
	let skipped = 0;

	for (const doc of rawDocs) {
		const hasCategorySub = !!(doc.category && typeof doc.category === "object" && Object.prototype.hasOwnProperty.call(doc.category, "sub"));
		const alreadyMigrated =
			doc.article &&
			typeof doc.article === "object" &&
			doc.category &&
			typeof doc.category === "object" &&
			doc.category.main &&
			typeof doc.category.main === "object" &&
			doc.category.main.TW &&
			(!Array.isArray(doc.content) || doc.content.length === 0) &&
			!hasCategorySub;

		if (alreadyMigrated) {
			skipped++;
			continue;
		}

		const { article, attachmentImages, attachmentVideos, attachmentDocuments } = migrateContentArray(doc.content || []);
		const category = migrateCategoryField(doc.category);

		// MongoDB 不允許在同一次更新中同時操作父/子路徑（例如 set category 並 unset category.sub）。
		// 因此分兩次 update：先覆寫新結構，再清理舊欄位。
		await col.updateOne(
			{ _id: doc._id },
			{
				$set: {
					article,
					category,
					attachmentImages,
					attachmentVideos,
					attachmentDocuments
				},
				$unset: { content: "" }
			}
		);

		await col.updateOne(
			{ _id: doc._id },
			{
				$unset: {
					"category.sub": "",
					"attachmentImages.$[].imageAltText": "",
					"attachmentImages.$[].imageCaption": "",
					"attachmentVideos.$[].videoCaption": "",
					"attachmentDocuments.$[].documentDescription": ""
				}
			}
		);
		migrated++;
	}

	console.log(`完成：遷移 ${migrated} 筆，略過已符合新結構 ${skipped} 筆`);
	await mongoose.disconnect();
}

run().catch((err) => {
	console.error(err);
	process.exit(1);
});
