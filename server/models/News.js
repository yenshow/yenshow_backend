import { Schema, model } from "mongoose";

// 新聞內容項目 Schema
const newsContentItemSchema = new Schema(
	{
		itemType: {
			type: String,
			required: true,
			enum: ["richText", "image", "videoEmbed"] // 可擴展
		},
		// --- richText 類型數據 ---
		richTextData: {
			TW: { type: Schema.Types.Mixed, default: () => ({ type: "doc", content: [{ type: "paragraph" }] }) }, // 預設為空的 Tiptap doc
			EN: { type: Schema.Types.Mixed, default: () => ({ type: "doc", content: [{ type: "paragraph" }] }) } // 預設為空的 Tiptap doc
		},
		// --- image 類型數據 ---
		imageUrl: { type: String }, // 對於 image itemType
		imageAltText: {
			// 圖片替代文字
			TW: { type: String },
			EN: { type: String }
		},
		imageCaption: {
			// 圖片說明
			TW: { type: String },
			EN: { type: String }
		},
		// --- videoEmbed 類型數據 ---
		videoEmbedUrl: { type: String },
		videoCaption: {
			// 影片說明
			TW: { type: String },
			EN: { type: String }
		},
		sortOrder: { type: Number, default: 0 } // 用於排序區塊
	},
	{ timestamps: true }
);

const newsSchema = new Schema(
	{
		title: {
			TW: { type: String, required: [true, "繁體中文標題為必填"] },
			EN: { type: String, required: [true, "英文標題為必填 (用於產生語意化路由)"] }
		},
		summary: {
			TW: { type: String },
			EN: { type: String }
		},
		content: {
			type: [newsContentItemSchema],
			default: []
		},
		category: {
			type: String,
			required: [true, "分類為必填"],
			enum: {
				values: ["智慧方案", "產品介紹", "品牌新聞"],
				message: "無效的分類：{VALUE}"
			}
		},
		coverImageUrl: { type: String }, // 封面圖片 URL
		publishDate: {
			type: Date,
			default: Date.now // 設定預設為當前日期
		},
		isActive: {
			type: Boolean,
			default: false // isActive 預設為 false
		},
		author: {
			type: String,
			required: [true, "作者為必填"]
		},
		slug: {
			type: String,
			unique: true,
			sparse: true, // 允許多個文件沒有 slug (雖然我們的目標是都有)
			lowercase: true
		}
	},
	{
		timestamps: true
	}
);

// --- HOOKS ---
newsSchema.pre("save", async function (next) {
	if ((this.isModified("title.EN") || this.isNew) && this.title && this.title.EN) {
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
		const baseSlug = slugify(this.title.EN);
		let slug = baseSlug;
		let counter = 1;

		// A more robust way to ensure slug uniqueness
		while (true) {
			const existingDoc = await Model.findOne({ slug: slug });
			// If no doc exists, or the existing doc is this exact one, the slug is unique.
			if (!existingDoc || existingDoc._id.equals(this._id)) {
				break;
			}
			// Otherwise, the slug is taken. Generate a new one.
			counter++;
			slug = `${baseSlug}-${counter}`;
		}
		this.slug = slug;
	}
	next();
});

// --- VIRTUALS ---
newsSchema.virtual("metaTitle").get(function () {
	const siteNameTW = "遠岫科技";
	const siteNameEN = "Yenshow";
	if (this.title) {
		let baseTitleTW = this.title.TW || "";
		let baseTitleEN = this.title.EN || "";

		// TW
		if (baseTitleTW.length > 45) {
			baseTitleTW = baseTitleTW.substring(0, 45) + "...";
		}
		const metaTitleTW = baseTitleTW ? `${baseTitleTW} | ${siteNameTW}` : siteNameTW;

		// EN
		if (baseTitleEN.length > 45) {
			baseTitleEN = baseTitleEN.substring(0, 45) + "...";
		}
		const metaTitleEN = baseTitleEN ? `${baseTitleEN} | ${siteNameEN}` : siteNameEN;

		return {
			TW: metaTitleTW,
			EN: metaTitleEN
		};
	}
	return { TW: siteNameTW, EN: siteNameEN }; // 如果沒有 title，至少顯示網站名稱
});

newsSchema.virtual("metaDescription").get(function () {
	const maxLength = 155;
	if (this.summary) {
		let descTW = this.summary.TW || "";
		let descEN = this.summary.EN || "";

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
	return { TW: "", EN: "" }; // 如果沒有 summary，返回空字串
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
		// 如果 content 中的區塊有 _id (來自 Mongoose 的 subdocument _id)，也轉換它們
		if (ret.content && Array.isArray(ret.content)) {
			ret.content.forEach((block) => {
				if (block._id && typeof block._id === "object" && block._id.toString) {
					block._id = block._id.toString();
				}
			});
		}
		return ret;
	}
};
newsSchema.set("toObject", transformOptions);
newsSchema.set("toJSON", transformOptions);
// --- 配置結束 ---

export default model("News", newsSchema);
