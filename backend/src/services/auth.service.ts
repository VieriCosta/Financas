import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { sendPasswordResetEmail } from "./mail.service.js";
import { AppError } from "../utils/AppError.js";
import { signToken } from "../utils/jwt.js";

type SessionMetadata = { userAgent?: string; ipAddress?: string };

export async function registerUser(input: { name: string; email: string; password: string }, metadata: SessionMetadata = {}) {
  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });

  if (existingUser) {
    throw new AppError("Este e-mail ja esta cadastrado.", 409);
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      categories: {
        create: [
          { name: "Salario", type: "INCOME", color: "#16a34a", icon: "Briefcase" },
          { name: "Freelas", type: "INCOME", color: "#0ea5e9", icon: "Laptop" },
          { name: "Alimentacao", type: "EXPENSE", color: "#f97316", icon: "Utensils" },
          { name: "Transporte", type: "EXPENSE", color: "#6366f1", icon: "Car" },
          { name: "Aluguel", type: "EXPENSE", color: "#ef4444", icon: "Home" },
          { name: "Cartao de credito", type: "EXPENSE", color: "#a855f7", icon: "CreditCard" }
        ]
      }
    },
    select: { id: true, name: true, email: true, tokenVersion: true }
  });

  const session = await createAuthSession(user.id, metadata);
  return {
    user: { id: user.id, name: user.name, email: user.email },
    token: signToken({ sub: user.id, email: user.email, ver: user.tokenVersion, sid: session.id })
  };
}

export async function loginUser(input: { email: string; password: string }, metadata: SessionMetadata = {}) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user) {
    throw new AppError("Credenciais invalidas.", 401);
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError("Credenciais invalidas.", 401);
  }

  const session = await createAuthSession(user.id, metadata);
  return {
    user: { id: user.id, name: user.name, email: user.email },
    token: signToken({ sub: user.id, email: user.email, ver: user.tokenVersion, sid: session.id })
  };
}

export function createAuthSession(userId: string, metadata: SessionMetadata = {}) {
  return prisma.authSession.create({
    data: {
      userId,
      userAgent: metadata.userAgent?.slice(0, 255),
      ipAddress: metadata.ipAddress?.slice(0, 80),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });
}

function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function requestPasswordReset(input: { email: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user) {
    return { emailSent: true, resetUrl: null };
  }

  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() }
  });

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { tokenHash, expiresAt, userId: user.id }
  });

  const resetUrl = `${env.APP_URL}/?resetToken=${token}`;
  const result = await sendPasswordResetEmail({ to: user.email, resetUrl });

  return {
    emailSent: result.sent,
    resetUrl: !result.sent && env.ENABLE_DEV_PASSWORD_RESET_LINKS && !env.IS_PRODUCTION ? resetUrl : null
  };
}

export async function resetPassword(input: { token: string; password: string }) {
  const tokenHash = hashResetToken(input.token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash }
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    throw new AppError("Link de redefinicao invalido ou expirado.", 400);
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 }
      }
    });

    await tx.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() }
    });
  });
}
