import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { transliterate } from "transliteration";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NOTO_PATH = path.join(__dirname, "../fonts/NotoSansTC-Regular.otf");
const YENSHOW_LOGO_PATH = path.join(__dirname, "../assets/yenshow-logo.png");

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 32;
const GREEN = "#1b5e20";
const BLACK = "#000000";

const FEATURE_LABELS_EN = {
	people_counting: "People Counting",
	lighting: "Lighting System",
	hvac: "HVAC",
	drainage: "Drainage",
	power: "Power",
	fire: "Fire Safety",
	emergency_rescue: "Emergency Rescue",
	environment: "Environment",
	surveillance: "Surveillance",
	vehicle_access: "Vehicle Access",
	multimedia: "Multimedia",
	smoke_alarm: "Smoke Alarm",
	air_circulation: "Air Circulation",
	elevator: "Elevator Management"
};

const featureLabelEn = (k) => FEATURE_LABELS_EN[k] || k;

const formatQuotaCell = (featureKey, quotas) => {
	const q = quotas?.[featureKey];
	if (q == null || typeof q !== "object" || Array.isArray(q)) return "Unlimited";
	const md = q.maxDevices;
	if (md === null || md === undefined) return "Unlimited";
	if (typeof md === "number" && Number.isFinite(md)) return String(md);
	return "-";
};

const resolveBodyFontName = (doc) => {
	try {
		if (fs.existsSync(NOTO_PATH) && fs.statSync(NOTO_PATH).size > 10_000) {
			doc.registerFont("Body", NOTO_PATH);
			return "Body";
		}
	} catch (_) {
		/* optional font */
	}
	return "Helvetica";
};

/** 中央監控 → YS One Platform；工地管理 → YS One Site */
export const getLicensePdfProductTitle = (deploymentProfile) => {
	if (deploymentProfile === "construction") return "YS One Site";
	return "YS One Platform";
};

/** 下載檔名：YSOP/YSOS-訂單編號.pdf（不含 LK、SN） */
export const getLicensePdfFilename = (deploymentProfile, orderNumber) => {
	const prefix = deploymentProfile === "construction" ? "YSOS" : "YSOP";
	const raw = orderNumber != null ? String(orderNumber).trim() : "";
	const safeOrder = raw ? raw.replace(/[^a-zA-Z0-9-_]/g, "_") : "no-order";
	return `${prefix}-${safeOrder}.pdf`;
};

const safeCustomerNameForPdf = (name, bodyFont) => {
	const raw = name == null || String(name).trim() === "" ? "-" : String(name);
	if (bodyFont === "Body") return raw;
	const t = transliterate(raw);
	const ascii = t && t.trim() ? t : raw;
	// 移除音標/重音符號，避免 Helvetica 顯示成亂碼（例如 ŽĖ）
	return ascii.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

/**
 * @param {object} payload
 * @param {string} payload.customerName
 * @param {string} payload.orderNumber
 * @param {string} payload.licenseKey
 * @param {"Basal"|"Expanded"} payload.licenseTypeLabel
 * @param {"central"|"construction"} [payload.deploymentProfile]
 * @param {string[]} payload.features
 * @param {Record<string, { maxDevices?: number|null }>|null|undefined} payload.quotas
 * @returns {Promise<Buffer>}
 */
export const buildBaSystemLicensePdfBuffer = (payload) =>
	new Promise((resolve, reject) => {
		const doc = new PDFDocument({
			size: "A4",
			margins: { top: 0, bottom: 0, left: 0, right: 0 }
		});
		const chunks = [];
		doc.on("data", (c) => chunks.push(c));
		doc.on("end", () => resolve(Buffer.concat(chunks)));
		doc.on("error", reject);

		try {
			const { customerName, orderNumber, licenseKey, licenseTypeLabel, deploymentProfile, features, quotas } =
				payload;
			const productTitle = getLicensePdfProductTitle(deploymentProfile);

			const bodyFont = resolveBodyFontName(doc);
			const displayName = safeCustomerNameForPdf(customerName, bodyFont);
			const orderDisp = orderNumber != null && String(orderNumber).trim() !== "" ? String(orderNumber).trim() : "-";

			const featList = Array.isArray(features) ? [...features] : [];

			const drawGreenFrame = () => {
				doc.save();
				doc.lineWidth(2.2).strokeColor(GREEN);
				doc.rect(M, M, PAGE_W - 2 * M, PAGE_H - 2 * M).stroke();
				doc.restore();
			};

			drawGreenFrame();

			const GAP = 14;
			let y = M + 16;
			if (fs.existsSync(YENSHOW_LOGO_PATH)) {
				const logoBuf = fs.readFileSync(YENSHOW_LOGO_PATH);
				const logoW = 250;
				doc.image(logoBuf, (PAGE_W - logoW) / 2, y, { width: logoW });
				y += 68;
			} else {
				y += 18;
			}

			y += GAP;
			doc.font("Helvetica-Bold").fontSize(18).fillColor(BLACK);
			const titleH = doc.currentLineHeight(true);
			doc.text(productTitle, 0, y, { align: "center", width: PAGE_W });
			y += titleH + GAP;

			{
				const label = "License Performance";
				const gap = "  ";
				const fontSize = 16;

				// 為了讓「客戶名稱（例如：車）」不再出現垂直跑位，這行統一用同一套字型衡量與繪製。
				// 粗體效果用「重複描字」模擬，避免中英字型 metrics 不同造成上下偏移。
				const fauxBoldText = (text, x, yy) => {
					doc.font(bodyFont).fontSize(fontSize).fillColor(BLACK).text(text, x, yy, { lineBreak: false });
					doc
						.font(bodyFont)
						.fontSize(fontSize)
						.fillColor(BLACK)
						.text(text, x + 0.4, yy, { lineBreak: false });
				};

				doc.font(bodyFont).fontSize(fontSize).fillColor(BLACK);
				const labelW = doc.widthOfString(label);
				const gapW = doc.widthOfString(gap);
				const nameW = doc.widthOfString(displayName);
				const lineH = doc.currentLineHeight(true);

				const total = labelW + gapW + nameW;
				const boxX = M;
				const boxW = PAGE_W - 2 * M;
				const startX = boxX + Math.max(0, (boxW - total) / 2);

				const lineY = y;
				fauxBoldText(label, startX, lineY);
				doc
					.font(bodyFont)
					.fontSize(fontSize)
					.fillColor(BLACK)
					.text(displayName, startX + labelW + gapW, lineY, { lineBreak: false });
				y += lineH + GAP;
			}

			const TABLE_MARGIN_X = 70;
			const TABLE_LEFT = TABLE_MARGIN_X;
			const TABLE_W = PAGE_W - 2 * TABLE_MARGIN_X;
			const LABEL_W = 150;
			const MID_W = 230;
			const ROW_H = 26;
			const cellPad = 6;
			const FOOTER_RESERVE = 72;

			const drawHLine = (yy) => {
				doc.save();
				doc.strokeColor(BLACK).lineWidth(0.45);
				doc
					.moveTo(TABLE_LEFT, yy)
					.lineTo(TABLE_LEFT + TABLE_W, yy)
					.stroke();
				doc.restore();
			};

			const drawVLine = (xx, y1, y2) => {
				doc.save();
				doc.strokeColor(BLACK).lineWidth(0.45);
				doc.moveTo(xx, y1).lineTo(xx, y2).stroke();
				doc.restore();
			};

			const tableTop = y;
			/** 表格外框左／右線在目前頁的起點（換頁時會重設，避免跨頁單線座標錯亂） */
			let outerTableSegmentTop = tableTop;

			const PAGE_TABLE_BOTTOM = PAGE_H - M - FOOTER_RESERVE;

			/** 關閉目前頁的表格區段（底線 + 左右外框到最後一列） */
			const closeTablePageSegment = () => {
				const segmentBottom = y;
				if (segmentBottom <= outerTableSegmentTop) return;
				drawHLine(segmentBottom);
				drawVLine(TABLE_LEFT, outerTableSegmentTop, segmentBottom);
				drawVLine(TABLE_LEFT + TABLE_W, outerTableSegmentTop, segmentBottom);
			};

			const drawRowOuterVLines = (rowY) => {
				drawVLine(TABLE_LEFT, rowY, rowY + ROW_H);
				drawVLine(TABLE_LEFT + TABLE_W, rowY, rowY + ROW_H);
			};

			const ensureSpace = (need) => {
				if (y + need <= PAGE_TABLE_BOTTOM) return;
				closeTablePageSegment();
				doc.addPage();
				drawGreenFrame();
				y = M + 16;
				outerTableSegmentTop = y;
			};

			const twoColRow = (label, value) => {
				ensureSpace(ROW_H);
				const rowY = y;
				drawHLine(rowY);
				drawRowOuterVLines(rowY);
				doc.font("Helvetica-Bold").fontSize(11).fillColor(BLACK);
				doc.text(label, TABLE_LEFT + cellPad, rowY + cellPad, { width: LABEL_W - 2 * cellPad });
				doc.font(bodyFont).fontSize(11).fillColor(BLACK);
				doc.text(String(value), TABLE_LEFT + LABEL_W + cellPad, rowY + cellPad, {
					width: TABLE_W - LABEL_W - 2 * cellPad
				});
				drawVLine(TABLE_LEFT + LABEL_W, rowY, rowY + ROW_H);
				y += ROW_H;
			};

			twoColRow("Purchase Order", orderDisp);
			twoColRow("Activation Code", licenseKey);
			twoColRow("License Type", licenseTypeLabel);
			twoColRow("Expiry Date", "2099-12-31");

			ensureSpace(ROW_H);
			const smTop = y;
			drawHLine(y);
			doc.font("Helvetica-Bold").fontSize(10.5).fillColor(BLACK);
			doc.text("Software Maintenance", TABLE_LEFT + cellPad, y + cellPad, { width: LABEL_W - 2 * cellPad });
			doc.font(bodyFont).fontSize(10.5).fillColor(BLACK);
			doc.text("Software Upgrade Period", TABLE_LEFT + LABEL_W + cellPad, y + cellPad, { width: MID_W - 2 * cellPad });
			doc.font(bodyFont).fontSize(11).fillColor(BLACK);
			doc.text("2 Years", TABLE_LEFT + LABEL_W + MID_W + cellPad, y + cellPad, {
				width: TABLE_W - LABEL_W - MID_W - 2 * cellPad
			});
			drawVLine(TABLE_LEFT + LABEL_W, smTop, smTop + ROW_H);
			drawVLine(TABLE_LEFT + LABEL_W + MID_W, smTop, smTop + ROW_H);
			drawRowOuterVLines(smTop);
			y += ROW_H;

			const renderThreeColSection = (sectionLabel, rows) => {
				const safeRows = Array.isArray(rows) && rows.length > 0 ? rows : [{ mid: "-", right: "-" }];

				// 逐列換頁：避免整段 blockH 放不下時整塊推到下一頁、上一頁留下大片空白
				ensureSpace(ROW_H);
				const headerTop = y;
				drawHLine(headerTop);
				drawRowOuterVLines(headerTop);
				doc.font("Helvetica-Bold").fontSize(11).fillColor(BLACK);
				doc.text(sectionLabel, TABLE_LEFT + cellPad, headerTop + cellPad, { width: LABEL_W - 2 * cellPad });
				drawVLine(TABLE_LEFT + LABEL_W, headerTop, headerTop + ROW_H);
				y += ROW_H;

				for (let i = 0; i < safeRows.length; i++) {
					ensureSpace(ROW_H);
					const rowY = y;
					drawHLine(rowY);
					drawRowOuterVLines(rowY);
					drawVLine(TABLE_LEFT + LABEL_W, rowY, rowY + ROW_H);
					drawVLine(TABLE_LEFT + LABEL_W + MID_W, rowY, rowY + ROW_H);

					doc
						.font(bodyFont)
						.fontSize(11)
						.fillColor(BLACK)
						.text(String(safeRows[i].mid ?? ""), TABLE_LEFT + LABEL_W + cellPad, rowY + cellPad, {
							width: MID_W - 2 * cellPad
						});
					doc
						.font(bodyFont)
						.fontSize(11)
						.fillColor(BLACK)
						.text(String(safeRows[i].right ?? ""), TABLE_LEFT + LABEL_W + MID_W + cellPad, rowY + cellPad, {
							width: TABLE_W - LABEL_W - MID_W - 2 * cellPad
						});

					y += ROW_H;
				}
			};

			renderThreeColSection("Addition", [
				{ mid: "Limited Expand", right: "YES" },
				{ mid: "ONVIF", right: "YES" }
			]);

			const quotaRows =
				featList.length === 0
					? [{ mid: "-", right: "-" }]
					: featList.map((k) => ({
							mid: featureLabelEn(k),
							right: formatQuotaCell(k, quotas)
						}));
			renderThreeColSection("Features & Quotas", quotaRows);

			const appRows =
				featList.length === 0
					? [{ mid: "-", right: "YES" }]
					: featList.map((k) => ({
							mid: featureLabelEn(k),
							right: "YES"
						}));
			renderThreeColSection("Application", appRows);

			closeTablePageSegment();

			y += 16;
			doc.font("Helvetica").fontSize(11).fillColor("#333333");
			doc.text("* The Software Upgrade Period and Software Service Period starts from the day when License is activated", TABLE_LEFT, y, {
				width: TABLE_W,
				align: "left"
			});

			doc.end();
		} catch (e) {
			reject(e);
		}
	});
