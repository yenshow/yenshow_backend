/**
 * 遷移：features／quotas 的 access_security → intercom
 *
 * 用法（於 server 目錄、已載入 Mongo 連線環境變數）：
 *   node scripts/mongoDB/migrate-access-security-to-intercom.js
 *   node scripts/mongoDB/migrate-access-security-to-intercom.js --dry-run
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const dryRun = process.argv.includes("--dry-run");

const migrateDoc = (doc) => {
	const features = Array.isArray(doc.features) ? [...doc.features] : [];
	const quotas =
		doc.quotas && typeof doc.quotas === "object" && !Array.isArray(doc.quotas) ? { ...doc.quotas } : null;

	let changed = false;
	const nextFeatures = [];
	const seen = new Set();
	for (const raw of features) {
		const key = raw === "access_security" ? "intercom" : raw;
		if (raw === "access_security") changed = true;
		if (seen.has(key)) {
			changed = true;
			continue;
		}
		seen.add(key);
		nextFeatures.push(key);
	}

	let nextQuotas = quotas;
	if (quotas && Object.prototype.hasOwnProperty.call(quotas, "access_security")) {
		changed = true;
		nextQuotas = { ...quotas };
		const legacy = nextQuotas.access_security;
		delete nextQuotas.access_security;
		if (nextQuotas.intercom == null) {
			nextQuotas.intercom = legacy;
		} else if (legacy && typeof legacy === "object") {
			const a = nextQuotas.intercom.maxDevices;
			const b = legacy.maxDevices;
			if (typeof a === "number" && typeof b === "number") {
				nextQuotas.intercom = { ...nextQuotas.intercom, maxDevices: Math.max(a, b) };
			}
		}
		if (Object.keys(nextQuotas).length === 0) nextQuotas = null;
	}

	if (!changed) return null;
	return { features: nextFeatures, quotas: nextQuotas };
};

const main = async () => {
	const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DB_URL;
	if (!uri) {
		console.error("缺少 MONGO_URI／MONGODB_URI／DB_URL");
		process.exit(1);
	}

	await mongoose.connect(uri);
	const col = mongoose.connection.collection("licenses");
	const cursor = col.find({
		$or: [{ features: "access_security" }, { "quotas.access_security": { $exists: true } }]
	});

	let scanned = 0;
	let updated = 0;
	while (await cursor.hasNext()) {
		const doc = await cursor.next();
		scanned += 1;
		const patch = migrateDoc(doc);
		if (!patch) continue;
		updated += 1;
		console.log(`${dryRun ? "[dry-run] " : ""}更新 ${doc._id}:`, patch.features);
		if (!dryRun) {
			await col.updateOne(
				{ _id: doc._id },
				{ $set: { features: patch.features, quotas: patch.quotas } }
			);
		}
	}

	console.log(`完成：掃描 ${scanned} 筆，${dryRun ? "將更新" : "已更新"} ${updated} 筆`);
	await mongoose.disconnect();
};

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
