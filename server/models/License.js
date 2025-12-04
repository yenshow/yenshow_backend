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
		licenseKey: {
			type: String,
			required: [true, "License Key 必填"],
			unique: true,
			trim: true,
			index: true,
			comment: "License Key（自動生成，格式：XXXX-XXXX-XXXX-XXXX）"
		},
		serialNumber: {
			type: String,
			required: [true, "SerialNumber 必填"],
			unique: true,
			trim: true,
			index: true,
			comment: "SerialNumber（用戶提供，例如：SN-001）"
		},
		status: {
			type: String,
			enum: ["active", "inactive"],
			default: "inactive",
			index: true,
			comment: "授權狀態：active=啟用中（可使用）, inactive=未啟用/已停用（不可使用）"
		},
		usedAt: {
			type: Date,
			default: null,
			index: true,
			comment: "首次使用時間（用於追蹤授權是否已被使用，只能使用一次）"
		},
		notes: {
			type: String,
			default: null,
			comment: "管理員備註"
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
		return ret;
	}
};

licenseSchema.set("toObject", transformOptions);
licenseSchema.set("toJSON", transformOptions);

export default model("License", licenseSchema);
