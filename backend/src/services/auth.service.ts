import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { sendPasswordResetEmail } from "./mail.service.js";
import { AppError } from "../utils/AppError.js";
import { signToken } from "../utils/jwt.js";

export async function registerUser(input: { name: string; email: string; password: string }) {
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
    select: { id: true, name: true, email: true }
  });

  return { user, token: signToken({ sub: user.id, email: user.email }) };
}

export async function loginUser(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user) {
    throw new AppError("Credenciais invalidas.", 401);
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError("Credenciais invalidas.", 401);
  }

  return {
    user: { id: user.id, name: user.name, email: user.email },
    token: signToken({ sub: user.id, email: user.email })
  };
}

function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

type PasswordResetRow = {
  id: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
};

export async function requestPasswordReset(input: { email: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user) {
    return { emailSent: true, resetUrl: null };
  }

  await prisma.$executeRaw`
    UPDATE "PasswordResetToken"
    SET "usedAt" = ${new Date()}
    WHERE "userId" = ${user.id} AND "usedAt" IS NULL
  `;

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.$executeRaw`
    INSERT INTO "PasswordResetToken" ("id", "tokenHash", "expiresAt", "userId", "createdAt")
    VALUES (${crypto.randomUUID()}, ${tokenHash}, ${expiresAt}, ${user.id}, ${new Date()})
  `;

  const resetUrl = `${env.APP_URL}/?resetToken=${token}`;
  const result = await sendPasswordResetEmail({ to: user.email, resetUrl });

  return {
    emailSent: result.sent,
    resetUrl: result.sent ? null : resetUrl
  };
}

export async function resetPassword(input: { token: string; password: string }) {
  const tokenHash = hashResetToken(input.token);
  const [resetToken] = await prisma.$queryRaw<PasswordResetRow[]>`
    SELECT "id", "userId", "expiresAt", "usedAt"
    FROM "PasswordResetToken"
    WHERE "tokenHash" = ${tokenHash}
    LIMIT 1
  `;

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    throw new AppError("Link de redefinicao invalido ou expirado.", 400);
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash }
    });

    await tx.$executeRaw`
      UPDATE "PasswordResetToken"
      SET "usedAt" = ${new Date()}
      WHERE "id" = ${resetToken.id}
    `;
  });
}
