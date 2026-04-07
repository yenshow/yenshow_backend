import { Schema, model } from "mongoose";
import { NEWS_CATEGORY_MAIN_EN_ENUM, NEWS_CATEGORY_MAIN_TW_ENUM } from "../constants/mainCategories.js";

const defaultEmptyDoc = () => ({ type: "doc", content: [{ type: "paragraph" }] });

const attachmentImageSchema = new Schema(
	{
		url: { type: String, default: "" }
	},
	{ timestamps: true }
);

const attachmentVideoSchema = new Schema(
	{
		source: { type: String, required: true, enum: ["upload", "embed"] },
		url: { type: String },
		embedUrl: { type: String }
	},
	{ timestamps: true }
);

const attachmentDocumentSchema = new Schema(
	{
		url: { type: String, default: "" }
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
			TW: { type: String, trim: true },
			EN: { type: String, trim: true }
		},
		article: {
			TW: {
				type: Schema.Types.Mixed,
				default: defaultEmptyDoc
			},
			EN: {
				type: Schema.Types.Mixed,
				default: defaultEmptyDoc
			}
		},
		category: {
			main: {
				TW: {
					type: String,
					enum: [...NEWS_CATEGORY_MAIN_TW_ENUM],
					required: [true, "主分類為必填"]
				},
				EN: {
					type: String,
					enum: [...NEWS_CATEGORY_MAIN_EN_ENUM],
					trim: true
				}
			}
		},
		coverImageUrl: { type: String },
		attachmentImages: { type: [attachmentImageSchema], default: [] },
		attachmentVideos: { type: [attachmentVideoSchema], default: [] },
		attachmentDocuments: { type: [attachmentDocumentSchema], default: [] },
		publishDate: {
			type: Date,
			default: Date.now
		},
		isActive: {
			type: Boolean,
			default: false
		},
		author: {
			type: String,
			required: [true, "作者為必填"]
		},
		slug: {
			type: String,
			unique: true,
			sparse: true,
			lowercase: true
		},
		relatedNews: [
			{
				type: Schema.Types.ObjectId,
				ref: "News"
			}
		]
	},
	{
		timestamps: true,
		toObject: { virtuals: true },
		toJSON: { virtuals: true }
	}
);

newsSchema.pre("save", async function (next) {
	if ((this.isModified("title.EN") || this.isNew) && this.title && this.title.EN) {
		const slugify = (text) =>
			text
				.toString()
				.toLowerCase()
				.replace(/\s+/g, "-")
				.replace(/[^\w\-]+/g, "")
				.replace(/\-\-+/g, "-")
				.replace(/^-+/, "")
				.replace(/-+$/, "");

		const Model = this.constructor;
		const baseSlug = slugify(this.title.EN);
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
		this.slug = slug.trim();
	}
	next();
});

newsSchema.virtual("metaTitle").get(function () {
	const siteNameTW = "遠岫科技";
	const siteNameEN = "Yenshow";
	const pageTypeTW = "最新消息";
	const pageTypeEN = "News";
	let baseTitleTW = "";
	let baseTitleEN = "";

	if (this.category && this.category.main) {
		const mainTW = typeof this.category.main === "string" ? this.category.main : this.category.main.TW || "";
		const mainENVal = typeof this.category.main === "string" ? "" : this.category.main.EN || "";

		let categoryStrTW = mainTW;
		if (categoryStrTW.length > 20) {
			categoryStrTW = categoryStrTW.substring(0, 20) + "...";
		}
		baseTitleTW = `${categoryStrTW} | ${pageTypeTW}`;

		let categoryStrEN = mainENVal && mainENVal.trim() !== "" ? mainENVal.trim() : mainTW;
		if (categoryStrEN.length > 20) {
			categoryStrEN = categoryStrEN.substring(0, 20) + "...";
		}
		baseTitleEN = `${categoryStrEN} | ${pageTypeEN}`;
	} else {
		baseTitleTW = pageTypeTW;
		baseTitleEN = pageTypeEN;
	}

	if (this.title) {
		let tTw = this.title.TW || "";
		let tEn = this.title.EN || "";
		if (tTw.length > 35) {
			tTw = tTw.substring(0, 35) + "...";
		}
		if (tEn.length > 35) {
			tEn = tEn.substring(0, 35) + "...";
		}
		if (tTw) {
			baseTitleTW = `${tTw} | ${baseTitleTW}`;
		}
		if (tEn) {
			baseTitleEN = `${tEn} | ${baseTitleEN}`;
		}
	}

	return {
		TW: `${baseTitleTW} | ${siteNameTW}`,
		EN: `${baseTitleEN} | ${siteNameEN}`
	};
});

newsSchema.virtual("metaDescription").get(function () {
	const maxLength = 155;
	if (this.summary && (this.summary.TW || this.summary.EN)) {
		let descTW = this.summary.TW || "";
		let descEN = this.summary.EN || "";
		if (descTW.length > maxLength) {
			descTW = descTW.substring(0, maxLength - 3) + "...";
		}
		if (descEN.length > maxLength) {
			descEN = descEN.substring(0, maxLength - 3) + "...";
		}
		return { TW: descTW, EN: descEN };
	}
	if (this.title) {
		let descTW = this.title.TW || "";
		let descEN = this.title.EN || "";
		if (descTW.length > maxLength) {
			descTW = descTW.substring(0, maxLength - 3) + "...";
		}
		if (descEN.length > maxLength) {
			descEN = descEN.substring(0, maxLength - 3) + "...";
		}
		return { TW: descTW, EN: descEN };
	}
	return { TW: "", EN: "" };
});

const transformSubdocIds = (arr) => {
	if (!Array.isArray(arr)) return;
	for (const row of arr) {
		if (row._id && typeof row._id === "object" && row._id.toString) {
			row._id = row._id.toString();
		}
	}
};

const transformOptions = {
	virtuals: true,
	versionKey: false,
	transform: function (doc, ret) {
		if (ret._id) {
			ret._id = ret._id.toString();
		}
		transformSubdocIds(ret.attachmentImages);
		transformSubdocIds(ret.attachmentVideos);
		transformSubdocIds(ret.attachmentDocuments);
		return ret;
	}
};
newsSchema.set("toObject", transformOptions);
newsSchema.set("toJSON", transformOptions);

export default model("News", newsSchema);
