/**
 * 重設指定帳號密碼（需可連上 MONGO_URI）
 * 用法：node scripts/mongoDB/reset-user-password.js --account=4632872 --password=Aa83124007
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import User from "../../models/user.js";

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
	const account = String(args.account || "").trim();
	const password = String(args.password || "").trim();

	if (!account || !password) {
		console.error("請提供 --account=帳號 --password=新密碼");
		process.exit(1);
	}
	if (password.length < 4 || password.length > 20) {
		console.error("密碼長度必須在 4-20 字元");
		process.exit(1);
	}

	const dbUrl = process.env.MONGO_URI || process.env.DB_URL;
	if (!dbUrl) {
		console.error("缺少 MONGO_URI");
		process.exit(1);
	}

	await mongoose.connect(dbUrl, { serverSelectionTimeoutMS: 8000 });
	const user = await User.findOne({ account }).select("+password");
	if (!user) {
		console.error(`找不到帳號: ${account}`);
		await mongoose.disconnect();
		process.exit(1);
	}

	user.password = password;
	user.tokens = [];
	await user.save();

	console.log(
		JSON.stringify(
			{
				ok: true,
				account: user.account,
				role: user.role,
				isActive: user.isActive,
				message: "密碼已重設，舊 token 已清除"
			},
			null,
			2
		)
	);
	await mongoose.disconnect();
};

main().catch(async (err) => {
	console.error("重設失敗:", err.message);
	try {
		await mongoose.disconnect();
	} catch {
		/* ignore */
	}
	process.exit(1);
});
