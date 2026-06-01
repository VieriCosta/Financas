import { Request, Response } from "express";
import { forgotPasswordDto, loginDto, registerDto, resetPasswordDto } from "../dtos/auth.dto.js";
import { prisma } from "../config/prisma.js";
import { loginUser, registerUser, requestPasswordReset, resetPassword } from "../services/auth.service.js";
import { clearSessionCookies, issueSessionCookies } from "../utils/session.js";

export async function register(req: Request, res: Response) {
  const data = registerDto.parse(req.body);
  const result = await registerUser(data, getSessionMetadata(req));
  const csrfToken = issueSessionCookies(res, result.token);
  return res.status(201).json({ user: result.user, csrfToken });
}

export async function login(req: Request, res: Response) {
  const data = loginDto.parse(req.body);
  const result = await loginUser(data, getSessionMetadata(req));
  const csrfToken = issueSessionCookies(res, result.token);
  return res.json({ user: result.user, csrfToken });
}

export async function forgotPassword(req: Request, res: Response) {
  const data = forgotPasswordDto.parse(req.body);
  const result = await requestPasswordReset(data);
  return res.json({
    message: "Se o e-mail existir, enviaremos um link de redefinicao.",
    resetUrl: result.resetUrl
  });
}

export async function changePassword(req: Request, res: Response) {
  const data = resetPasswordDto.parse(req.body);
  await resetPassword(data);
  return res.json({ message: "Senha alterada com sucesso." });
}

export async function session(req: Request, res: Response) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.userId },
    select: { id: true, name: true, email: true }
  });
  const csrfToken = issueSessionCookies(res, req.authToken);
  return res.json({ user, csrfToken });
}

export async function logout(_req: Request, res: Response) {
  await prisma.authSession.updateMany({ where: { id: _req.sessionId, userId: _req.userId }, data: { revokedAt: new Date() } });
  clearSessionCookies(res);
  return res.status(204).send();
}

function getSessionMetadata(req: Request) {
  return { userAgent: req.header("User-Agent"), ipAddress: req.ip };
}
