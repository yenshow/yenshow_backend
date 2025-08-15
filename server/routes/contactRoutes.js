import express from "express";
import { handleContactForm } from "../controllers/contactController.js";
import { handleUploads, handleMulterError } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// 定義聯絡表單提交路由
// POST /api/contact
router.post("/contact", handleUploads, handleContactForm, handleMulterError);

export default router;
