import { StatusCodes } from "http-status-codes";
import Faq from "../../models/Faq.js";
import News from "../../models/News.js";
import Product from "../../models/products.js";
import { getPublicSiteUrl } from "../../utils/publicUrls.js";

const SITE_URL = getPublicSiteUrl();

const TYPE_CONFIG = {
	faqs: {
		model: Faq,
		pathPrefix: "/faqs",
		idField: "slug"
	},
	news: {
		model: News,
		pathPrefix: "/news",
		idField: "slug"
	},
	products: {
		model: Product,
		pathPrefix: "/products",
		idField: "code"
	}
};

const buildAlternates = (path) => ({
	"zh-TW": `${SITE_URL}${path}`,
	"en-US": `${SITE_URL}/en${path}`
});

const toLastmod = (doc) => {
	const d = doc.updatedAt || doc.publishDate;
	return d ? new Date(d).toISOString() : undefined;
};

const verifySitemapSecret = (req) => {
	const secret = process.env.SITEMAP_BUILD_SECRET;
	if (!secret) return true;
	const header = req.headers["x-sitemap-secret"];
	const query = req.query.secret;
	return header === secret || query === secret;
};

export const getSitemapUrls = async (req, res, next) => {
	try {
		if (!verifySitemapSecret(req)) {
			return res.status(StatusCodes.FORBIDDEN).json({
				success: false,
				message: "Invalid sitemap secret"
			});
		}

		const type = req.query.type;
		if (!type || !TYPE_CONFIG[type]) {
			return res.status(StatusCodes.BAD_REQUEST).json({
				success: false,
				message: "Invalid type. Use: faqs, news, products"
			});
		}

		const config = TYPE_CONFIG[type];
		const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
		const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
		const skip = (page - 1) * limit;

		const filter = { isActive: true };
		const [docs, total] = await Promise.all([
			config.model
				.find(filter)
				.select(`${config.idField} updatedAt publishDate`)
				.sort({ updatedAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			config.model.countDocuments(filter)
		]);

		const items = docs
			.filter((doc) => {
				const id = doc[config.idField];
				if (!id || String(id).toLowerCase().includes("undefined")) return false;
				if (type === "products") {
					const c = String(id);
					if (/^[a-f0-9]{24}$/i.test(c)) return false;
					if (/[\u4e00-\u9fa5]/.test(c)) return false;
					if (/^\d+$/.test(c)) return false;
					if (c !== c.toLowerCase()) return false;
				}
				return true;
			})
			.map((doc) => {
				const segment = String(doc[config.idField]).toLowerCase();
				const path = `${config.pathPrefix}/${segment}`;
				return {
					loc: path,
					lastmod: toLastmod(doc),
					alternates: buildAlternates(path)
				};
			});

		return res.status(StatusCodes.OK).json({
			success: true,
			result: {
				items,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit) || 1
				}
			}
		});
	} catch (error) {
		next(error);
	}
};
