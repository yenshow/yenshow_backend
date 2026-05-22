import { Resend } from "resend"; // 引入 Resend SDK
import { ApiError } from "../utils/responseHandler.js";
import fs from "fs/promises"; // 需要讀取檔案內容
import User from "../models/user.js";

// --- Resend 設定 ---
const YENSHOW_RESEND_API_KEY = process.env.YENSHOW_RESEND_API_KEY;
const COMEO_RESEND_API_KEY = process.env.COMEO_RESEND_API_KEY;

// 初始化 Resend 客戶端
let yenshowResend = null;
let comeoResend = null;

if (YENSHOW_RESEND_API_KEY) {
	yenshowResend = new Resend(YENSHOW_RESEND_API_KEY);
	console.log("Yenshow Resend Client 初始化完成。");
} else {
	console.warn("警告：未設定 Yenshow Resend API 金鑰，Yenshow 郵件功能將無法使用。");
}

if (COMEO_RESEND_API_KEY) {
	comeoResend = new Resend(COMEO_RESEND_API_KEY);
	console.log("Comeo Resend Client 初始化完成。");
} else {
	console.warn("警告：未設定 Comeo Resend API 金鑰，Comeo 郵件功能將無法使用。");
}
// --- Resend 設定結束 ---

// --- 授權審核 Email ---
const LICENSE_FROM_NAME = "Yenshow 授權系統";

const DEPLOYMENT_PROFILE_LABELS = {
	central: "YSOP 中央管理平台",
	construction: "YSOS 工地管理平台"
};

const FEATURE_LABELS = {
	people_counting: "人流統計",
	lighting: "照明系統",
	hvac: "空調系統",
	drainage: "排水系統",
	power: "電力系統",
	fire: "消防系統",
	emergency_rescue: "緊急求救",
	environment: "環境品質",
	surveillance: "影像監控",
	vehicle_access: "車輛進出",
	multimedia: "多媒體資訊",
	smoke_alarm: "煙霧警報",
	air_circulation: "空氣循環"
};

const trim = (v) => (typeof v === "string" ? v.trim() : "");
const dash = (v) => v || "—";

const toLicenseDoc = (license) => (license && typeof license.toObject === "function" ? license.toObject() : license);

const formatLicenseDate = (value) => {
	if (!value) return "—";
	const d = value instanceof Date ? value : new Date(value);
	return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
};

const formatDeploymentProfile = (profile) =>
	DEPLOYMENT_PROFILE_LABELS[profile] || DEPLOYMENT_PROFILE_LABELS.central;

const formatFeatureLabel = (key) => FEATURE_LABELS[key] || key;

const formatQuotaCell = (maxDevices) => {
	if (maxDevices === undefined || maxDevices === null || maxDevices === "") return "不限";
	return String(maxDevices);
};

/** 依 features[] 列模組，配額取自 quotas[featureKey].maxDevices */
const buildFeatureQuotaRows = (features, quotas) => {
	const list = Array.isArray(features) ? features : [];
	const quotaMap = quotas && typeof quotas === "object" ? quotas : {};
	return list.map((key) => ({
		module: formatFeatureLabel(key),
		quota: formatQuotaCell(quotaMap[key]?.maxDevices)
	}));
};

const buildFeatureQuotaTableHtml = (rows) => {
	if (!rows.length) return "<p><strong>模組與配額：</strong>—</p>";
	const trs = rows.map((r) => `<tr><td>${r.module}</td><td>${r.quota}</td></tr>`).join("");
	return `<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin:12px 0"><thead><tr><th align="left">模組</th><th align="left">配額</th></tr></thead><tbody>${trs}</tbody></table>`;
};

const buildFeatureQuotaTableText = (rows) => {
	if (!rows.length) return "模組與配額：—\n";
	return ["模組 | 配額", ...rows.map((r) => `${r.module} | ${r.quota}`)].join("\n") + "\n";
};

const licenseAdminLink = () => {
	const base = trim(process.env.YENSHOW_ADMIN_APP_URL);
	const url = base ? `${base.replace(/\/$/, "")}/licenses` : null;
	return url ? { html: `<p><a href="${url}">前往授權管理</a></p>`, text: `\n${url}\n` } : { html: "", text: "\n/licenses\n" };
};

const getLicenseNotifyEmails = () =>
	trim(process.env.YENSHOW_LICENSE_NOTIFY_EMAILS)
		.split(",")
		.map((e) => e.trim())
		.filter(Boolean);

const getLicenseFromAddress = () => {
	if (!yenshowResend) {
		console.warn("授權郵件：Resend 未設定，略過寄信");
		return null;
	}
	const addr = process.env.YENSHOW_EMAIL_FROM_ADDRESS_RESEND;
	if (!addr) {
		console.warn("授權郵件：缺少 YENSHOW_EMAIL_FROM_ADDRESS_RESEND，略過寄信");
		return null;
	}
	return `"${LICENSE_FROM_NAME}" <${addr}>`;
};

const sendLicenseEmail = async ({ to, subject, html, text }) => {
	const from = getLicenseFromAddress();
	if (!from || !to?.length) return null;

	const { data, error } = await yenshowResend.emails.send({ from, to, subject, html, text });
	if (error) {
		console.error("授權郵件 Resend 錯誤:", error);
		throw new Error(error.message || "Resend 寄送失敗");
	}
	return data;
};

const resolveApplicantEmail = async (license) => {
	const account = trim(license?.applicant);
	if (!account) return null;
	const user = await User.findOne({ account, isActive: true }).select("email").lean();
	const email = trim(user?.email);
	if (!email) console.warn(`授權審核通過通知：${account} 無 email，略過寄信`);
	return email || null;
};

/** 待審核：通知 YENSHOW_LICENSE_NOTIFY_EMAILS */
export const sendLicensePendingReviewEmail = async (license, { isExtension = false } = {}) => {
	const to = getLicenseNotifyEmails();
	if (!to.length) {
		console.warn("授權郵件：未設定 YENSHOW_LICENSE_NOTIFY_EMAILS，略過");
		return null;
	}

	const doc = toLicenseDoc(license);
	const ext = isExtension ? "（副授權）" : "";
	const prefix = isExtension ? "[副授權] " : "";
	const quotaRows = buildFeatureQuotaRows(doc.features, doc.quotas);
	const link = licenseAdminLink();

	const textMeta = `客戶名稱：${dash(doc.customerName)}
訂單編號：${dash(doc.orderNumber)}
申請人：${dash(doc.applicant)}
方案：${formatDeploymentProfile(doc.deploymentProfile)}
${buildFeatureQuotaTableText(quotaRows)}備註：${dash(doc.notes)}
申請時間：${formatLicenseDate(doc.appliedAt)}`;

	const htmlMeta = `<p><strong>客戶名稱：</strong>${dash(doc.customerName)}</p>
<p><strong>訂單編號：</strong>${dash(doc.orderNumber)}</p>
<p><strong>申請人：</strong>${dash(doc.applicant)}</p>
<p><strong>方案：</strong>${formatDeploymentProfile(doc.deploymentProfile)}</p>
${buildFeatureQuotaTableHtml(quotaRows)}
<p><strong>備註：</strong></p>
<p style="white-space:pre-wrap">${dash(doc.notes)}</p>
<p><strong>申請時間：</strong>${formatLicenseDate(doc.appliedAt)}</p>`;

	return sendLicenseEmail({
		to,
		subject: `${prefix}[待審核] 授權申請 - ${dash(doc.customerName)} (${dash(doc.orderNumber)})`,
		text: `有新的授權申請待審核${ext}。\n\n${textMeta}${link.text}`,
		html: `<h2>授權待審核${ext}</h2>${htmlMeta}${link.html}`
	});
};

/** 審核通過：通知建立者（依 applicant 查 User.email） */
export const sendLicenseApprovedEmail = async (license, reviewerAccount) => {
	const to = await resolveApplicantEmail(license);
	if (!to) return null;

	const doc = toLicenseDoc(license);
	const isExt = Boolean(doc.parentLicenseKey || doc.parentLicenseId);
	const ext = isExt ? "（副授權）" : "";
	const quotaRows = buildFeatureQuotaRows(doc.features, doc.quotas);
	const link = licenseAdminLink();
	const snText = doc.serialNumber ? `Serial Number：${doc.serialNumber}\n` : "";
	const snHtml = doc.serialNumber ? `<p><strong>Serial Number：</strong>${doc.serialNumber}</p>` : "";

	const textMeta = `客戶名稱：${dash(doc.customerName)}
訂單編號：${dash(doc.orderNumber)}
類型：${isExt ? "副授權" : "主授權"}
方案：${formatDeploymentProfile(doc.deploymentProfile)}
${buildFeatureQuotaTableText(quotaRows)}備註：${dash(doc.notes)}
${snText}License Key：${dash(doc.licenseKey)}
審核人：${dash(reviewerAccount)}
審核時間：${formatLicenseDate(doc.reviewedAt)}`;

	const htmlMeta = `<p><strong>客戶名稱：</strong>${dash(doc.customerName)}</p>
<p><strong>訂單編號：</strong>${dash(doc.orderNumber)}</p>
<p><strong>類型：</strong>${isExt ? "副授權" : "主授權"}</p>
<p><strong>方案：</strong>${formatDeploymentProfile(doc.deploymentProfile)}</p>
${buildFeatureQuotaTableHtml(quotaRows)}
<p><strong>備註：</strong></p>
<p style="white-space:pre-wrap">${dash(doc.notes)}</p>
${snHtml}
<p><strong>License Key：</strong><code>${dash(doc.licenseKey)}</code></p>
<p><strong>審核人：</strong>${dash(reviewerAccount)}</p>
<p><strong>審核時間：</strong>${formatLicenseDate(doc.reviewedAt)}</p>`;

	return sendLicenseEmail({
		to: [to],
		subject: `[已審核] 授權可啟用${ext} - ${dash(doc.customerName)}`,
		text: `您的授權已審核通過，狀態為「可啟用」。\n\n${textMeta}${link.text}`,
		html: `<h2>授權已審核通過${ext}</h2><p>狀態：可啟用</p>${htmlMeta}${link.html}`
	});
};

/**
 * 使用 Resend 寄送聯絡表單 Email
 * @param {object} contactFormData - 表單資料
 * @param {Array<object>} files - 上傳的檔案 (multer file objects)
 * @param {string} site - 網站類型 ('yenshow' 或 'comeo')
 */
export const sendContactEmail = async (contactFormData, files = [], site = "yenshow") => {
	// 根據網站選擇對應的 Resend 客戶端
	const resend = site === "comeo" ? comeoResend : yenshowResend;

	if (!resend) {
		throw new ApiError(500, `${site === "comeo" ? "Comeo" : "Yenshow"} Resend 郵件服務未正確設定，無法寄送郵件`);
	}

	const { name, email, phone, company, subject, type, details } = contactFormData;

	// 根據網站選擇對應的環境變數
	const sitePrefix = site === "comeo" ? "COMEO_" : "YENSHOW_";
	const contactEmailRecipient = process.env[`${sitePrefix}CONTACT_EMAIL_RECIPIENT`];
	const emailFromAddress = process.env[`${sitePrefix}EMAIL_FROM_ADDRESS_RESEND`];
	const emailFromName = process.env[`${sitePrefix}EMAIL_FROM_NAME_RESEND`];
	const contactEmailCC = process.env[`${sitePrefix}CONTACT_EMAIL_CC`];

	// 驗證必要的環境變數 (收件人、寄件人)
	if (!contactEmailRecipient || !emailFromAddress) {
		console.error(`錯誤：缺少 ${sitePrefix}CONTACT_EMAIL_RECIPIENT 或 ${sitePrefix}EMAIL_FROM_ADDRESS_RESEND 環境變數。`);
		throw new ApiError(500, "郵件服務設定不完整，無法寄送郵件");
	}

	const fromEmail = `"${emailFromName || `${site === "comeo" ? "Comeo" : "Yenshow"} 網站`}" <${emailFromAddress}>`;

	const mailSubject = `聯絡表單: ${subject}`;
	const mailText = `
				主旨: ${subject}
				需求類型: ${type.join(", ") || "未選擇"}
        公司/部門: ${company || "未提供"}
        姓名: ${name}
        Email: ${email}
        電話: ${phone || "未提供"}
        詳細說明:
        ${details}
    `;
	const mailHtml = `
        <h2>主旨: ${subject}</h2>
        <p><strong>需求類型:</strong> ${type.join(", ") || "未選擇"}</p>
        <p><strong>公司/部門:</strong> ${company || "未提供"}</p>
        <p><strong>姓名:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>電話:</strong> ${phone || "未提供"}</p>
        <hr>
        <p><strong>詳細說明:</strong></p>
        <p style="white-space: pre-wrap;">${details}</p>
    `;

	// 準備附件 (Resend SDK 接受 { filename: string, content: Buffer } 格式)
	const attachmentsForResend = [];
	if (files && files.length > 0) {
		for (const file of files) {
			try {
				const fileContent = await fs.readFile(file.path);
				attachmentsForResend.push({
					filename: file.originalname, // 直接使用原始檔名
					content: fileContent // 直接傳遞 Buffer
				});
			} catch (readError) {
				console.error(`讀取附件檔案 ${file.originalname} 時發生錯誤:`, readError);
				// 根據需求決定是否拋出錯誤或繼續
			}
		}
	}

	try {
		const { data, error } = await resend.emails.send({
			from: fromEmail,
			to: [contactEmailRecipient], // 收件人地址，Resend 接受陣列
			cc: contactEmailCC ? contactEmailCC.split(",").map((e) => e.trim()) : undefined,
			subject: mailSubject,
			html: mailHtml,
			text: mailText,
			reply_to: email, // 設定回覆地址為表單填寫者的信箱
			attachments: attachmentsForResend.length > 0 ? attachmentsForResend : undefined
		});

		if (error) {
			console.error("使用 Resend 寄送郵件時發生錯誤:", error);
			throw new ApiError(error.statusCode || 500, `Resend 寄送郵件失敗: ${error.message}`);
		}

		console.log("郵件已成功透過 Resend 寄送:", data); // data 通常包含 id
		return data; // 可以返回 Resend 的回應
	} catch (error) {
		// 捕捉 resend.emails.send 內部可能拋出的非 API 錯誤或其他錯誤
		if (error instanceof ApiError) throw error; // 如果已經是 ApiError，直接拋出
		console.error("寄送 Resend 郵件過程中發生未預期錯誤:", error);
		throw new ApiError(500, `寄送郵件失敗: ${error.message || "未知錯誤"}`);
	}
};
