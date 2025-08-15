import { Schema, model } from "mongoose";

const faqSchema = new Schema(
	{
		question: {
			TW: { type: String, required: [true, "繁體中文問題為必填"] },
			EN: { type: String, required: [true, "英文問題為必填 (用於產生語意化路由)"] }
		},
		answer: {
			TW: {
				type: Schema.Types.Mixed,
				default: () => ({ type: "doc", content: [{ type: "paragraph" }] })
			},
			EN: {
				type: Schema.Types.Mixed,
				default: () => ({ type: "doc", content: [{ type: "paragraph" }] })
			}
		},
		summary: {
			TW: { type: String, trim: true },
			EN: { type: String, trim: true }
		},
		category: {
			main: {
				type: String,
				enum: ["名詞解說", "產品介紹", "故障排除"],
				required: [true, "主分類為必填"]
			},
			sub: {
				type: String,
				trim: true
			}
		},
		isActive: {
			type: Boolean,
			default: false
		},
		author: {
			type: String,
			required: [true, "作者為必填"]
		},
		publishDate: {
			type: Date,
			default: Date.now
		},
		productModel: {
			type: String,
			trim: true
		},
		videoUrl: [{ type: String }],
		imageUrl: [{ type: String }],
		documentUrl: [{ type: String }],
		slug: {
			type: String,
			unique: true,
			sparse: true,
			lowercase: true
		},
		relatedFaqs: [
			{
				type: Schema.Types.ObjectId,
				ref: "Faq"
			}
		]
	},
	{
		timestamps: true,
		toObject: { virtuals: true }, // 確保 virtuals 被包含在 toObject 結果中
		toJSON: { virtuals: true } // 確保 virtuals 被包含在 toJSON 結果中
	}
);

// --- HOOKS ---
faqSchema.pre("save", async function (next) {
	if ((this.isModified("question.EN") || this.isNew) && this.question && this.question.EN) {
		const slugify = (text) =>
			text
				.toString()
				.toLowerCase()
				.replace(/\s+/g, "-") // 使用連字號替換空格
				.replace(/[^\w\-]+/g, "") // 移除所有非單詞字符（除了連字號）
				.replace(/\-\-+/g, "-") // 將多個連字號替換為單個
				.replace(/^-+/, "") // 從開頭移除連字號
				.replace(/-+$/, ""); // 從結尾移除連字號

		const Model = this.constructor;
		const baseSlug = slugify(this.question.EN);
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

// --- VIRTUALS ---
faqSchema.virtual("metaTitle").get(function () {
	const siteNameTW = "遠岫科技";
	const siteNameEN = "Yenshow";
	const pageTypeTW = "常見問題";
	const pageTypeEN = "FAQ";
	let baseTitleTW = "";
	let baseTitleEN = "";

	if (this.category && this.category.main) {
		let categoryStr = this.category.main;
		if (this.category.sub && this.category.sub.trim() !== "") {
			categoryStr = `${this.category.sub.trim()} | ${this.category.main}`;
		}
		// 限制 category 長度
		if (categoryStr.length > 20) {
			categoryStr = categoryStr.substring(0, 20) + "...";
		}
		baseTitleTW = `${categoryStr} | ${pageTypeTW}`;
		baseTitleEN = `${categoryStr} | ${pageTypeEN}`; // 假設 category 對 TW 和 EN 是一樣的
	} else {
		baseTitleTW = pageTypeTW;
		baseTitleEN = pageTypeEN;
	}

	return {
		TW: `${baseTitleTW} | ${siteNameTW}`,
		EN: `${baseTitleEN} | ${siteNameEN}`
	};
});

faqSchema.virtual("metaDescription").get(function () {
	const maxLength = 155;
	if (this.summary && (this.summary.TW || this.summary.EN)) {
		let descTW = this.summary.TW || this.question.TW || "";
		let descEN = this.summary.EN || this.question.EN || "";

		// TW
		if (descTW.length > maxLength) {
			descTW = descTW.substring(0, maxLength - 3) + "...";
		}

		// EN
		if (descEN.length > maxLength) {
			descEN = descEN.substring(0, maxLength - 3) + "...";
		}
		return {
			TW: descTW,
			EN: descEN
		};
	}

	if (this.question) {
		let descTW = this.question.TW || "";
		let descEN = this.question.EN || "";

		// TW
		if (descTW.length > maxLength) {
			descTW = descTW.substring(0, maxLength - 3) + "...";
		}

		// EN
		if (descEN.length > maxLength) {
			descEN = descEN.substring(0, maxLength - 3) + "...";
		}
		return {
			TW: descTW,
			EN: descEN
		};
	}
	return { TW: "", EN: "" }; // 如果沒有 question，返回空字串
});

// --- 添加轉換配置 ---
const transformOptions = {
	virtuals: true,
	versionKey: false,
	transform: function (doc, ret) {
		// 轉換 _id 為字符串
		if (ret._id) {
			ret._id = ret._id.toString();
		}
		return ret;
	}
};
faqSchema.set("toObject", transformOptions);
faqSchema.set("toJSON", transformOptions);
// --- 配置結束 ---

export default model("Faq", faqSchema);
