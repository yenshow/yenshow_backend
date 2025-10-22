import { Schema, model } from "mongoose";
import slugify from "slugify";

const caseStudySchema = new Schema(
	{
		// 1. title - 案例標題
		title: {
			type: String,
			required: [true, "案例標題為必填"],
			trim: true
		},

		// 2. description - 案例描述
		description: {
			type: String,
			required: [true, "案例描述為必填"],
			trim: true
		},

		// 3. projectType - 專案類型（用於分類）
		projectType: {
			type: String,
			required: [true, "專案類型為必填"],
			enum: {
				values: ["智慧建築", "系統整合", "安全監控"],
				message: "專案類型必須是有效的選項"
			},
			index: true
		},

		// 4. solutions - 解決方案（手動填入，如：智慧門禁、可視對講等）
		solutions: [
			{
				type: String,
				required: [true, "解決方案不能為空"],
				trim: true
			}
		],

		// 5. images - 圖片
		images: [
			{
				type: String,
				required: [true, "圖片為必填"]
			}
		],

		// 7. isActive - 是否啟用
		isActive: {
			type: Boolean,
			default: false,
			index: true
		},

		// 8. slug - URL 友好字串
		slug: {
			type: String,
			unique: true,
			sparse: true,
			lowercase: true,
			index: true,
			trim: true
		},

		// 9. author - 作者
		author: {
			type: String,
			required: [true, "作者為必填"],
			trim: true
		},

		// 10. publishDate - 發布日期
		publishDate: {
			type: Date,
			default: Date.now,
			index: true
		}
	},
	{
		timestamps: true,
		versionKey: false
	}
);

// 建立複合索引
caseStudySchema.index({ projectType: 1, isActive: 1 });
caseStudySchema.index({ publishDate: -1, isActive: 1 });

// 生成 slug 的 pre-save hook
caseStudySchema.pre("save", async function (next) {
	// 只有在標題改變且沒有 slug 時才生成
	if (this.isModified("title") && !this.slug) {
		const baseSlug = slugify(this.title, {
			lower: true,
			strict: true,
			locale: "zh"
		});

		let slug = baseSlug;
		let counter = 1;

		// 確保 slug 唯一性
		while (await this.constructor.findOne({ slug })) {
			slug = `${baseSlug}-${counter}`;
			counter++;
		}

		this.slug = slug;
	}
	next();
});

// 虛擬欄位：主要圖片
caseStudySchema.virtual("mainImage").get(function () {
	return this.images.length > 0 ? this.images[0] : null;
});

// 虛擬欄位：解決方案字串
caseStudySchema.virtual("solutionsText").get(function () {
	return this.solutions.join("、");
});

// 確保虛擬欄位在 JSON 輸出中包含
caseStudySchema.set("toJSON", { virtuals: true });
caseStudySchema.set("toObject", { virtuals: true });

// 靜態方法：根據專案類型查詢
caseStudySchema.statics.findByProjectType = function (projectType, options = {}) {
	const query = { projectType, isActive: true };
	return this.find(query, null, options);
};

// 靜態方法：搜尋案例
caseStudySchema.statics.search = function (searchTerm, options = {}) {
	const query = {
		isActive: true,
		$or: [
			{ title: { $regex: searchTerm, $options: "i" } },
			{ description: { $regex: searchTerm, $options: "i" } },
			{ solutions: { $in: [new RegExp(searchTerm, "i")] } }
		]
	};
	return this.find(query, null, options);
};

export default model("CaseStudy", caseStudySchema);
