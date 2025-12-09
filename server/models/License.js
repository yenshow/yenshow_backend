import { Schema, model } from "mongoose";

/**
 * 授權資料模型
 *
 * License Key 生成方式：
 * 1. 組合：SerialNumber + 時間戳 + 隨機數
 * 2. SHA256 雜湊
 * 3. 取前 16 字元，每 4 字元用 "-" 連接，轉大寫
 * 4. 格式：XXXX-XXXX-XXXX-XXXX
 */
const licenseSchema = new Schema(
	{
		// 1. 客戶名稱
		customerName: {
			type: String,
			required: [true, "客戶名稱必填"],
			trim: true,
			index: true,
			comment: "客戶名稱"
		},
		// 2. SerialNumber（審核時自動生成）
		serialNumber: {
			type: String,
			required: false,
			unique: true,
			sparse: true, // 允許 null，但如果有值則必須唯一
			trim: true,
			index: true,
			comment: "SerialNumber（審核時自動生成）"
		},
		// 3. License Key（審核時自動生成）
		licenseKey: {
			type: String,
			required: false,
			unique: true,
			sparse: true, // 允許 null，但如果有值則必須唯一
			trim: true,
			index: true,
			comment: "License Key（審核時自動生成，格式：XXXX-XXXX-XXXX-XXXX）"
		},
		// 4. 狀態
		status: {
			type: String,
			enum: ["pending", "available", "active", "inactive"],
			default: "pending",
			index: true,
			comment: "授權狀態：pending=審核中, available=可啟用, active=使用中, inactive=已停用"
		},
		// 5. 申請人 / 時間
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
		// 6. 審核人 / 時間
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
		// 使用時間
		usedAt: {
			type: Date,
			default: null,
			index: true,
			comment: "首次使用時間（用於追蹤授權是否已被使用，只能使用一次）"
		},
		// 7. 備註
		notes: {
			type: String,
			default: null,
			comment: "備註"
		}
	},
	{
		timestamps: true, // 自動添加 createdAt 和 updatedAt
		versionKey: false // 移除 __v 欄位
	}
);

// 索引優化
licenseSchema.index({ licenseKey: 1 });
licenseSchema.index({ serialNumber: 1 });
licenseSchema.index({ status: 1 });

// 轉換配置
const transformOptions = {
	virtuals: true,
	versionKey: false,
	transform: function (doc, ret) {
		// 轉換 _id 為字串
		if (ret._id) {
			ret.id = ret._id.toString();
			delete ret._id;
		}
		// 轉換日期為 ISO 字串
		if (ret.createdAt) ret.createdAt = ret.createdAt.toISOString();
		if (ret.updatedAt) ret.updatedAt = ret.updatedAt.toISOString();
		if (ret.usedAt) ret.usedAt = ret.usedAt.toISOString();
		if (ret.appliedAt) ret.appliedAt = ret.appliedAt.toISOString();
		if (ret.reviewedAt) ret.reviewedAt = ret.reviewedAt.toISOString();
		return ret;
	}
};

licenseSchema.set("toObject", transformOptions);
licenseSchema.set("toJSON", transformOptions);

export default model("License", licenseSchema);
