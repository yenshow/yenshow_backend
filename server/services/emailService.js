import { Resend } from "resend"; // 引入 Resend SDK
import { ApiError } from "../utils/responseHandler.js";
import fs from "fs/promises"; // 需要讀取檔案內容

// --- Resend 設定 ---
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
	console.error("錯誤：缺少 Resend API 金鑰 (RESEND_API_KEY)。無法初始化郵件服務。");
}

let resend;
if (RESEND_API_KEY) {
	resend = new Resend(RESEND_API_KEY);
	console.log("Resend Client 初始化完成。");
} else {
	console.warn("警告：未設定 Resend API 金鑰，郵件功能將無法使用。");
}
// --- Resend 設定結束 ---

/**
 * 使用 Resend 寄送聯絡表單 Email
 * @param {object} contactFormData - 表單資料
 * @param {Array<object>} files - 上傳的檔案 (multer file objects)
 */
export const sendContactEmail = async (contactFormData, files = []) => {
	if (!resend) {
		throw new ApiError(500, "Resend 郵件服務未正確設定，無法寄送郵件");
	}

	const { name, email, phone, company, subject, type, details } = contactFormData;

	// 驗證必要的環境變數 (收件人、寄件人)
	if (!process.env.CONTACT_EMAIL_RECIPIENT || !process.env.EMAIL_FROM_ADDRESS_RESEND) {
		console.error("錯誤：缺少 CONTACT_EMAIL_RECIPIENT 或 EMAIL_FROM_ADDRESS_RESEND 環境變數。");
		throw new ApiError(500, "郵件服務設定不完整，無法寄送郵件");
	}

	const fromEmail = `"${process.env.EMAIL_FROM_NAME_RESEND || "Yenshow 網站"}" <${process.env.EMAIL_FROM_ADDRESS_RESEND}>`;

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
			to: [process.env.CONTACT_EMAIL_RECIPIENT], // 收件人地址，Resend 接受陣列
			cc: process.env.CONTACT_EMAIL_CC ? process.env.CONTACT_EMAIL_CC.split(",").map((e) => e.trim()) : undefined,
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
