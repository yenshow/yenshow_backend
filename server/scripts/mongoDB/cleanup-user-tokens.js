/**
 * 清理 users.tokens：移除過期/無效 JWT，並裁切至同時有效上限
 * 用法：
 *   node scripts/mongoDB/cleanup-user-tokens.js
 *   node scripts/mongoDB/cleanup-user-tokens.js --account=4632872
 *   node scripts/mongoDB/cleanup-user-tokens.js --dry-run
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import User from "../../models/user.js";
import { MAX_ACTIVE_TOKENS, sanitizeTokens } from "../../services/authService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const parseArgs = (argv) => {
	const args = {};
	for (const arg of argv.slice(2)) {
		const [key, ...rest] = arg.replace(/^--?/, "").split("=");
		args[key] = rest.length ? rest.join("=") : true;
	}
	return args;
};

const main = async () => {
	const args = parseArgs(process.argv);
	const account = typeof args.account === "string" ? args.account.trim() : "";
	const dryRun = Boolean(args["dry-run"] || args.dryRun);

	if (!process.env.JWT_SECRET) {
		console.error("缺少 JWT_SECRET");
		process.exit(1);
	}

	const dbUrl = process.env.MONGO_URI || process.env.DB_URL;
	if (!dbUrl) {
		console.error("缺少 MONGO_URI");
		process.exit(1);
	}

	await mongoose.connect(dbUrl, { serverSelectionTimeoutMS: 8000 });

	const filter = account ? { account } : {};
	const users = await User.find(filter).select("account tokens");

	if (account && users.length === 0) {
		console.error(`找不到帳號: ${account}`);
		await mongoose.disconnect();
		process.exit(1);
	}

	let scanned = 0;
	let updated = 0;
	let removedTotal = 0;

	for (const user of users) {
		scanned += 1;
		const before = Array.isArray(user.tokens) ? user.tokens.length : 0;
		const nextTokens = sanitizeTokens(user.tokens || [], MAX_ACTIVE_TOKENS);
		const removed = before - nextTokens.length;

		if (removed <= 0) continue;

		removedTotal += removed;
		updated += 1;

		console.log(
			JSON.stringify({
				account: user.account,
				before,
				after: nextTokens.length,
				removed
			})
		);

		if (!dryRun) {
			user.tokens = nextTokens;
			await user.save();
		}
	}

	console.log(
		JSON.stringify(
			{
				ok: true,
				dryRun,
				maxActiveTokens: MAX_ACTIVE_TOKENS,
				scanned,
				updated,
				removedTotal,
				message: dryRun ? "僅預覽，未寫入資料庫" : "已完成 tokens 清理"
			},
			null,
			2
		)
	);

	await mongoose.disconnect();
};

main().catch(async (err) => {
	console.error("清理失敗:", err.message);
	try {
		await mongoose.disconnect();
	} catch {
		/* ignore */
	}
	process.exit(1);
});
