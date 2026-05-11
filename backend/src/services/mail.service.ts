import nodemailer from "nodemailer";
import { env } from "../config/env.js";

export async function sendPasswordResetEmail(input: { to: string; resetUrl: string }) {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    console.log("SMTP nao configurado. Link de recuperacao de senha:", input.resetUrl);
    return { sent: false, reason: "SMTP_NOT_CONFIGURED" as const };
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: input.to,
    subject: "Redefinicao de senha - Financas Pessoais",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h2>Redefinicao de senha</h2>
        <p>Recebemos uma solicitacao para alterar sua senha.</p>
        <p><a href="${input.resetUrl}" style="background:#2563eb;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Alterar senha</a></p>
        <p>Este link expira em 1 hora. Se voce nao solicitou, ignore este e-mail.</p>
      </div>
    `
  });

  return { sent: true, reason: null };
}
