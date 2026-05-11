import { Request, Response } from "express";
import { forgotPasswordDto, loginDto, registerDto, resetPasswordDto } from "../dtos/auth.dto.js";
import { loginUser, registerUser, requestPasswordReset, resetPassword } from "../services/auth.service.js";

export async function register(req: Request, res: Response) {
  const data = registerDto.parse(req.body);
  const result = await registerUser(data);
  return res.status(201).json(result);
}

export async function login(req: Request, res: Response) {
  const data = loginDto.parse(req.body);
  const result = await loginUser(data);
  return res.json(result);
}

export async function forgotPassword(req: Request, res: Response) {
  const data = forgotPasswordDto.parse(req.body);
  const result = await requestPasswordReset(data);
  return res.json({
    message: result.emailSent
      ? "Se o e-mail existir, enviaremos um link de redefinicao."
      : "SMTP nao configurado. Use o link de desenvolvimento para redefinir a senha.",
    resetUrl: result.resetUrl
  });
}

export async function changePassword(req: Request, res: Response) {
  const data = resetPasswordDto.parse(req.body);
  await resetPassword(data);
  return res.json({ message: "Senha alterada com sucesso." });
}
