/**
 * 將類 Markdown 純文字轉為 Tiptap / ProseMirror JSON（type: "doc"）。
 * 規則：\n\n 分段、# / ## / ### 標題、- 與 1. 清單、**粗體**、*斜體* / _斜體_、單一換行為 hardBreak。
 */

const BULLET_RE = /^-\s+(.+)$/;
const ORDERED_RE = /^(\d+)\.\s+(.+)$/;

/**
 * 以 \n\n 切分區塊；連續的 \n\n 會產生空字串區塊（對應空白段落）。
 * @param {string} text
 * @returns {string[]}
 */
export function splitIntoDoubleNewlineBlocks(text) {
	if (text === "") {
		return [""];
	}
	const blocks = [];
	let chunkStart = 0;
	let i = 0;
	const n = text.length;
	while (i < n) {
		if (text[i] === "\n" && i + 1 < n && text[i + 1] === "\n") {
			blocks.push(text.slice(chunkStart, i));
			i += 2;
			chunkStart = i;
			continue;
		}
		i++;
	}
	blocks.push(text.slice(chunkStart));
	return blocks;
}

/**
 * @param {{ type: string, text?: string, marks?: object[] }[]} nodes
 * @returns {object[]}
 */
function compactTextNodes(nodes) {
	const out = [];
	for (const n of nodes) {
		if (!n || n.type !== "text") {
			continue;
		}
		if (!n.text) {
			continue;
		}
		const prev = out[out.length - 1];
		const keyPrev = prev ? JSON.stringify(prev.marks || null) : null;
		const keyCurr = JSON.stringify(n.marks || null);
		if (prev && keyPrev === keyCurr) {
			prev.text += n.text;
		} else {
			out.push({ type: "text", text: n.text, ...(n.marks ? { marks: n.marks } : {}) });
		}
	}
	return out;
}

/**
 * @param {string} text
 * @returns {{ type: string, text?: string, marks?: object[] }[]}
 */
function parseInlineSegments(text) {
	const out = [];
	let i = 0;
	const n = text.length;
	while (i < n) {
		if (text.startsWith("**", i)) {
			const end = text.indexOf("**", i + 2);
			if (end !== -1) {
				const inner = text.slice(i + 2, end);
				if (inner.length > 0) {
					out.push({ type: "text", text: inner, marks: [{ type: "bold" }] });
				}
				i = end + 2;
				continue;
			}
		}
		const c = text[i];
		if ((c === "*" || c === "_") && text[i + 1] !== c) {
			const end = text.indexOf(c, i + 1);
			if (end !== -1 && end > i + 1) {
				const inner = text.slice(i + 1, end);
				if (inner.length > 0) {
					out.push({ type: "text", text: inner, marks: [{ type: "italic" }] });
				}
				i = end + 1;
				continue;
			}
		}
		let j = i + 1;
		while (j < n) {
			if (text.startsWith("**", j)) {
				break;
			}
			const ch = text[j];
			if (ch === "*" && text[j + 1] === "*") {
				break;
			}
			if (ch === "*" || ch === "_") {
				const em = text.indexOf(ch, j + 1);
				if (em !== -1 && em > j + 1) {
					break;
				}
			}
			j++;
		}
		const plain = text.slice(i, j);
		if (plain.length > 0) {
			out.push({ type: "text", text: plain });
		}
		i = j;
	}
	return compactTextNodes(out);
}

/**
 * @param {string} line
 * @returns {object[]}
 */
function lineToParagraphContent(line) {
	const segments = parseInlineSegments(line);
	return segments.map((s) => {
		const node = { type: "text", text: s.text };
		if (s.marks) {
			node.marks = s.marks;
		}
		return node;
	});
}

/**
 * @param {string} block
 * @returns {object[]}
 */
function linesToParagraphContent(block) {
	const lines = block.split("\n");
	if (lines.length === 0) {
		return [];
	}
	const parts = [];
	for (let li = 0; li < lines.length; li++) {
		if (li > 0) {
			parts.push({ type: "hardBreak" });
		}
		parts.push(...lineToParagraphContent(lines[li]));
	}
	return parts;
}

/**
 * @param {string} block
 * @returns {object | object[] | null}
 */
function tryParseHeadingBlock(block) {
	const lines = block.split("\n");
	const first = lines[0];
	const m = first.match(/^(#{1,3})\s+(.*)$/);
	if (!m) {
		return null;
	}
	const level = m[1].length;
	const titlePart = m[2] ?? "";
	if (lines.length === 1) {
		const headingContent = lineToParagraphContent(titlePart);
		return {
			type: "heading",
			attrs: { level },
			content: headingContent.length ? headingContent : [{ type: "text", text: "" }]
		};
	}
	const headingContent = lineToParagraphContent(titlePart);
	const tailLines = lines.slice(1).join("\n");
	const tailContent = linesToParagraphContent(tailLines);
	return [
		{
			type: "heading",
			attrs: { level },
			content: headingContent.length ? headingContent : [{ type: "text", text: "" }]
		},
		{
			type: "paragraph",
			content: tailContent.length ? tailContent : [{ type: "text", text: "" }]
		}
	];
}

/**
 * @param {string} block
 * @returns {object | null}
 */
function tryParseListBlock(block) {
	const rawLines = block.split("\n");
	const lines = rawLines.map((l) => l.replace(/\s+$/, ""));
	const nonEmpty = lines.map((l, idx) => (l.trim() === "" ? null : idx)).filter((x) => x !== null);
	if (nonEmpty.length === 0) {
		return null;
	}
	const bulletLines = [];
	const orderedLines = [];
	for (const idx of nonEmpty) {
		const line = lines[idx];
		const bm = line.match(BULLET_RE);
		const om = line.match(ORDERED_RE);
		if (bm) {
			bulletLines.push(bm[1]);
		}
		if (om) {
			orderedLines.push({ order: om[1], text: om[2] });
		}
	}
	const allBullet = nonEmpty.length > 0 && bulletLines.length === nonEmpty.length;
	const allOrdered = nonEmpty.length > 0 && orderedLines.length === nonEmpty.length;
	if (allBullet) {
		return {
			type: "bulletList",
			content: bulletLines.map((itemText) => ({
				type: "listItem",
				content: [
					{
						type: "paragraph",
						content: lineToParagraphContent(itemText).length
							? lineToParagraphContent(itemText)
							: [{ type: "text", text: "" }]
					}
				]
			}))
		};
	}
	if (allOrdered) {
		return {
			type: "orderedList",
			content: orderedLines.map((row) => ({
				type: "listItem",
				content: [
					{
						type: "paragraph",
						content: lineToParagraphContent(row.text).length
							? lineToParagraphContent(row.text)
							: [{ type: "text", text: "" }]
					}
				]
			}))
		};
	}
	return null;
}

/**
 * @param {string} block
 * @returns {object[]}
 */
function parseBlock(block) {
	if (block === "") {
		return [{ type: "paragraph" }];
	}
	const heading = tryParseHeadingBlock(block);
	if (heading) {
		return Array.isArray(heading) ? heading : [heading];
	}
	const list = tryParseListBlock(block);
	if (list) {
		return [list];
	}
	const content = linesToParagraphContent(block);
	return [
		{
			type: "paragraph",
			content: content.length ? content : [{ type: "text", text: "" }]
		}
	];
}

/**
 * @param {string} text
 * @returns {{ type: 'doc', content: object[] }}
 */
export function markdownLikeToTiptapDoc(text) {
	const input = typeof text === "string" ? text : "";
	const blocks = splitIntoDoubleNewlineBlocks(input);
	const content = [];
	for (const block of blocks) {
		const nodes = parseBlock(block);
		for (const node of nodes) {
			content.push(node);
		}
	}
	if (content.length === 0) {
		return { type: "doc", content: [{ type: "paragraph" }] };
	}
	return { type: "doc", content };
}
