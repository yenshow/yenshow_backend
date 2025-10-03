import { Resend } from "resend"; // 引入 Resend SDK
import { ApiError } from "../utils/responseHandler.js";
import fs from "fs/promises"; // 需要讀取檔案內容

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
