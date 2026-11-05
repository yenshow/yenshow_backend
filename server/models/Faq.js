import { Schema, model } from "mongoose";
import { FAQ_CATEGORY_MAIN_EN_ENUM, FAQ_CATEGORY_MAIN_TW_ENUM } from "../constants/mainCategories.js";

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
		seoTitle: {
			TW: { type: String, trim: true },
			EN: { type: String, trim: true }
		},
		category: {
			main: {
				TW: {
					type: String,
					enum: [...FAQ_CATEGORY_MAIN_TW_ENUM],
					required: [true, "主分類為必填"]
				},
				EN: {
					type: String,
					enum: [...FAQ_CATEGORY_MAIN_EN_ENUM],
					trim: true
				}
			},
			sub: {
				TW: { type: String, trim: true },
				EN: { type: String, trim: true }
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
		],
		relatedSolutions: [
			{
				type: String,
				trim: true
			}
		],
		relatedProductPaths: [
			{
				type: String,
				trim: true
			}
		],
		ctaPrimary: {
			label: {
				TW: { type: String, trim: true },
				EN: { type: String, trim: true }
			},
			href: { type: String, trim: true },
			type: {
				type: String,
				enum: ["contact", "solution", "product", "external"],
				default: "contact"
			}
		}
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

const stripSeoText = (text = "") =>
	String(text)
		.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, "")
		.replace(/\s+/g, " ")
		.trim();

const truncateMeta = (text, maxLength = 155) => {
	if (!text) return "";
	if (text.length <= maxLength) return text;
	return text.substring(0, maxLength - 3) + "...";
};

// --- VIRTUALS ---
faqSchema.virtual("metaTitle").get(function () {
	const pageTypeTW = "常見問題";
	const pageTypeEN = "FAQ";
	const seoTW = this.seoTitle?.TW?.trim() || "";
	const seoEN = this.seoTitle?.EN?.trim() || "";
	const questionTW = stripSeoText(this.question?.TW || "");
	const questionEN = stripSeoText(this.question?.EN || "");

	return {
		TW: seoTW || (questionTW ? `${questionTW} | ${pageTypeTW}` : pageTypeTW),
		EN: seoEN || (questionEN ? `${questionEN} | ${pageTypeEN}` : pageTypeEN)
	};
});

faqSchema.virtual("metaDescription").get(function () {
	return {
		TW: truncateMeta(this.summary?.TW || this.question?.TW || ""),
		EN: truncateMeta(this.summary?.EN || this.question?.EN || "")
	};
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
