import { Schema, model } from "mongoose";

/**
 * 授權資料模型（主 LK / 副 LK 共用同一張集合）
 *
 * parentLicenseKey = null → 主 LK
 * parentLicenseKey = "XXXX-..." → 副 LK（隸屬於該主 LK）
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
		features: {
			type: [String],
			enum: ["people_counting", "lighting", "environment", "surveillance", "vehicle_access"],
			default: [],
			comment: "授權功能模組（僅 BA-system 使用）"
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
		status: {
			type: String,
			enum: ["pending", "available", "active"],
			default: "pending",
			index: true,
			comment: "授權狀態：pending=審核中, available=可啟用, active=使用中"
		},
		applicant: {
			type: String,
			required: [true, "申請人必填"],
			trim: true,
			comment: "申請人"
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
		partialFilterExpression: { licenseKey: { $exists: true, $ne: null } }
	}
);
licenseSchema.index(
	{ serialNumber: 1 },
	{ 
		unique: true,
		partialFilterExpression: { serialNumber: { $exists: true, $ne: null } }
	}
);
licenseSchema.index({ status: 1 });
licenseSchema.index({ parentLicenseKey: 1 });

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
