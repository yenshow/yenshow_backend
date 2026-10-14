import * as lineService from "../../services/lineService.js";

/**
 * LINE Webhook Controller
 * 產品瀏覽改由 LIFF／Rich Menu；此處僅處理加退追與後續推播所需 webhook。
 */
export const webhook = async (req, res) => {
	const events = req.body.events;

	try {
		const result = await Promise.all(events.map(handleEvent));
		res.json(result);
	} catch (error) {
		console.error("Failed to process LINE webhook events:", error);
		if (error.originalError) {
			console.error("LINE SDK Original Error:", error.originalError.response.data);
		}
		res.status(500).end();
	}
};

const handleEvent = async (event) => {
	if (event.type === "follow") {
		return lineService.handleFollow(event);
	}
	if (event.type === "unfollow") {
		return lineService.handleUnfollow(event);
	}
	// message / postback 不再處理（規格與產品改由 LIFF 內操作）
	return Promise.resolve(null);
};
