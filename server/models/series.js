import { Schema, model } from "mongoose";

const seriesSchema = new Schema(
	{
		name: {
			type: Object,
			required: true,
			validate: {
				validator: function (v) {
					return v && (v.TW || v.EN); // 至少有一種語言版本
				},
				message: "系列名稱至少需要一種語言版本"
			},
			default: { TW: "", EN: "" }
		},
		code: {
			type: String,
			required: true,
			trim: true,
			comment: "系列識別碼，用於系統識別和URL"
		},
		isActive: {
			type: Boolean,
			default: true
		}
	},
	{
		timestamps: true,
		versionKey: false
	}
);

// --- 添加轉換配置 ---
const transformOptions = {
	virtuals: true,
	versionKey: false,
	transform: function (doc, ret) {
		// 轉換 _id
		if (ret._id) {
			ret._id = ret._id.toString();
		}
		return ret;
	}
};
seriesSchema.set("toObject", transformOptions);
seriesSchema.set("toJSON", transformOptions);
// --- 配置結束 ---

export default model("Series", seriesSchema);
