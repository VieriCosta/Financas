import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { verifyToken } from "../utils/jwt.js";
import { getAuthToken } from "../utils/session.js";

declare global {
  namespace Express {
    interface Request {
      userId: string;
      authToken: string;
      sessionId: string;
    }
  }
}

export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const token = getAuthToken(req);

  if (!token) {
    throw new AppError("Token de autenticacao ausente.", 401);
  }

  let payload;

  try {
    payload = verifyToken(token);
  } catch {
    throw new AppError("Sessao invalida ou expirada.", 401);
  }

  const [user, session] = await Promise.all([prisma.user.findUnique({
    where: { id: payload.sub },
    select: { tokenVersion: true }
  }), prisma.authSession.findFirst({ where: { id: payload.sid, userId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() } } })]);

  if (!user || user.tokenVersion !== payload.ver || !session) {
    throw new AppError("Sessao invalida ou expirada.", 401);
  }

  req.userId = payload.sub;
  req.authToken = token;
  req.sessionId = session.id;
  void prisma.authSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
  next();
}
