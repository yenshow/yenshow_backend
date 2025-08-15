import mongoose from "mongoose";
import User from "../models/user.js";
import UserRole from "../enums/UserRole.js";
import dotenv from "dotenv";
import readline from "readline";
import bcrypt from "bcrypt";

// 載入環境變數
dotenv.config();

// 建立輸入介面
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

// 詢問函數
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

/**
 * 創建初始管理員帳號
 */
async function createInitialAdmin() {
	try {
		// 連接到資料庫
		console.log("連接到資料庫...");
		await mongoose.connect(process.env.DB_URL);
		console.log("資料庫連接成功");

		// 檢查是否已有管理員
		const adminExists = await User.findOne({ role: UserRole.ADMIN });

		if (adminExists) {
			console.log(`系統中已存在管理員帳號: ${adminExists.account}`);
			rl.close();
			mongoose.connection.close();
			return;
		}

		console.log("系統中沒有管理員帳號，將創建新的管理員帳號");

		// 詢問管理員資訊
		const account = await question("請輸入管理員帳號: ");
		const name = await question("請輸入管理員姓名: ");
		const email = await question("請輸入管理員電子郵件 (可選，直接按 Enter 跳過): ");
		const password = await question("請輸入管理員密碼: ");

		// 創建管理員
		const admin = new User({
			account,
			password,
			name,
			email: email || undefined,
			role: UserRole.ADMIN,
			isActive: true,
			isFirstLogin: false
		});

		await admin.save();

		console.log("管理員帳號創建成功!");
		console.log(`帳號: ${account}`);
		console.log(`姓名: ${name}`);
		console.log(`角色: 管理員`);

		// 關閉資源
		rl.close();
		await mongoose.connection.close();
		console.log("資料庫連接已關閉");
	} catch (error) {
		console.error("創建管理員失敗:", error.message);
		rl.close();
		if (mongoose.connection.readyState === 1) {
			await mongoose.connection.close();
		}
		process.exit(1);
	}
}

// 執行函數
createInitialAdmin();
