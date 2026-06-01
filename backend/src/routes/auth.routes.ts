import { Router } from "express";
import { changePassword, forgotPassword, login, logout, register, session } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.js";
import { rateLimit } from "../middlewares/rateLimit.js";
import { csrfProtection } from "../utils/session.js";

export const authRoutes = Router();

const registerLimiter = rateLimit({ scope: "register", windowMs: 60 * 60 * 1000, max: 10 });
const loginLimiter = rateLimit({ scope: "login-ip", windowMs: 15 * 60 * 1000, max: 20 });
const loginAccountLimiter = rateLimit({
  scope: "login-account",
  windowMs: 15 * 60 * 1000,
  max: 10,
  key: (req) => String(req.body?.email ?? "").trim().toLowerCase()
});
const passwordResetLimiter = rateLimit({ scope: "password-reset", windowMs: 60 * 60 * 1000, max: 5 });

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Cadastra um usuario
 */
authRoutes.post("/register", registerLimiter, register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Autentica um usuario
 */
authRoutes.post("/login", loginLimiter, loginAccountLimiter, login);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Solicita link de redefinicao de senha
 */
authRoutes.post("/forgot-password", passwordResetLimiter, forgotPassword);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Altera a senha usando token recebido por e-mail
 */
authRoutes.post("/reset-password", passwordResetLimiter, changePassword);
authRoutes.get("/session", authMiddleware, session);
authRoutes.post("/logout", authMiddleware, csrfProtection, logout);
