import * as lineService from "../services/lineService.js";

/**
 * LINE Webhook Controller
 * Receives validated webhook events from the LINE Platform.
 */
export const webhook = async (req, res, next) => {
	// The line.middleware has already validated the signature and parsed the events.
	const events = req.body.events;

	try {
		// Process all events concurrently.
		const result = await Promise.all(events.map(handleEvent));
		res.json(result);
	} catch (error) {
		console.error("Failed to process LINE webhook events:", error);
		// It's good practice to also log the error details if available.
		if (error.originalError) {
			console.error("LINE SDK Original Error:", error.originalError.response.data);
		}
		res.status(500).end();
	}
};

const handleEvent = async (event) => {
	if (event.type === "unfollow") {
		return lineService.handleUnfollow(event);
	}

	if (event.type === "follow") {
		return lineService.handleFollow(event);
	}

	if (event.type === "message" && event.message.type === "text") {
		return lineService.handleMessage(event);
	}

	if (event.type === "postback") {
		return lineService.handlePostback(event);
	}

	return Promise.resolve(null);
};
