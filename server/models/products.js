import { Schema, model } from "mongoose";

const productSchema = new Schema(
	{
		name: {
			type: Object,
			required: true,
			validate: {
				validator: function (v) {
					return v && (v.TW || v.EN);
				},
				message: "產品名稱至少需要一種語言版本"
			},
			default: { TW: "", EN: "" }
		},
		code: {
			type: String,
			required: true,
			unique: true,
			trim: true,
			index: true,
			comment: "系列識別碼，用於系統識別和URL"
		},
		specifications: { type: Schema.Types.ObjectId, ref: "Specifications", required: true },
		description: {
			type: Object,
			default: {
				TW: "",
				EN: ""
			},
			comment: "產品多語言描述"
		},
		features: [
			{
				featureId: { type: String, required: true },
				TW: { type: String, default: "" },
				EN: { type: String, default: "" }
			}
		],
		images: [{ type: String }],
		documents: [{ type: String }],
		// New: language-specific document collections
		documentsByLang: {
			TW: { type: [String], default: [] },
			EN: { type: [String], default: [] }
		},
		videos: [{ type: String }],
		isActive: { type: Boolean, default: false, index: true },
		slug: {
			type: String,
			unique: true,
			sparse: true,
			lowercase: true,
			index: true
		}
	},
	{
		timestamps: true,
		versionKey: false
	}
);

// --- HOOKS ---
productSchema.pre("save", async function (next) {
	if ((this.isModified("code") || this.isNew) && this.code) {
		const slugify = (text) =>
			text
				.toString()
				.toLowerCase()
				.replace(/\s+/g, "-") // Replace spaces with -
				.replace(/[^\w\-]+/g, "") // Remove all non-word chars
				.replace(/\-\-+/g, "-") // Replace multiple - with single -
				.replace(/^-+/, "") // Trim - from start of text
				.replace(/-+$/, ""); // Trim - from end of text

		const Model = this.constructor;
		const baseSlug = slugify(this.code);
		let slug = baseSlug;
		let counter = 1;

		while (true) {
			const existingDoc = await Model.findOne({ slug: slug });
			if (!existingDoc || existingDoc._id.equals(this._id)) {
				break;
			}
			counter++;
			slug = `${baseSlug}-${counter}`;
		}
		this.slug = slug;
	}
	next();
});
// --- HOOKS END ---

// --- 添加轉換配置 ---
const transformOptions = {
	virtuals: true,
	versionKey: false,
	transform: function (doc, ret) {
		// 轉換 _id
		if (ret._id) {
			ret._id = ret._id.toString();
		}
		// 轉換 specifications ObjectId
		if (ret.specifications && typeof ret.specifications === "object" && ret.specifications.toString) {
			ret.specifications = ret.specifications.toString();
		}
		// 根據之前的日誌，轉換 features 陣列中的 _id (如果存在)
		if (ret.features && Array.isArray(ret.features)) {
			ret.features.forEach((feature) => {
				if (feature._id && typeof feature._id === "object" && feature._id.toString) {
					feature._id = feature._id.toString();
				}
			});
		}
		return ret;
	}
};
productSchema.set("toObject", transformOptions);
productSchema.set("toJSON", transformOptions);
// --- 配置結束 ---

export default model("Products", productSchema);
