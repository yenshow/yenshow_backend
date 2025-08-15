import dotenv from "dotenv";
import mongoose from "mongoose";
import fs from "fs-extra";
import path from "path";
import User from "../models/user.js";
import UserRole from "../enums/UserRole.js";

dotenv.config();

function parseArgs(argv) {
	const args = {};
	for (const arg of argv.slice(2)) {
		const [key, ...rest] = arg.replace(/^--?/, "").split("=");
		const value = rest.length > 0 ? rest.join("=") : true;
		args[key] = value;
	}
	return args;
}

function ensureArray(value) {
	if (!value) return [];
	if (Array.isArray(value)) return value;
	return String(value)
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
}

function flattenObject(input, parentKey = "", result = {}) {
	if (input === null || input === undefined) return result;
	const isDate = (v) => v instanceof Date;
	for (const [key, value] of Object.entries(input)) {
		const newKey = parentKey ? `${parentKey}.${key}` : key;
		if (isDate(value)) {
			result[newKey] = value.toISOString();
		} else if (Array.isArray(value)) {
			result[newKey] = value.map((v) => (v && typeof v === "object" ? JSON.stringify(v) : v)).join(";");
		} else if (value && typeof value === "object") {
			flattenObject(value, newKey, result);
		} else {
			result[newKey] = value;
		}
	}
	return result;
}

function toCsv(rows) {
	if (rows.length === 0) return "";
	const allKeys = new Set();
	for (const row of rows) {
		Object.keys(row).forEach((k) => allKeys.add(k));
	}
	// 優先輸出欄位順序（在 account 後補上 password）
	const preferred = ["account", "password", "companyName", "contactPerson", "phone", "address"];
	const headersOrdered = [];
	for (const key of preferred) {
		if (allKeys.has(key)) headersOrdered.push(key);
	}
	for (const key of allKeys) {
		if (!headersOrdered.includes(key)) headersOrdered.push(key);
	}
	const headers = headersOrdered;
	const escape = (val) => {
		if (val === null || val === undefined) return "";
		const str = String(val);
		const needsQuote = /[",\n\r]/.test(str) || str.includes(",");
		const escaped = str.replace(/"/g, '""');
		return needsQuote ? `"${escaped}"` : escaped;
	};
	const lines = [];
	lines.push(headers.map(escape).join(","));
	for (const row of rows) {
		lines.push(headers.map((h) => escape(h in row ? row[h] : "")).join(","));
	}
	return lines.join("\r\n");
}

async function main() {
	const args = parseArgs(process.argv);
	const format = (args.format || "json").toString().toLowerCase(); // json | csv
	const role = args.role ? String(args.role).toUpperCase() : undefined; // ADMIN | STAFF | CLIENT
	const active = args.active === undefined ? undefined : ["true", "1", true].includes(String(args.active).toLowerCase());

	if (!["json", "csv"].includes(format)) {
		console.error("format 必須為 json 或 csv");
		process.exit(1);
	}

	const dbUrl = process.env.MONGO_URI || process.env.DB_URL;
	if (!dbUrl) {
		console.error("找不到資料庫連線字串，請在 .env 設定 MONGO_URI 或 DB_URL");
		process.exit(1);
	}

	const filter = {};
	if (role && Object.values(UserRole).includes(role)) {
		filter.role = role;
	}
	if (active !== undefined) {
		filter.isActive = active;
	}

	// 僅匯出具有 clientInfo 的使用者（至少一個欄位有值）
	const hasClientInfo = {
		$or: [
			{ "clientInfo.companyName": { $exists: true, $nin: [null, ""] } },
			{ "clientInfo.contactPerson": { $exists: true, $nin: [null, ""] } },
			{ "clientInfo.phone": { $exists: true, $nin: [null, ""] } },
			{ "clientInfo.address": { $exists: true, $nin: [null, ""] } }
		]
	};
	filter.$and = filter.$and ? [...filter.$and, hasClientInfo] : [hasClientInfo];

	// 只查詢所需欄位（需 +password 強制選入加密密碼）
	const projection = "account clientInfo +password";

	try {
		console.log("連接資料庫中...");
		await mongoose.connect(dbUrl, { serverSelectionTimeoutMS: 5000 });
		console.log("資料庫已連線");

		const users = await User.find(filter).select(projection).lean();
		console.log(`查詢到 ${users.length} 筆使用者資料`);

		// 展平成指定欄位：account、password (hash)、companyName、contactPerson、phone、address
		const result = users
			.map((u) => {
				const info = u.clientInfo || {};
				const companyName = typeof info.companyName === "string" ? info.companyName.trim() : info.companyName;
				const contactPerson = typeof info.contactPerson === "string" ? info.contactPerson.trim() : info.contactPerson;
				const phone = typeof info.phone === "string" ? info.phone.trim() : info.phone;
				const address = typeof info.address === "string" ? info.address.trim() : info.address;
				return { account: u.account, password: u.password || "", companyName, contactPerson, phone, address };
			})
			// 再保險：若四個欄位皆為空/無值則排除
			.filter((r) => [r.companyName, r.contactPerson, r.phone, r.address].some((v) => v !== undefined && v !== null && String(v).trim() !== ""));

		const outputDir = args.out ? path.dirname(path.resolve(String(args.out))) : path.resolve("exports");
		await fs.ensureDir(outputDir);

		let outputPath;
		if (args.out) {
			outputPath = path.resolve(String(args.out));
		} else {
			const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(".", "_").replace("T", "_").replace("Z", "");
			outputPath = path.join(outputDir, `users_${timestamp}.${format}`);
		}

		if (format === "json") {
			await fs.writeJson(outputPath, result, { spaces: 2 });
		} else {
			const flattened = result.map((u) => flattenObject(u));
			const csv = toCsv(flattened);
			// 加上 UTF-8 BOM 讓 Excel 正確識別編碼
			await fs.writeFile(outputPath, "\ufeff" + csv, { encoding: "utf8" });
		}

		console.log(`匯出完成 → ${outputPath}`);
	} catch (err) {
		console.error("匯出失敗:", err.message || err);
		process.exitCode = 1;
	} finally {
		if (mongoose.connection.readyState === 1) {
			await mongoose.disconnect();
		}
	}
}

main();
