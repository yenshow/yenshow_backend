import express from "express";
import rateLimit from "express-rate-limit";
import { catchAsync } from "../utils/responseHandler.js";
import { requireLineIdToken, requireHubBinding } from "../middlewares/lineIdToken.js";
import * as hubController from "../controllers/hub/hubController.js";

const router = express.Router();

const verifyOrderLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 30,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		status: "fail",
		message: "驗證嘗試過於頻繁，請稍後再試"
	}
});

router.use(requireLineIdToken);

router.get("/me", catchAsync(hubController.getMe));
router.post("/verify-order", verifyOrderLimiter, catchAsync(hubController.verifyOrder));

router.get("/orders", requireHubBinding, catchAsync(hubController.listOrders));
router.get("/orders/:id", requireHubBinding, catchAsync(hubController.getOrder));

router.get("/service-tickets", requireHubBinding, catchAsync(hubController.listServiceTickets));
router.get("/service-tickets/:id", requireHubBinding, catchAsync(hubController.getServiceTicket));
router.post("/service-tickets", requireHubBinding, catchAsync(hubController.createServiceTicket));

export default router;
