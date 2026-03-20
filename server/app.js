import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import mongoSanitize from "express-mongo-sanitize";
import passport from "passport";
import { StatusCodes } from "http-status-codes";
import { ApiError, errorResponse, createErrorHandlerMiddleware } from "./utils/responseHandler.js";
import helmet from "helmet";

// 路由導入
import userRoutes from "./routes/user.js";
import hierarchyRoutes from "./routes/hierarchyRoutes.js";
import faqRoutes from "./routes/faq.js";
import newsRoutes from "./routes/news.js";
import contactRoutes from "./routes/contactRoutes.js";
import lineRoutes from "./routes/line.js";
import caseStudyRoutes from "./routes/caseStudy.js";
import licenseRoutes from "./routes/license.js";
import documentsRoutes from "./routes/documents.js";
import { signedStorageDownloadMiddleware } from "./middlewares/signedStorageDownload.js";
// 導入模型 - 僅用於初始化檢查，確保模型正確載入
import "./models/products.js";
import "./models/categories.js";
import "./models/series.js";
import "./models/specifications.js";
import "./models/subCategories.js";
import "./models/user.js";
import "./models/caseStudy.js";
import "./models/License.js";

// 初始化路徑
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 配置 Express 應用
 */
const configureApp = () => {
	// 初始化 Express 應用
	const app = express();

	// 基本安全性設定
	app.use(helmet());

	// LINE Webhook 必須在 express.json() 之前，以保留 raw body 進行簽名驗證
	app.use("/api/line", lineRoutes);

	// 添加請求大小限制
	app.use(express.json({ limit: "50mb" }));
	app.use(express.urlencoded({ extended: true, limit: "50mb" }));

	const buildAllowedOrigins = () => {
		const rawCorsOrigin = process.env.CORS_ORIGIN || process.env.LAN_CORS_ORIGINS || "http://localhost:3002";
		const lanIp = process.env.LAN_IP;
		const clientPort = process.env.CLIENT_PORT || process.env.DOCKER_CLIENT_PORT || "3002";

		const defaults = new Set(
			[
				"http://localhost:3000",
				"http://127.0.0.1:3000",
				`http://localhost:${clientPort}`,
				`http://127.0.0.1:${clientPort}`,
				lanIp && `http://${lanIp}`,
				lanIp && `http://${lanIp}:${clientPort}`,
				lanIp && `https://${lanIp}`,
				lanIp && `https://${lanIp}:${clientPort}`
			].filter(Boolean)
		);

		rawCorsOrigin
			.split(",")
			.map((item) => item?.trim())
			.filter(Boolean)
			.forEach((origin) => defaults.add(origin));

		return Array.from(defaults);
	};

	const allowedOrigins = buildAllowedOrigins();

	// CORS 配置
	const corsOptions = {
		origin: function (origin, callback) {
			const isDevelopment = process.env.NODE_ENV === "development";

			// 允許沒有來源的請求 (如 Postman)
			if (!origin) return callback(null, true);

			// 在開發模式下允許所有來源
			if (isDevelopment) {
				return callback(null, true);
			}

			if (allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
				callback(null, true);
			} else {
				console.warn(`CORS 拒絕來源: ${origin}`);
				callback(new Error("CORS 不允許的來源"));
			}
		},
		methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "x-api-secret", "X-App-Context"],
		credentials: true // 允許跨域請求攜帶憑證
	};

	app.use(cors(corsOptions));

	// 基礎中間件
	app.use(morgan("dev"));
	app.use(
		mongoSanitize({
			onSanitize: ({ req, key }) => {
				console.warn(`MongoDB 操作符已從 ${key} 被移除`);
			}
		})
	);

	// 初始化 Passport
	app.use(passport.initialize());
	// 導入 Passport 配置
	import("./passport/passport.js");

	// 全局安全過濾器 - 放在所有路由之前
	app.use((req, res, next) => {
		if (req.body) {
			// 深層清理所有請求體
			const cleanBody = function (obj) {
				if (!obj) return obj;

				Object.keys(obj).forEach((key) => {
					// 檢查鍵名是否包含 $
					if (key.startsWith("$")) {
						delete obj[key];
						console.warn(`🚨 安全警告: 移除可疑運算符 ${key}, IP: ${req.ip || "unknown"}, 路徑: ${req.path}`);
					}

					// 如果值是物件或陣列，遞迴清理
					if (obj[key] && typeof obj[key] === "object") {
						cleanBody(obj[key]);
					}
				});

				return obj;
			};

			req.body = cleanBody({ ...req.body });
		}
		next();
	});

	// 請求超時處理
	app.use((req, res, next) => {
		// 如果是檔案上傳請求，設定更長的超時時間
		const isFileUpload = req.path.includes("/news") || req.path.includes("/products") || req.path.includes("/faqs");
		const timeout = isFileUpload ? 300000 : 30000; // 檔案上傳 5分鐘，一般請求 30秒

		res.setTimeout(timeout, () => {
			res.status(408).json({
				success: false,
				message: "請求超時"
			});
		});
		next();
	});

	// 添加基本的安全性 headers
	app.use((req, res, next) => {
		res.setHeader("X-Content-Type-Options", "nosniff");
		res.setHeader("X-Frame-Options", "DENY");
		res.setHeader("X-XSS-Protection", "1; mode=block");
		next();
	});

	// 處理靜態檔案錯誤
	app.use((err, req, res, next) => {
		if (err.code === "ENOENT") {
			return res.status(404).json({
				success: false,
				message: "找不到檔案"
			});
		}
		next(err);
	});

	return app;
};

/**
 * 配置 API 路由
 */
const configureRoutes = (app) => {
	// JSON 解析錯誤處理
	app.use((err, req, res, next) => {
		if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				success: false,
				message: "資料格式錯誤"
			});
		}
		next(err);
	});

	// 調試路由 - 放在認證中間件之前
	app.get("/api/ping", (req, res) => {
		res.status(200).send("pong");
	});

	// API 路由
	// 將更具體的路由放在前面，確保優先匹配（避免被通用路由攔截）
	app.use("/api/license", licenseRoutes);
	app.use("/api/users", userRoutes);
	app.use("/api/faqs", faqRoutes);
	app.use("/api/news", newsRoutes);
	app.use("/api", hierarchyRoutes);
	app.use("/api", contactRoutes);
	app.use("/api", caseStudyRoutes);
	app.use("/api/documents", documentsRoutes);

	// 提供靜態資源
	app.use(
		"/storage",
		signedStorageDownloadMiddleware,
		express.static(path.join(process.env.FILES_ROOT || "/app/storage"), {
			maxAge: "1d", // 靜態資源快取 1 天
			setHeaders: (res, path) => {
				// 根據文件類型設置不同的快取策略
				if (path.endsWith(".pdf")) {
					// PDF 文件快取時間較長
					// 若為受保護的 signed PDF，Cache 控制會由 signedStorageDownloadMiddleware 設定成 private/no-store
					if (!res.locals.signedProtectedPdf) {
						res.setHeader("Cache-Control", "public, max-age=604800"); // 7 天
					}
				} else if (path.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
					// 圖片快取時間適中
					res.setHeader("Cache-Control", "public, max-age=86400"); // 1 天
				} else {
					// 其他檔案快取時間較短
					res.setHeader("Cache-Control", "public, max-age=3600"); // 1 小時
				}
				// 設定 Cross-Origin Resource Policy 允許跨來源存取
				res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
			}
		})
	);

	// 404 處理 - 配合 Vue Router 的歷史模式，記錄未找到的路由
	app.use((req, res, next) => {
		console.log("路由未找到:", req.method, req.path);
		next(new ApiError(404, "找不到資源"));
	});

	// 全局錯誤處理中間件
	const errorHandler = createErrorHandlerMiddleware();
	app.use(errorHandler);

	// 404 最終處理 - 返回標準 404 錯誤
	app.use((req, res) => {
		errorResponse(res, StatusCodes.NOT_FOUND, "找不到路由");
	});
};

/**
 * 連接數據庫
 */
const connectDatabase = async () => {
	try {
		const dbUrl = process.env.MONGO_URI || process.env.DB_URL;
		await mongoose.connect(dbUrl, {
			serverSelectionTimeoutMS: 5000
		});

		// 安全設置
		mongoose.set("sanitizeFilter", true);

		console.log("✅ 資料庫連線成功");
		return true;
	} catch (error) {
		console.error("❌ 資料庫連線失敗:", error);
		return false;
	}
};

/**
 * 啟動 HTTP 服務器
 */
const startHttpServer = (app) => {
	const port = process.env.PORT || 4001;
	const host = process.env.HOST || "localhost";
	return app.listen(port, host, () => {
		console.log(`✅ 伺服器啟動於 ${host}:${port}`);
		console.log(`📌 API 基礎路徑: http://${host}:${port}/`);
		console.log(`🔒 允許的 CORS 來源: ${process.env.CORS_ORIGIN || "http://localhost:3002"}`);
	});
};

/**
 * 應用程序啟動流程
 */
const startServer = async () => {
	try {
		// 配置 Express 應用
		const app = configureApp();

		// 連接數據庫 - 先連接數據庫，確保服務有效
		const dbConnected = await connectDatabase();
		if (!dbConnected) {
			throw new Error("資料庫連線失敗，無法啟動服務器");
		}

		// 配置 API 路由
		configureRoutes(app);

		// 啟動 HTTP 服務器
		startHttpServer(app);
	} catch (error) {
		console.error("❌ 伺服器啟動失敗:", error);
		process.exit(1);
	}
};

// 設置優雅關閉程序
process.on("SIGTERM", () => {
	console.log("🛑 SIGTERM 信號收到，關閉應用程序...");
	process.exit(0);
});

process.on("SIGINT", () => {
	console.log("🛑 SIGINT 信號收到，關閉應用程序...");
	process.exit(0);
});

// 執行啟動流程
startServer();
