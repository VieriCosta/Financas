import { Router } from "express";
import { changeProfile, changeProfilePassword, revokeOtherSessions, revokeSession, sessions, showProfile } from "../controllers/profile.controller.js";
import { authMiddleware } from "../middlewares/auth.js";
import { rateLimit } from "../middlewares/rateLimit.js";
import { csrfProtection } from "../utils/session.js";

export const profileRoutes = Router();

profileRoutes.use(authMiddleware);
profileRoutes.get("/", showProfile);
profileRoutes.patch("/", rateLimit({ scope: "profile-update", windowMs: 15 * 60 * 1000, max: 10 }), csrfProtection, changeProfile);
profileRoutes.patch("/password", rateLimit({ scope: "profile-password", windowMs: 15 * 60 * 1000, max: 5 }), csrfProtection, changeProfilePassword);
profileRoutes.get("/sessions", sessions);
profileRoutes.delete("/sessions/others", csrfProtection, revokeOtherSessions);
profileRoutes.delete("/sessions/:id", csrfProtection, revokeSession);
