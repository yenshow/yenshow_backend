import { Schema, model } from "mongoose";

const categoriesSchema = new Schema(
	{
		name: {
			type: Object,
			required: true,
			validate: {
				validator: function (v) {
					return v && (v.TW || v.EN);
				},
				message: "分類名稱至少需要一種語言版本"
			},
			default: { TW: "", EN: "" }
		},
		code: {
			type: String,
			required: true,
			trim: true,
			comment: "分類識別碼，用於系統識別和URL"
		},
		series: {
			type: Schema.Types.ObjectId,
			ref: "Series",
			required: true,
			comment: "所屬系列"
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
		if (ret.series && typeof ret.series === "object" && ret.series.toString) {
			ret.series = ret.series.toString();
		}
		return ret;
	}
};
categoriesSchema.set("toObject", transformOptions);
categoriesSchema.set("toJSON", transformOptions);

export default model("Categories", categoriesSchema);
