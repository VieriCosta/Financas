import { Router } from "express";
import { changePassword, forgotPassword, login, register } from "../controllers/auth.controller.js";

export const authRoutes = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Cadastra um usuario
 */
authRoutes.post("/register", register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Autentica um usuario
 */
authRoutes.post("/login", login);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Solicita link de redefinicao de senha
 */
authRoutes.post("/forgot-password", forgotPassword);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Altera a senha usando token recebido por e-mail
 */
authRoutes.post("/reset-password", changePassword);
