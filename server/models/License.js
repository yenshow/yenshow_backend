import { Schema, model } from "mongoose";

/**
 * 授權資料模型（主 LK / 副 LK 共用同一張集合）
 *
 * parentLicenseKey = null 且 parentLicenseId = null → 主 LK
 * parentLicenseKey 或 parentLicenseId 有值 → 副 LK（隸屬於該主 LK）
 *
 * License Key 生成方式：
 * 1. 組合：SerialNumber + 時間戳 + 隨機數
 * 2. SHA256 雜湊
 * 3. 取前 16 字元，每 4 字元用 "-" 連接，轉大寫
 * 4. 格式：XXXX-XXXX-XXXX-XXXX
 */
const licenseSchema = new Schema(
	{
		product: {
			type: String,
			enum: ["BA-system"],
			default: "BA-system",
			index: true,
			comment: "產品類別"
		},
		deploymentProfile: {
			type: String,
			enum: ["central", "construction"],
			default: "central",
			index: true,
			comment: "部署樣貌：central=智慧管理平台、construction=工地管理平台"
		},
		features: {
			type: [String],
			enum: [
				"people_counting",
				"lighting",
				"hvac",
				"drainage",
				"power",
				"fire",
				"emergency_rescue",
				"environment",
				"surveillance",
				"vehicle_access",
				"multimedia",
				"smoke_alarm",
				"air_circulation",
				"elevator"
			],
			default: [],
			comment: "授權功能模組（僅 BA-system 使用）"
		},
		quotas: {
			type: Schema.Types.Mixed,
			default: null,
			comment: "模組配額（選配）。格式：{ [featureKey]: { maxDevices?: number|null } }"
		},
		customerName: {
			type: String,
			required: [true, "客戶名稱必填"],
			trim: true,
			index: true,
			comment: "客戶名稱（僅後台管理用，不對外回傳）"
		},
		serialNumber: {
			type: String,
			required: false,
			trim: true,
			comment: "SerialNumber（審核時自動生成）"
		},
		licenseKey: {
			type: String,
			required: false,
			trim: true,
			comment: "License Key（審核時自動生成，格式：XXXX-XXXX-XXXX-XXXX）"
		},
		parentLicenseKey: {
			type: String,
			default: null,
			trim: true,
			index: true,
			comment: "所屬主 LK（null 為主 LK，有值為副 LK）"
		},
		parentLicenseId: {
			type: String,
			default: null,
			trim: true,
			index: true,
			comment: "所屬主 LK 的 MongoDB id（主 LK 審核前追加副授權時使用，審核主 LK 後會寫入 parentLicenseKey 並清除）"
		},
		status: {
			type: String,
			enum: ["pending", "available", "active"],
			default: "pending",
			index: true,
			comment: "授權狀態（對應後台權限矩陣）：pending=審核中, available=未啟用/可啟用, active=使用中"
		},
		orderNumber: {
			type: String,
			default: null,
			trim: true,
			index: true,
			comment: "訂單編號（對外業務欄位）"
		},
		applicant: {
			type: String,
			required: false,
			default: null,
			trim: true,
			index: true,
			comment: "建立者登入帳號（內部用，員工僅能存取 applicant=自己帳號的資料）"
		},
		appliedAt: {
			type: Date,
			default: Date.now,
			index: true,
			comment: "申請時間"
		},
		reviewer: {
			type: String,
			default: null,
			trim: true,
			comment: "審核人"
		},
		reviewedAt: {
			type: Date,
			default: null,
			index: true,
			comment: "審核時間"
		},
		deviceFingerprint: {
			type: String,
			default: null,
			trim: true,
			comment: "綁定設備指紋（線上 / 離線啟用時寫入）"
		},
		activationMethod: {
			type: String,
			enum: ["online", "offline", null],
			default: null,
			comment: "啟用方式：online=線上啟用, offline=離線啟用"
		},
		notes: {
			type: String,
			default: null,
			comment: "備註"
		},
		imageUrl: {
			type: String,
			default: null,
			trim: true,
			comment: "申請附檔（虛擬路徑，檔名 license_訂單編號_日期.ext）"
		}
	},
	{
		timestamps: true,
		versionKey: false
	}
);

licenseSchema.index(
	{ licenseKey: 1 },
	{
		unique: true,
		// partial index 不支援 $ne: null（依 MongoDB 版本）
		// 以欄位型別區分：只有 string 才納入 unique 約束
		partialFilterExpression: { licenseKey: { $type: "string" } }
	}
);
licenseSchema.index(
	{ serialNumber: 1 },
	{
		unique: true,
		partialFilterExpression: { serialNumber: { $type: "string" } }
	}
);
licenseSchema.index({ status: 1 });
licenseSchema.index({ parentLicenseKey: 1 });
licenseSchema.index({ deploymentProfile: 1 });
licenseSchema.index({ orderNumber: 1 });

const transformOptions = {
	virtuals: true,
	versionKey: false,
	transform: function (doc, ret) {
		if (ret._id) {
			ret.id = ret._id.toString();
			delete ret._id;
		}
		if (ret.createdAt) ret.createdAt = ret.createdAt.toISOString();
		if (ret.updatedAt) ret.updatedAt = ret.updatedAt.toISOString();
		if (ret.appliedAt) ret.appliedAt = ret.appliedAt.toISOString();
		if (ret.reviewedAt) ret.reviewedAt = ret.reviewedAt.toISOString();
		return ret;
	}
};

licenseSchema.set("toObject", transformOptions);
licenseSchema.set("toJSON", transformOptions);

export default model("License", licenseSchema);
