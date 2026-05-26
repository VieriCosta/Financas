import { Router } from "express";
import { changePassword, forgotPassword, login, register } from "../controllers/auth.controller.js";
import { rateLimit } from "../middlewares/rateLimit.js";

export const authRoutes = Router();

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
const passwordResetLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5 });

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Cadastra um usuario
 */
authRoutes.post("/register", authLimiter, register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Autentica um usuario
 */
authRoutes.post("/login", authLimiter, login);

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
