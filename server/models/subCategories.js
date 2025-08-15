import { Schema, model } from "mongoose";

const subCategoriesSchema = new Schema(
	{
		name: {
			type: Object,
			required: true,
			validate: {
				validator: function (v) {
					return v && (v.TW || v.EN);
				},
				message: "子分類名稱至少需要一種語言版本"
			},
			default: { TW: "", EN: "" }
		},
		code: {
			type: String,
			required: true,
			trim: true,
			comment: "子分類識別碼，用於系統識別和URL"
		},
		categories: {
			type: Schema.Types.ObjectId,
			ref: "Categories",
			required: true,
			comment: "所屬分類"
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

const transformOptions = {
	virtuals: true,
	versionKey: false,
	transform: function (doc, ret) {
		if (ret._id) {
			ret._id = ret._id.toString();
		}
		if (ret.categories && typeof ret.categories === "object" && ret.categories.toString) {
			ret.categories = ret.categories.toString();
		}
		return ret;
	}
};
subCategoriesSchema.set("toObject", transformOptions);
subCategoriesSchema.set("toJSON", transformOptions);

export default model("SubCategories", subCategoriesSchema);
