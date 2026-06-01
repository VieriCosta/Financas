import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";

const profileSelect = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  updatedAt: true
};

export async function getUserProfile(userId: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: profileSelect
  });
}

export async function updateUserProfile(userId: string, input: { name: string; email: string; currentPassword?: string }) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  if (input.email !== user.email) {
    const passwordMatches = input.currentPassword && await bcrypt.compare(input.currentPassword, user.passwordHash);

    if (!passwordMatches) {
      throw new AppError("Informe sua senha atual para alterar o e-mail.", 401);
    }
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      email: input.email,
      id: { not: userId }
    }
  });

  if (existingUser) {
    throw new AppError("Este e-mail ja esta cadastrado.", 409);
  }

  return prisma.user.update({
    where: { id: userId },
    data: { name: input.name, email: input.email },
    select: profileSelect
  });
}

export async function updateUserPassword(userId: string, input: { currentPassword: string; newPassword: string }) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const passwordMatches = await bcrypt.compare(input.currentPassword, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError("A senha atual esta incorreta.", 401);
  }

  const passwordWasReused = await bcrypt.compare(input.newPassword, user.passwordHash);

  if (passwordWasReused) {
    throw new AppError("A nova senha deve ser diferente da senha atual.", 400);
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await bcrypt.hash(input.newPassword, 12),
      tokenVersion: { increment: 1 }
    },
    select: { email: true, tokenVersion: true }
  });
}
