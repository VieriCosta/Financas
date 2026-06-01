import { Request, Response } from "express";
import { updateProfileDto, updateProfilePasswordDto } from "../dtos/profile.dto.js";
import { getUserProfile, updateUserPassword, updateUserProfile } from "../services/profile.service.js";
import { signToken } from "../utils/jwt.js";
import { issueSessionCookies } from "../utils/session.js";
import { createAuthSession } from "../services/auth.service.js";
import { prisma } from "../config/prisma.js";

export async function showProfile(req: Request, res: Response) {
  return res.json(await getUserProfile(req.userId));
}

export async function changeProfile(req: Request, res: Response) {
  const data = updateProfileDto.parse(req.body);
  return res.json(await updateUserProfile(req.userId, data));
}

export async function changeProfilePassword(req: Request, res: Response) {
  const data = updateProfilePasswordDto.parse(req.body);
  const user = await updateUserPassword(req.userId, data);
  const session = await createAuthSession(req.userId, { userAgent: req.header("User-Agent"), ipAddress: req.ip });
  const token = signToken({ sub: req.userId, email: user.email, ver: user.tokenVersion, sid: session.id });
  const csrfToken = issueSessionCookies(res, token);
  return res.json({ message: "Senha alterada com sucesso.", csrfToken });
}

export async function sessions(req: Request, res: Response) {
  const items = await prisma.authSession.findMany({ where: { userId: req.userId, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: "desc" } });
  return res.json(items.map((item) => ({ ...item, current: item.id === req.sessionId })));
}

export async function revokeSession(req: Request, res: Response) {
  await prisma.authSession.updateMany({ where: { id: String(req.params.id), userId: req.userId }, data: { revokedAt: new Date() } });
  return res.status(204).send();
}

export async function revokeOtherSessions(req: Request, res: Response) {
  await prisma.authSession.updateMany({ where: { userId: req.userId, id: { not: req.sessionId }, revokedAt: null }, data: { revokedAt: new Date() } });
  return res.status(204).send();
}
