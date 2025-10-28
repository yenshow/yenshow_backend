import { Schema, model } from "mongoose";
import { slugify } from "transliteration";

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

		// 5. coverImageUrl - 封面圖片 URL
		coverImageUrl: {
			type: String,
			trim: true
		},

		// 6. images - 圖片
		images: [
			{
				type: String,
				required: [true, "圖片為必填"]
			}
		],

		// 8. isActive - 是否啟用
		isActive: {
			type: Boolean,
			default: false,
			index: true
		},

		// 9. slug - URL 友好字串
		slug: {
			type: String,
			unique: true,
			sparse: true,
			lowercase: true
		},

		// 10. author - 作者
		author: {
			type: String,
			required: [true, "作者為必填"],
			trim: true
		},

		// 11. publishDate - 發布日期
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

// --- HOOKS ---
// 生成 slug 的 pre-save hook
caseStudySchema.pre("save", async function (next) {
	if ((this.isModified("title") || this.isNew) && this.title) {
		const Model = this.constructor;

		// 使用 transliteration 套件處理中文轉拼音
		const baseSlug = slugify(this.title, {
			lowercase: true,
			separator: "-",
			trim: true
		});

		let slug = baseSlug;
		let counter = 1;

		// 確保 slug 唯一性
		while (true) {
			const existingDoc = await Model.findOne({ slug: slug });
			// 如果沒有文件存在，或現有文件就是當前文件，則 slug 是唯一的
			if (!existingDoc || existingDoc._id.equals(this._id)) {
				break;
			}
			// 否則，slug 已被使用，生成新的
			counter++;
			slug = `${baseSlug}-${counter}`;
		}
		this.slug = slug;
	}
	next();
});

// --- VIRTUALS ---
// 虛擬欄位：主要圖片（優先使用封面圖片）
caseStudySchema.virtual("mainImage").get(function () {
	// 如果有封面圖片，優先使用封面圖片
	if (this.coverImageUrl) {
		return this.coverImageUrl;
	}
	// 否則使用第一張圖片
	return this.images.length > 0 ? this.images[0] : null;
});

// 虛擬欄位：解決方案字串
caseStudySchema.virtual("solutionsText").get(function () {
	return this.solutions.join("、");
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
caseStudySchema.set("toObject", transformOptions);
caseStudySchema.set("toJSON", transformOptions);
// --- 配置結束 ---

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
