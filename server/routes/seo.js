import express from "express";
import { getSitemapUrls } from "../controllers/seo/SitemapController.js";

const router = express.Router();

router.get("/sitemap-urls", getSitemapUrls);

export default router;
