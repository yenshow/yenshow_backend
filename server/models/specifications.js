import { Schema, model } from "mongoose";

const specificationsSchema = new Schema(
	{
		name: {
			type: Object,
			required: true,
			validate: {
				validator: function (v) {
					return v && (v.TW || v.EN);
				},
				message: "規格名稱至少需要一種語言版本"
			},
			default: { TW: "", EN: "" }
		},
		code: {
			type: String,
			required: true,
			trim: true,
			comment: "規格識別碼，用於系統識別和URL"
		},
		subCategories: {
			type: Schema.Types.ObjectId,
			ref: "SubCategories",
			required: true,
			comment: "所屬子分類"
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
		// 轉換 subCategories ObjectId
		if (ret.subCategories && typeof ret.subCategories === "object" && ret.subCategories.toString) {
			ret.subCategories = ret.subCategories.toString();
		}
		return ret;
	}
};
specificationsSchema.set("toObject", transformOptions);
specificationsSchema.set("toJSON", transformOptions);
// --- 配置結束 ---

export default model("Specifications", specificationsSchema);
