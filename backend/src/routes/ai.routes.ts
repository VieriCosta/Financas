import { Router } from "express";
import { advice, confirmCommand, history, monthlyReport, previewCommand } from "../controllers/ai.controller.js";
import { authMiddleware } from "../middlewares/auth.js";
import { rateLimit } from "../middlewares/rateLimit.js";
import { csrfProtection } from "../utils/session.js";

export const aiRoutes = Router();

const aiLimiter = rateLimit({ scope: "ai", windowMs: 60 * 1000, max: 12 });

aiRoutes.use(authMiddleware, aiLimiter);
aiRoutes.get("/history", history);
aiRoutes.post("/advice", csrfProtection, advice);
aiRoutes.post("/report", csrfProtection, monthlyReport);
aiRoutes.post("/commands/preview", csrfProtection, previewCommand);
aiRoutes.post("/commands/confirm", csrfProtection, confirmCommand);
